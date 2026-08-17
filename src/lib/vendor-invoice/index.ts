import type { db } from "@/db/index";
import {
  chargeLines,
  jobs,
  vendorInvoiceLines,
  vendorInvoices,
  vendors,
} from "@/db/schema/index";
import { writeAudit } from "@/lib/audit/index";
import { AuthorizationError, assertCan, assertNotSelfApproval } from "@/lib/authz/index";
import { jarakLevenshtein } from "@/lib/similarity/index";
import { and, eq, ne, sql } from "drizzle-orm";
import {
  IZIN_PER_AKSI_VENDOR_INVOICE,
  type VendorInvoiceStatus,
  canTransitionVendorInvoice,
  mengunciActual,
} from "./state";

/*
 * Service invoice vendor (AP) — Irisan 7. SATU pintu semua mutasi invoice
 * vendor. Membangun di atas tabel vendor_invoices + vendor_invoice_lines yang
 * sudah ter-migrate sejak 0000; Irisan 7 menambah kolom jejak + UNIQUE
 * junction (D5).
 *
 * Keputusan user 17 Agu 2026 (D1–D9) yang ditegakkan di sini:
 *   - receive (D2): O/M/S (vendor_invoice:create). Nomor = teks persis dari
 *     kertas vendor. PERINGATAN nomor mirip pada vendor sama (V-INV-2:
 *     peringatan, BUKAN blokir) dikembalikan di hasil — uq_vendor_invoice
 *     tetap backstop DB untuk nomor identik (R7.1 kasus 01A/01B).
 *   - verify (D3): O/M (vendor_invoice:verify — STAFF ✗) DAN verifier ≠
 *     penerima (R-A1, assertNotSelfApproval). Menolak job DIBATALKAN (D4);
 *     job FINAL DIIZINKAN — actual_idr memang field realisasi yang diisi
 *     belakangan; J-INV-1 tetap menjaga field lain. SATU charge line hanya
 *     satu vendor invoice (D5 — UNIQUE junction, dibackstop DB). HANYA
 *     menulis actual_idr (D6); actual_usd tidak disentuh vendor invoice.
 *   - pay (V-INV-3/R7.2): status wajib terlihat SEBELUM konfirmasi — service
 *     mengembalikan snapshot status + menolak bila sudah DIBAYAR. Tolak
 *     pembayaran kedua.
 *   - batal (R-A5): OWNER saja + alasan wajib (ditolak/dispute/revisi — D1).
 *     Sebelum bayar: hapus junction + reset actual_idr NULL (baris bebas
 *     diverifikasi ulang — alur revisi Bu Niken). Setelah bayar: junction &
 *     actual TETAP (uang riil sudah keluar; jejak tidak difalsifikasi).
 *   - unlock_paid (R-A5): OWNER saja + alasan; DIBAYAR → DIVERIFIKASI.
 *     Actual tidak di-unlock — V-INV-4 tetap berlaku; hanya status
 *     pembayaran yang dibuka ulang (mis. salah tandai lunas).
 *
 * Guard race: semua UPDATE memakai WHERE status = status_lama — dua aksi
 * bersamaan hanya satu yang lolos (pola transisi.ts / invoice Irisan 6).
 * Semua dalam SATU transaksi: mutasi + audit atomik (1 baris audit per aksi).
 */

type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer T) => unknown
  ? T
  : never;
export type DbOrTx = typeof db | Tx;

export interface PelaksanaVendorInvoice {
  id: string;
  role: "OWNER" | "MANAGER" | "STAFF";
}

export type HasilVendorInvoice<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function gagal(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function teks(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

/*
 * Aksi audit per transisi ditulis EKSPLISIT di tiap service (VERIFY/PAY/
 * BATAL_VENDOR/UNLOCK_GRANTED) mengikuti pola invoice Irisan 6 — tanpa map
 * bersama, supaya tiap transisi terbaca sendiri di tempatnya.
 */

/** Status pembayaran terkini + ringkasannya — WAJIB ditampilkan sebelum konfirmasi bayar (V-INV-3). */
export interface StatusPembayaranVendor {
  vendorInvoiceId: string;
  vendorInvoiceNo: string;
  status: VendorInvoiceStatus;
  jumlahIdr: bigint;
  /** Sudah dibayar? (null bila belum — kolom dibayar_at kosong). */
  dibayarAt: Date | null;
}

interface KonteksVendorInvoice {
  id: string;
  vendorId: string;
  vendorInvoiceNo: string;
  status: VendorInvoiceStatus;
  jumlahIdr: bigint;
  pph23Idr: bigint;
  diterimaOleh: string | null;
  dibayarAt: Date | null;
}

/** Ambil invoice vendor + row lock; null bila tidak ada. */
async function ambilVendorInvoice(
  tx: Tx,
  id: string,
): Promise<KonteksVendorInvoice | null> {
  const [row] = await tx
    .select({
      id: vendorInvoices.id,
      vendorId: vendorInvoices.vendorId,
      vendorInvoiceNo: vendorInvoices.vendorInvoiceNo,
      status: vendorInvoices.status,
      jumlahIdr: vendorInvoices.jumlahIdr,
      pph23Idr: vendorInvoices.pph23Idr,
      diterimaOleh: vendorInvoices.diterimaOleh,
      dibayarAt: vendorInvoices.dibayarAt,
    })
    .from(vendorInvoices)
    .where(eq(vendorInvoices.id, id))
    .for("update");
  if (!row) return null;
  return {
    id: row.id,
    vendorId: row.vendorId,
    vendorInvoiceNo: row.vendorInvoiceNo,
    status: row.status as VendorInvoiceStatus,
    jumlahIdr: row.jumlahIdr,
    pph23Idr: row.pph23Idr,
    diterimaOleh: row.diterimaOleh,
    dibayarAt: row.dibayarAt,
  };
}

// ---------------------------------------------------------------------------
// RECEIVE (D2) — INSERT baru berstatus DITERIMA; peringatan nomor mirip (V-INV-2)
// ---------------------------------------------------------------------------

export interface TerimaInvoiceVendorInput {
  vendorId: string;
  /** Nomor PERSIS seperti di kertas vendor — termasuk akhiran 01A/01B. */
  vendorInvoiceNo: string;
  /** Tanggal di kertas vendor (YYYY-MM-DD). */
  tanggalInvoice: string;
  jumlahIdr: bigint;
  /**
   * R3.7/Q14 (⚠️ DUGAAN): potongan PPh 23 atas pembayaran vendor. TIDAK
   * PERNAH dihitung otomatis — input manual eksplisit; default 0.
   */
  pph23Idr?: bigint;
}

export interface HasilTerima {
  id: string;
  /** V-INV-2: nomor SANGAT MIRIP pada vendor sama yang sudah ada (peringatan, bukan blokir). */
  peringatanNomorMirip: string[];
}

/**
 * Terima invoice vendor (aksi `receive` STATE-MACHINE.md §3).
 *
 * - uq_vendor_invoice (DB) menolak nomor IDENTIK pada vendor sama — itulah
 *   pagar anti dobel-bayar 01A/01B (R7.1). Pesan diterjemahkan ke bahasa yang
 *   bisa ditindaklanjuti user.
 * - V-INV-2: sebelum INSERT, cari nomor mirip (jarak Levenshtein <= 2) pada
 *   vendor sama — HASILNYA PERINGATAN saja; input tetap diterima. 01A dan
 *   01B keduanya sah karena memang dua nomor berbeda.
 */
export async function terimaInvoiceVendor(
  dbOrTx: DbOrTx,
  user: PelaksanaVendorInvoice,
  input: TerimaInvoiceVendorInput,
): Promise<HasilVendorInvoice<HasilTerima>> {
  try {
    assertCan(user.role, "vendor_invoice:create");
  } catch (e) {
    if (e instanceof AuthorizationError) return gagal(e.message);
    throw e;
  }

  const vendorId = teks(input.vendorId);
  const noInvoice = teks(input.vendorInvoiceNo);
  if (!vendorId) return gagal("Vendor wajib dipilih.");
  if (!noInvoice) return gagal("Nomor invoice vendor wajib diisi.");
  if (input.jumlahIdr === undefined || input.jumlahIdr === null) {
    return gagal("Nominal invoice wajib diisi.");
  }
  const tanggal = teks(input.tanggalInvoice);
  if (!tanggal) return gagal("Tanggal invoice wajib diisi.");
  const dTanggal = new Date(`${tanggal}T00:00:00Z`);
  if (Number.isNaN(dTanggal.getTime())) {
    return gagal("Tanggal invoice tidak valid (YYYY-MM-DD).");
  }

  return dbOrTx.transaction(async (tx) => {
    // Vendor harus ada & aktif.
    const [vendor] = await tx
      .select({ id: vendors.id, aktif: vendors.aktif, nama: vendors.nama })
      .from(vendors)
      .where(eq(vendors.id, vendorId));
    if (!vendor) return gagal("Vendor tidak ditemukan.");
    if (!vendor.aktif) return gagal(`Vendor ${vendor.nama} sudah nonaktif.`);

    // V-INV-2: nomor mirip pada vendor sama → PERINGATAN (bukan blokir).
    const semuaNo = await tx
      .select({ no: vendorInvoices.vendorInvoiceNo })
      .from(vendorInvoices)
      .where(eq(vendorInvoices.vendorId, vendorId));
    const peringatanNomorMirip = semuaNo
      .filter((r) => r.no !== noInvoice && jarakLevenshtein(r.no, noInvoice) <= 2)
      .map((r) => r.no);

    /*
     * ANTI DOBEL BAYAR (R7.1): ON CONFLICT DO NOTHING + RETURNING — kalau
     * (vendor_id, vendor_invoice_no) sudah ada, tidak ada baris kembali dan
     * transaksi TIDAK abort, jadi pesan error yang bersih bisa dikembalikan.
     * Ini pola allocator Irisan 2; uq_vendor_invoice tetap backstop DB untuk
     * sisipan langsung dari jalur lain (import/admin SQL).
     */
    const [baris] = await tx
      .insert(vendorInvoices)
      .values({
        vendorId,
        vendorInvoiceNo: noInvoice,
        tanggalInvoice: tanggal,
        jumlahIdr: input.jumlahIdr,
        pph23Idr: input.pph23Idr ?? 0n,
        status: "DITERIMA",
        diterimaOleh: user.id,
      })
      .onConflictDoNothing({
        target: [vendorInvoices.vendorId, vendorInvoices.vendorInvoiceNo],
      })
      .returning({ id: vendorInvoices.id });
    if (!baris) {
      return gagal(
        `Nomor invoice "${noInvoice}" sudah pernah dipakai untuk vendor ini. Periksa kembali kertas vendor — jangan sampai dobel bayar (kasus 01A/01B, R7.1).`,
      );
    }
    const barisId = baris.id;

    await writeAudit(tx, {
      userId: user.id,
      aksi: "RECEIVE",
      entitas: "VENDOR_INVOICE",
      entitasId: barisId,
      sesudah: {
        vendorId,
        vendorInvoiceNo: noInvoice,
        jumlahIdr: input.jumlahIdr,
        status: "DITERIMA",
      },
      alasan: `Terima invoice vendor ${noInvoice}${peringatanNomorMirip.length > 0 ? ` — peringatan nomor mirip: ${peringatanNomorMirip.join(", ")}` : ""}.`,
    });
    return { ok: true, data: { id: barisId, peringatanNomorMirip } };
  });
}

// ---------------------------------------------------------------------------
// VERIFY (D3/D4/D5/D6) — isi actual_idr charge line via junction 1:1
// ---------------------------------------------------------------------------

export interface VerifikasiInput {
  vendorInvoiceId: string;
  /** Baris biaya yang dicocokkan + nilai realisasi menurut invoice vendor ini. */
  baris: { chargeLineId: string; jumlahIdr: bigint }[];
}

/**
 * Verifikasi (DITERIMA → DIVERIFIKASI). Dicocokkan ke charge line job
 * (STATE-MACHINE §3 verify), mengisi charge_lines.actual_idr (V-INV-5),
 * selisih dihitung OTOMATIS oleh kolom generated selisih_idr.
 *
 * Guard:
 * - verifier ≠ penerima (R-A1 — assertNotSelfApproval; baris lama tanpa
 *   diterima_oleh ditolak: data jejak tidak lengkap, tidak boleh diverifikasi).
 * - job DIBATALKAN ditolak (D4). Job FINAL DIIZINKAN — actual_idr adalah field
 *   realisasi yang DISENGAJA diisi setelah job final; J-INV-1 menjaga field lain.
 * - charge line tidak boleh sudah diverifikasi invoice vendor lain (D5 —
 *   uq_vendor_inv_line_charge_line di DB mem-backstop race).
 * - baris soft-deleted / tidak ditemukan ditolak.
 * - nilai verifikasi TIDAK boleh 0 atau negatif.
 * - hanya menulis actual_idr (D6) — actual_usd tidak disentuh.
 */
export async function verifikasiInvoiceVendor(
  dbOrTx: DbOrTx,
  user: PelaksanaVendorInvoice,
  input: VerifikasiInput,
): Promise<HasilVendorInvoice<{ status: VendorInvoiceStatus }>> {
  const izin = IZIN_PER_AKSI_VENDOR_INVOICE.verify as Parameters<typeof assertCan>[1];
  try {
    assertCan(user.role, izin);
  } catch (e) {
    if (e instanceof AuthorizationError) return gagal(e.message);
    throw e;
  }

  const id = teks(input.vendorInvoiceId);
  if (!id) return gagal("Invoice vendor wajib dipilih.");
  if (!Array.isArray(input.baris) || input.baris.length === 0) {
    return gagal("Verifikasi wajib mencocokkan minimal satu baris biaya.");
  }
  for (const b of input.baris) {
    if (!teks(b.chargeLineId)) return gagal("Baris biaya wajib dipilih.");
    if (b.jumlahIdr === undefined || b.jumlahIdr === null || b.jumlahIdr <= 0n) {
      return gagal("Nilai verifikasi tiap baris harus lebih besar dari nol.");
    }
  }

  return dbOrTx.transaction(async (tx) => {
    const inv = await ambilVendorInvoice(tx, id);
    if (!inv) return gagal("Invoice vendor tidak ditemukan.");

    // Transisi sah? (tabel murni — tidak ada jalan lain.)
    const ke = canTransitionVendorInvoice(inv.status, "verify");
    if (ke === null) {
      return gagal(
        `Transisi tidak sah: invoice vendor berstatus ${inv.status} tidak bisa diverifikasi. Lihat docs/STATE-MACHINE.md §3.`,
      );
    }

    // R-A1 (D3): verifier ≠ penerima. Baris tanpa jejak penerima ditolak.
    if (!inv.diterimaOleh) {
      return gagal(
        "Invoice ini tidak mencatat siapa penerimanya — data jejak tidak lengkap, tidak boleh diverifikasi.",
      );
    }
    try {
      assertNotSelfApproval(user.id, inv.diterimaOleh);
    } catch (e) {
      return gagal((e as Error).message);
    }

    // Proses tiap baris: validasi + INSERT junction + UPDATE actual_idr.
    const sesudahBaris: Array<{ chargeLineId: string; actualIdr: bigint }> = [];
    for (const b of input.baris) {
      const [line] = await tx
        .select({
          id: chargeLines.id,
          jobId: chargeLines.jobId,
          deletedAt: chargeLines.deletedAt,
          vendorId: chargeLines.vendorId,
          statusJob: jobs.status,
          jobDeletedAt: jobs.deletedAt,
        })
        .from(chargeLines)
        .innerJoin(jobs, eq(chargeLines.jobId, jobs.id))
        .where(eq(chargeLines.id, b.chargeLineId))
        .for("update", { of: chargeLines });
      if (!line) return gagal(`Baris biaya ${b.chargeLineId} tidak ditemukan.`);
      if (line.deletedAt) {
        return gagal(
          "Baris biaya sudah dihapus (soft delete) — tidak bisa diverifikasi.",
        );
      }
      if (line.jobDeletedAt) return gagal("Job baris biaya ini sudah dihapus.");

      // D4: hanya DIBATALKAN yang ditolak. FINAL/DRAFT/DIAJUKAN/DISETUJUI_1
      // diizinkan — vendor invoice lazim datang SETELAH job final.
      const statusJob = line.statusJob as string;
      if (statusJob === "DIBATALKAN") {
        return gagal(
          "Job baris biaya ini berstatus DIBATALKAN — tidak ada realisasi yang perlu dicatat.",
        );
      }

      // Konsistensi vendor: baris biaya punya vendor — wajib sama dengan
      // vendor invoice (mencegah verifikasi menunjuk baris vendor yang salah).
      if (line.vendorId && line.vendorId !== inv.vendorId) {
        return gagal(
          `Baris biaya milik vendor lain — invoice ini dari vendor ${inv.vendorId}, baris milik ${line.vendorId}.`,
        );
      }

      // D5: baris sudah diverifikasi invoice lain? (UNIQUE DB backstop race.)
      const [ada] = await tx
        .select({ n: sql<number>`COUNT(*)::int` })
        .from(vendorInvoiceLines)
        .where(eq(vendorInvoiceLines.chargeLineId, b.chargeLineId));
      if ((ada?.n ?? 0) > 0) {
        return gagal(
          "Baris biaya ini sudah diverifikasi oleh invoice vendor lain (D5: satu baris = satu invoice). Batalkan verifikasi lama dulu bila salah.",
        );
      }

      try {
        await tx.insert(vendorInvoiceLines).values({
          vendorInvoiceId: id,
          chargeLineId: b.chargeLineId,
          jumlahIdr: b.jumlahIdr,
        });
      } catch (e) {
        const msg = String((e as Error)?.message ?? e);
        if (msg.includes("uq_vendor_inv_line_charge_line")) {
          return gagal(
            "Baris biaya ini baru saja diverifikasi invoice lain di tengah proses — muat ulang lalu coba lagi (D5).",
          );
        }
        throw e;
      }

      // D6: HANYA actual_idr. actual_usd tidak disentuh vendor invoice (IDR
      // sumber kebenaran tunggal GP & pajak; selisih_idr terhitung generated).
      const [updated] = await tx
        .update(chargeLines)
        .set({ actualIdr: b.jumlahIdr, updatedAt: new Date() })
        .where(eq(chargeLines.id, b.chargeLineId))
        .returning({ actualIdr: chargeLines.actualIdr });
      sesudahBaris.push({
        chargeLineId: b.chargeLineId,
        actualIdr: updated?.actualIdr ?? b.jumlahIdr,
      });
    }

    const [sesudah] = await tx
      .update(vendorInvoices)
      .set({
        status: ke,
        diverifikasiOleh: user.id,
        diverifikasiAt: new Date(),
      })
      .where(and(eq(vendorInvoices.id, id), eq(vendorInvoices.status, inv.status)))
      .returning();
    if (!sesudah) {
      return gagal(
        "Status invoice vendor berubah di tengah proses — muat ulang lalu coba lagi.",
      );
    }

    await writeAudit(tx, {
      userId: user.id,
      aksi: "VERIFY",
      entitas: "VENDOR_INVOICE",
      entitasId: id,
      sebelum: inv,
      sesudah: { ...sesudah, baris: sesudahBaris },
      alasan: `Verifikasi ${inv.vendorInvoiceNo}: ${input.baris.length} baris biaya dicocokkan, actual_idr terisi (V-INV-5).`,
    });
    return { ok: true, data: { status: ke } };
  });
}

// ---------------------------------------------------------------------------
// PAY (V-INV-3 / R7.2) — status wajib terlihat dulu; tolak bayar kedua
// ---------------------------------------------------------------------------

/** Snapshot status pembayaran (V-INV-3) — panggil SEBELUM konfirmasi bayar. */
export async function lihatStatusPembayaran(
  dbOrTx: DbOrTx,
  vendorInvoiceId: string,
): Promise<StatusPembayaranVendor | null> {
  const [row] = await dbOrTx
    .select({
      vendorInvoiceId: vendorInvoices.id,
      vendorInvoiceNo: vendorInvoices.vendorInvoiceNo,
      status: vendorInvoices.status,
      jumlahIdr: vendorInvoices.jumlahIdr,
      dibayarAt: vendorInvoices.dibayarAt,
    })
    .from(vendorInvoices)
    .where(eq(vendorInvoices.id, vendorInvoiceId));
  if (!row) return null;
  return {
    vendorInvoiceId: row.vendorInvoiceId,
    vendorInvoiceNo: row.vendorInvoiceNo,
    status: row.status as VendorInvoiceStatus,
    jumlahIdr: row.jumlahIdr,
    dibayarAt: row.dibayarAt,
  };
}

/**
 * Tandai dibayar (DIVERIFIKASI → DIBAYAR). Manual — tidak ada integrasi
 * pembayaran (D8/scope). R7.2: pembayaran kedua DITOLAK; V-INV-4: setelah
 * DIBAYAR, actual_idr charge line terkait terkunci (dijaga bersama guard
 * updateChargeLine Irisan 7 + status mengunciActual).
 */
export async function bayarInvoiceVendor(
  dbOrTx: DbOrTx,
  user: PelaksanaVendorInvoice,
  vendorInvoiceId: string,
): Promise<HasilVendorInvoice<{ status: VendorInvoiceStatus }>> {
  const izin = IZIN_PER_AKSI_VENDOR_INVOICE.pay as Parameters<typeof assertCan>[1];
  try {
    assertCan(user.role, izin);
  } catch (e) {
    if (e instanceof AuthorizationError) return gagal(e.message);
    throw e;
  }
  const id = teks(vendorInvoiceId);
  if (!id) return gagal("Invoice vendor wajib dipilih.");

  return dbOrTx.transaction(async (tx) => {
    const inv = await ambilVendorInvoice(tx, id);
    if (!inv) return gagal("Invoice vendor tidak ditemukan.");

    const ke = canTransitionVendorInvoice(inv.status, "pay");
    if (ke === null) {
      return gagal(
        inv.status === "DIBAYAR"
          ? "Invoice vendor ini SUDAH DIBAYAR — pembayaran kedua ditolak (R7.2). Periksa status bayar sebelum membayar."
          : `Transisi tidak sah: invoice vendor berstatus ${inv.status} belum diverifikasi. Lihat docs/STATE-MACHINE.md §3.`,
      );
    }

    const [sesudah] = await tx
      .update(vendorInvoices)
      .set({ status: ke, dibayarAt: new Date(), dibayarOleh: user.id })
      .where(and(eq(vendorInvoices.id, id), eq(vendorInvoices.status, inv.status)))
      .returning();
    if (!sesudah) {
      return gagal(
        "Status invoice vendor berubah di tengah proses — muat ulang lalu coba lagi.",
      );
    }

    await writeAudit(tx, {
      userId: user.id,
      aksi: "PAY",
      entitas: "VENDOR_INVOICE",
      entitasId: id,
      sebelum: inv,
      sesudah,
      alasan: `Bayar invoice vendor ${inv.vendorInvoiceNo} — charge line terkait terkunci (V-INV-4).`,
    });
    return { ok: true, data: { status: ke } };
  });
}

// ---------------------------------------------------------------------------
// BATAL (R-A5/D1) + UNLOCK_PAID (R-A5)
// ---------------------------------------------------------------------------

/**
 * Batalkan invoice vendor (→ DIBATALKAN, terminal). OWNER saja + alasan
 * wajib — tuliskan kasusnya (ditolak / dispute / minta revisi, D1).
 *
 * Sebelum bayar: junction dihapus & actual_idr di-reset NULL — baris bebas
 * diverifikasi ulang oleh invoice revisi vendor (alur Bu Niken, §3
 * receive_revision dengan nomor baru). Setelah bayar: junction & actual
 * TETAP — uang riil sudah keluar; jejak tidak difalsifikasi (V-INV-4).
 */
export async function batalkanInvoiceVendor(
  dbOrTx: DbOrTx,
  user: PelaksanaVendorInvoice,
  vendorInvoiceId: string,
  alasan: string,
): Promise<HasilVendorInvoice<{ status: VendorInvoiceStatus }>> {
  const izin = IZIN_PER_AKSI_VENDOR_INVOICE.batal as Parameters<typeof assertCan>[1];
  try {
    assertCan(user.role, izin);
  } catch (e) {
    if (e instanceof AuthorizationError) return gagal(e.message);
    throw e;
  }
  const id = teks(vendorInvoiceId);
  if (!id) return gagal("Invoice vendor wajib dipilih.");
  const alasanBersih = teks(alasan);
  if (!alasanBersih) {
    return gagal(
      "Alasan pembatalan wajib diisi — tulis kasusnya (ditolak/dispute/revisi).",
    );
  }

  return dbOrTx.transaction(async (tx) => {
    const inv = await ambilVendorInvoice(tx, id);
    if (!inv) return gagal("Invoice vendor tidak ditemukan.");

    const ke = canTransitionVendorInvoice(inv.status, "batal");
    if (ke === null) {
      return gagal(
        `Invoice vendor ini sudah berstatus ${inv.status} — tidak bisa dibatalkan lagi.`,
      );
    }

    // Reset actual_idr + hapus junction HANYA bila belum dibayar.
    let barisDireset = 0;
    if (inv.status !== "DIBAYAR") {
      const junctions = await tx
        .select({ chargeLineId: vendorInvoiceLines.chargeLineId })
        .from(vendorInvoiceLines)
        .where(eq(vendorInvoiceLines.vendorInvoiceId, id));
      for (const j of junctions) {
        await tx
          .update(chargeLines)
          .set({ actualIdr: null, updatedAt: new Date() })
          .where(eq(chargeLines.id, j.chargeLineId));
        barisDireset += 1;
      }
      await tx
        .delete(vendorInvoiceLines)
        .where(eq(vendorInvoiceLines.vendorInvoiceId, id));
    }

    const [sesudah] = await tx
      .update(vendorInvoices)
      .set({ status: ke })
      .where(and(eq(vendorInvoices.id, id), eq(vendorInvoices.status, inv.status)))
      .returning();
    if (!sesudah) {
      return gagal(
        "Status invoice vendor berubah di tengah proses — muat ulang lalu coba lagi.",
      );
    }

    await writeAudit(tx, {
      userId: user.id,
      aksi: "BATAL_VENDOR",
      entitas: "VENDOR_INVOICE",
      entitasId: id,
      sebelum: inv,
      sesudah: { ...sesudah, barisDireset },
      alasan: alasanBersih,
    });
    return { ok: true, data: { status: ke } };
  });
}

/**
 * Buka kunci DIBAYAR (→ DIVERIFIKASI) — OWNER saja + alasan (R-A5). Untuk
 * kasus salah tandai lunas: status pembayaran kembali DIVERIFIKASI sehingga
 * bisa dibayar ulang. Actual_idr TIDAK di-reset — V-INV-4 tetap menjaga;
 * koreksi nilai realisasi harus lewat batal (sebelum bayar) atau addendum
 * vendor R17 (irisan terpisah).
 */
export async function bukaKunciDibayar(
  dbOrTx: DbOrTx,
  user: PelaksanaVendorInvoice,
  vendorInvoiceId: string,
  alasan: string,
): Promise<HasilVendorInvoice<{ status: VendorInvoiceStatus }>> {
  const izin = IZIN_PER_AKSI_VENDOR_INVOICE.unlock_paid as Parameters<
    typeof assertCan
  >[1];
  try {
    assertCan(user.role, izin);
  } catch (e) {
    if (e instanceof AuthorizationError) return gagal(e.message);
    throw e;
  }
  const id = teks(vendorInvoiceId);
  if (!id) return gagal("Invoice vendor wajib dipilih.");
  const alasanBersih = teks(alasan);
  if (!alasanBersih) return gagal("Alasan pembukaan kunci wajib diisi (R-A5).");

  return dbOrTx.transaction(async (tx) => {
    const inv = await ambilVendorInvoice(tx, id);
    if (!inv) return gagal("Invoice vendor tidak ditemukan.");

    const ke = canTransitionVendorInvoice(inv.status, "unlock_paid");
    if (ke === null) {
      return gagal(
        `Transisi tidak sah: invoice vendor berstatus ${inv.status} bukan DIBAYAR — tidak ada kunci yang bisa dibuka.`,
      );
    }

    const [sesudah] = await tx
      .update(vendorInvoices)
      .set({ status: ke, dibayarAt: null, dibayarOleh: null })
      .where(and(eq(vendorInvoices.id, id), eq(vendorInvoices.status, inv.status)))
      .returning();
    if (!sesudah) {
      return gagal(
        "Status invoice vendor berubah di tengah proses — muat ulang lalu coba lagi.",
      );
    }

    await writeAudit(tx, {
      userId: user.id,
      aksi: "UNLOCK_GRANTED",
      entitas: "VENDOR_INVOICE",
      entitasId: id,
      sebelum: inv,
      sesudah,
      alasan: alasanBersih,
    });
    return { ok: true, data: { status: ke } };
  });
}

// ---------------------------------------------------------------------------
// Query bantu (untuk guard D7 di charge-line & tampilan)
// ---------------------------------------------------------------------------

/**
 * Apakah charge line ini terverifikasi oleh invoice vendor yang masih
 * AKTIF (DIVERIFIKASI/DIBAYAR)? Guard D7: bila true, updateChargeLine
 * menolak perubahan actual_idr/actual_usd — verifikasi adalah satu-satunya
 * pintu. Junction baris DIBATALKAN sudah dihapus service batal, tapi cek
 * status tetap dilakukan di sini supaya tahan data lama tidak konsisten.
 */
export async function chargeLineTerverifikasi(
  dbOrTx: DbOrTx,
  chargeLineId: string,
): Promise<boolean> {
  const rows = await dbOrTx
    .select({ status: vendorInvoices.status })
    .from(vendorInvoiceLines)
    .innerJoin(vendorInvoices, eq(vendorInvoiceLines.vendorInvoiceId, vendorInvoices.id))
    .where(eq(vendorInvoiceLines.chargeLineId, chargeLineId));
  return rows.some((r) => mengunciActual(r.status as VendorInvoiceStatus));
}

/** Status charge line untuk tampilan (STATE-MACHINE.md §4): PENCADANGAN/ACTUAL/LOCKED. */
export async function statusChargeLine(
  dbOrTx: DbOrTx,
  chargeLineId: string,
): Promise<"PENCADANGAN" | "ACTUAL" | "LOCKED"> {
  const [line] = await dbOrTx
    .select({ actualIdr: chargeLines.actualIdr, deletedAt: chargeLines.deletedAt })
    .from(chargeLines)
    .where(eq(chargeLines.id, chargeLineId));
  if (!line || line.actualIdr === null) return "PENCADANGAN";
  const rows = await dbOrTx
    .select({ status: vendorInvoices.status })
    .from(vendorInvoiceLines)
    .innerJoin(vendorInvoices, eq(vendorInvoiceLines.vendorInvoiceId, vendorInvoices.id))
    .where(eq(vendorInvoiceLines.chargeLineId, chargeLineId));
  return rows.some((r) => r.status === "DIBAYAR") ? "LOCKED" : "ACTUAL";
}

/** Daftar invoice vendor satu vendor (untuk pengecekan nomor & tampilan). */
export async function daftarInvoiceVendor(dbOrTx: DbOrTx, vendorId: string) {
  return dbOrTx
    .select()
    .from(vendorInvoices)
    .where(
      and(eq(vendorInvoices.vendorId, vendorId), ne(vendorInvoices.status, "DIBATALKAN")),
    );
}

/** Junction aktif satu charge line (dipakai guard hapus + tampilan). */
export async function junctionChargeLine(dbOrTx: DbOrTx, chargeLineId: string) {
  return dbOrTx
    .select({
      vendorInvoiceId: vendorInvoiceLines.vendorInvoiceId,
      jumlahIdr: vendorInvoiceLines.jumlahIdr,
      status: vendorInvoices.status,
    })
    .from(vendorInvoiceLines)
    .innerJoin(vendorInvoices, eq(vendorInvoiceLines.vendorInvoiceId, vendorInvoices.id))
    .where(
      and(
        eq(vendorInvoiceLines.chargeLineId, chargeLineId),
        ne(vendorInvoices.status, "DIBATALKAN"),
      ),
    );
}
