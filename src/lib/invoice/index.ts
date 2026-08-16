import type { db } from "@/db/index";
import {
  chargeLines,
  customerInvoiceAddenda,
  customerInvoices,
  invoiceLines,
  jobs,
  paymentsIn,
} from "@/db/schema/index";
import { type AksiAudit, writeAudit } from "@/lib/audit/index";
import { AuthorizationError, assertCan, assertNotSelfApproval } from "@/lib/authz/index";
import {
  type InvoiceType,
  type SeqScope,
  allocateInvoiceNumber,
  formatInvoiceNumber,
  invoiceTypeForScope,
  paymentTermDays,
} from "@/lib/job-number/index";
import { type Rupiah, rupiah, subtract, sum } from "@/lib/money/index";
import { isFinal } from "@/lib/state-machine/index";
import { CURRENT_TAX_RULE_VERSION } from "@/lib/tax/index";
import { terbilang } from "@/lib/terbilang/index";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import {
  type HasilPajak,
  hitungPajakAddendum,
  hitungPajakInvoiceDariBaris,
} from "./aggregate";
import {
  type AksiInvoice,
  IZIN_PER_AKSI_INVOICE,
  type InvoiceStatus,
  canTransitionInvoice,
} from "./state";

/*
 * Service invoice customer — Irisan 6. SATU pintu semua mutasi invoice.
 *
 * Keputusan user 17 Agu 2026 yang ditegakkan di sini:
 *   - createDraft: job WAJIB FINAL (R9.4) DAN belum punya invoice aktif
 *     (terbit ke atas) DAN POD diterima — atau jalur khusus R9.4b
 *     (issuedBeforePod + izin OWNER ≠ pembuat, Q78 default defensif).
 *   - DRAFT: boleh edit field pra-terbit + hard delete TANPA audit (belum ada
 *     nomor, belum ada peristiwa uang). Tidak ada soft delete untuk invoice.
 *   - issue: alokasi nomor (allocateInvoiceNumber, R2) + hitung pajak dari
 *     charge lines aktif (aggregate) + beku angka (I-INV-1) + terbilang
 *     (ADR-0005) + snapshot invoice_lines + audit ISSUE. Semua SATU transaksi.
 *   - dueDate MANUAL wajib (R9.2/Q07) — service tidak pernah menghitungnya.
 *     topDays hanya disimpan sebagai info audit (30 DOM / 14 EXP dari R9.1).
 *   - send/pay/void: guard status-lama (WHERE status=dari) — race dua klik
 *     bersamaan hanya satu lolos (pola transisi.ts).
 *   - pph23Applicable SELALU eksplisit param issue (R3.5) — tidak pernah
 *     dibaca dari customers.pph23_default.
 *   - Addendum R16: buat (DRAFT) → setujui (Manager/Owner ≠ pembuat, Q70) →
 *     terbitkan (ISSUED). Pajak selisih dihitung ULANG saat terbitkan —
 *     versi aturan yang dipakai versi SAAT ADDENDUM terbit (R16.3), bukan
 *     versi create. Invoice asal tidak disentuh (I-INV-1).
 */

type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer T) => unknown
  ? T
  : never;
export type DbOrTx = typeof db | Tx;

export interface PelaksanaInvoice {
  id: string;
  role: "OWNER" | "MANAGER" | "STAFF";
}

export type HasilInvoice<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function gagal(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function teks(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

/** Nama aksi audit per transisi invoice (pola AKSI_AUDIT_PER_TRANSISI). */
const AKSI_AUDIT_PER_AKSI: Record<AksiInvoice, AksiAudit> = {
  issue: "ISSUE",
  send: "SEND",
  void: "VOID",
  pay_partial: "PAY_PARTIAL",
  pay_full: "PAY_FULL",
};

interface KonteksInvoice {
  id: string;
  status: InvoiceStatus;
  jobId: string;
  grandTotalIdr: bigint;
  /** R9.4: tanggal POD diterima — dicatat Finance di draft, disyaratkan saat create. */
  podDiterimaAt: Date | null;
  issuedBeforePod: boolean;
}

/** Ambil invoice + row lock; null bila tidak ada. */
async function ambilInvoice(tx: Tx, id: string): Promise<KonteksInvoice | null> {
  const [row] = await tx
    .select({
      id: customerInvoices.id,
      status: customerInvoices.status,
      jobId: customerInvoices.jobId,
      grandTotalIdr: customerInvoices.grandTotalIdr,
      podDiterimaAt: customerInvoices.podDiterimaAt,
      issuedBeforePod: customerInvoices.issuedBeforePod,
    })
    .from(customerInvoices)
    .where(eq(customerInvoices.id, id))
    .for("update");
  if (!row) return null;
  return {
    id: row.id,
    status: row.status as InvoiceStatus,
    jobId: row.jobId,
    grandTotalIdr: row.grandTotalIdr,
    podDiterimaAt: row.podDiterimaAt,
    issuedBeforePod: row.issuedBeforePod,
  };
}

// ---------------------------------------------------------------------------
// CREATE DRAFT
// ---------------------------------------------------------------------------

export interface BuatDraftInput {
  jobId: string;
  /**
   * R3.5: apakah PPh 23 dipotong. Disimpan DRAFT (bisa diubah sebelum issue);
   * dipakai sebagai DEFAULT centang saat issue — pemanggil issue tetap harus
   * mengirim nilai eksplisit.
   */
  pph23Applicable: boolean;
  /**
   * R9.4b: jalur terbit sebelum POD. Kalau true, earlyIssueApprovedBy WAJIB
   * diisi oleh OWNER (Q78 default defensif) yang ≠ pembuat draft (R-A1).
   */
  issuedBeforePod?: boolean;
  earlyIssueApprovedBy?: string | null;
  /** R9.4: tanggal Proof of Delivery diterima (YYYY-MM-DD), dicatat Finance. */
  podDiterimaAt?: string | null;
}

/**
 * Buat invoice DRAFT — tanpa nomor, tanpa tanggal, tanpa angka (semua menyusul
 * saat issue). Syarat (STATE-MACHINE.md §2 create): job FINAL DAN POD diterima
 * (R9.4) — atau jalur khusus R9.4b (issuedBeforePod + izin OWNER ≠ pembuat).
 * Juga menolak bila job sudah punya invoice aktif (terbit ke atas).
 */
export async function createDraftInvoice(
  dbOrTx: DbOrTx,
  user: PelaksanaInvoice,
  input: BuatDraftInput,
): Promise<HasilInvoice<{ id: string }>> {
  try {
    assertCan(user.role, "invoice:create");
  } catch (e) {
    if (e instanceof AuthorizationError) return gagal(e.message);
    throw e;
  }
  const jobId = teks(input.jobId);
  if (!jobId) return gagal("Job wajib dipilih.");

  return dbOrTx.transaction(async (tx) => {
    const [job] = await tx
      .select({
        id: jobs.id,
        status: jobs.status,
        seqScope: jobs.seqScope,
        customerId: jobs.customerId,
        deletedAt: jobs.deletedAt,
      })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .for("update");
    if (!job || job.deletedAt) return gagal("Job tidak ditemukan.");
    if (!isFinal(job.status as Parameters<typeof isFinal>[0])) {
      return gagal(
        `Job berstatus ${job.status} — invoice hanya boleh dibuat untuk job FINAL (R9.4).`,
      );
    }

    /*
     * Satu job = satu invoice aktif. BATAL tidak menghalangi (void membuka
     * jalur terbit ulang), DRAFT pun tidak — keduanya tidak menagih apa pun.
     */
    const [adaAktif] = await tx
      .select({ n: sql<number>`COUNT(*)::int` })
      .from(customerInvoices)
      .where(
        and(
          eq(customerInvoices.jobId, jobId),
          ne(customerInvoices.status, "DRAFT"),
          ne(customerInvoices.status, "BATAL"),
        ),
      );
    if ((adaAktif?.n ?? 0) > 0) {
      return gagal(
        "Job ini sudah punya invoice aktif (terbit/terkirim/lunas). Batalkan invoice lama lewat Owner dulu kalau perlu terbit ulang.",
      );
    }

    /*
     * R9.4b: early issue butuh approver OWNER ≠ pembuat (Q78 default).
     * Tanpa jalur khusus ini, POD WAJIB sudah diterima SEJAK CREATE —
     * menunggu issue untuk menolak terlambat; tolak di pintu masuk.
     */
    const issuedBeforePod = input.issuedBeforePod ?? false;
    let earlyIssueApprovedBy: string | null = null;
    if (issuedBeforePod) {
      earlyIssueApprovedBy = teks(input.earlyIssueApprovedBy);
      if (!earlyIssueApprovedBy) {
        return gagal(
          "Terbit sebelum POD (R9.4b) wajib nama pemberi izin (Owner) — jalur khusus, bukan pelonggaran R9.4.",
        );
      }
      const [approver] = await tx
        .select({ id: sql<string>`id`, role: sql<string>`role` })
        .from(sql`users`)
        .where(sql`id = ${earlyIssueApprovedBy}`);
      if (!approver || approver.role !== "OWNER") {
        return gagal("Pemberi izin terbit-dulu wajib OWNER (Q78 default defensif).");
      }
      try {
        assertNotSelfApproval(earlyIssueApprovedBy, user.id);
      } catch (e) {
        return gagal((e as Error).message);
      }
    } else if (teks(input.podDiterimaAt) === null) {
      return gagal(
        "POD belum diterima — invoice tidak boleh dibuat (R9.4). Catat tanggal POD, atau gunakan jalur khusus terbit-dulu (R9.4b) dengan izin Owner.",
      );
    }

    const [baris] = await tx
      .insert(customerInvoices)
      .values({
        jobId,
        invType: invoiceTypeForScope(job.seqScope as SeqScope),
        // Periode terbit awal = bulan berjalan; DRAFT boleh diubah sebelum issue.
        issueYear: new Date().getFullYear(),
        issueMonth: new Date().getMonth() + 1,
        pph23Applied: input.pph23Applicable,
        issuedBeforePod,
        earlyIssueApprovedBy,
        // Placeholder versi saat ini; ditimpa dengan versi SAAT ISSUE (I-INV-1).
        taxRuleVersion: CURRENT_TAX_RULE_VERSION,
        ...(teks(input.podDiterimaAt)
          ? { podDiterimaAt: new Date(teks(input.podDiterimaAt) as string) }
          : {}),
        customerId: job.customerId,
        createdBy: user.id,
      })
      .returning({ id: customerInvoices.id });

    await writeAudit(tx, {
      userId: user.id,
      aksi: "CREATE",
      entitas: "CUSTOMER_INVOICE",
      entitasId: baris?.id ?? null,
      sesudah: { jobId, status: "DRAFT", pph23Applicable: input.pph23Applicable },
    });
    return { ok: true, data: { id: baris?.id ?? "" } };
  });
}

// ---------------------------------------------------------------------------
// EDIT DRAFT (pph23Applicable / periode terbit / POD) — angka & nomor TIDAK bisa diubah
// ---------------------------------------------------------------------------

export interface UbahDraftInput {
  pph23Applicable?: boolean;
  issueYear?: number;
  issueMonth?: number;
  /** R9.4: catat/ubah tanggal POD diterima sebelum issue. */
  podDiterimaAt?: string | null;
}

export async function ubahDraftInvoice(
  dbOrTx: DbOrTx,
  user: PelaksanaInvoice,
  invoiceId: string,
  input: UbahDraftInput,
): Promise<HasilInvoice<{ id: string }>> {
  try {
    assertCan(user.role, "invoice:create");
  } catch (e) {
    if (e instanceof AuthorizationError) return gagal(e.message);
    throw e;
  }

  return dbOrTx.transaction(async (tx) => {
    const inv = await ambilInvoice(tx, invoiceId);
    if (!inv) return gagal("Invoice tidak ditemukan.");
    if (inv.status !== "DRAFT") {
      return gagal(
        `Invoice berstatus ${inv.status} — hanya DRAFT yang boleh diedit (I-INV-1).`,
      );
    }
    if (
      input.issueMonth !== undefined &&
      (input.issueMonth < 1 || input.issueMonth > 12)
    ) {
      return gagal("Bulan terbit harus 1-12.");
    }

    const [sesudah] = await tx
      .update(customerInvoices)
      .set({
        ...(input.pph23Applicable !== undefined
          ? { pph23Applied: input.pph23Applicable }
          : {}),
        ...(input.issueYear !== undefined ? { issueYear: input.issueYear } : {}),
        ...(input.issueMonth !== undefined ? { issueMonth: input.issueMonth } : {}),
        ...(input.podDiterimaAt !== undefined
          ? {
              podDiterimaAt: input.podDiterimaAt ? new Date(input.podDiterimaAt) : null,
            }
          : {}),
      })
      .where(
        and(eq(customerInvoices.id, invoiceId), eq(customerInvoices.status, "DRAFT")),
      )
      .returning();

    if (!sesudah) return gagal("Status invoice berubah di tengah proses — muat ulang.");

    await writeAudit(tx, {
      userId: user.id,
      aksi: "EDIT",
      entitas: "CUSTOMER_INVOICE",
      entitasId: invoiceId,
      sebelum: inv,
      sesudah,
    });
    return { ok: true, data: { id: invoiceId } };
  });
}

// ---------------------------------------------------------------------------
// HAPUS DRAFT — hard delete, TANPA audit (belum ada nomor/peristiwa uang)
// ---------------------------------------------------------------------------

export async function hapusDraftInvoice(
  dbOrTx: DbOrTx,
  user: PelaksanaInvoice,
  invoiceId: string,
): Promise<HasilInvoice<{ id: string }>> {
  try {
    assertCan(user.role, "invoice:create");
  } catch (e) {
    if (e instanceof AuthorizationError) return gagal(e.message);
    throw e;
  }

  return dbOrTx.transaction(async (tx) => {
    const inv = await ambilInvoice(tx, invoiceId);
    if (!inv) return gagal("Invoice tidak ditemukan.");
    if (inv.status !== "DRAFT") {
      return gagal(
        `Invoice berstatus ${inv.status} — hanya DRAFT yang boleh dihapus. Invoice terbit harus lewat VOID.`,
      );
    }
    await tx.delete(customerInvoices).where(eq(customerInvoices.id, invoiceId));
    return { ok: true, data: { id: invoiceId } };
  });
}

// ---------------------------------------------------------------------------
// ISSUE — alokasi nomor + beku pajak + terbilang + snapshot rincian
// ---------------------------------------------------------------------------

export interface TerbitkanInput {
  invoiceId: string;
  /** Tanggal terbit (YYYY-MM-DD). Menentukan periode counter & romawi (R2.2). */
  issueDate: string;
  /** R9.2: WAJIB manual oleh Finance. Tidak pernah dihitung service. */
  dueDate: string;
  /** R3.5: keputusan final PPh 23 saat terbit — eksplisit, tidak disimpulkan. */
  pph23Applicable: boolean;
}

export async function issueInvoice(
  dbOrTx: DbOrTx,
  user: PelaksanaInvoice,
  input: TerbitkanInput,
): Promise<HasilInvoice<{ id: string; invoiceNo: string }>> {
  try {
    assertCan(user.role, "invoice:issue");
  } catch (e) {
    if (e instanceof AuthorizationError) return gagal(e.message);
    throw e;
  }
  const invoiceId = teks(input.invoiceId);
  if (!invoiceId) return gagal("Invoice wajib dipilih.");
  const issueDate = teks(input.issueDate);
  const dueDate = teks(input.dueDate);
  if (!issueDate) return gagal("Tanggal terbit wajib diisi.");
  if (!dueDate) {
    return gagal(
      "Tanggal jatuh tempo wajib diisi manual oleh Finance (R9.2) — tidak dihitung otomatis.",
    );
  }

  return dbOrTx.transaction(async (tx) => {
    const inv = await ambilInvoice(tx, invoiceId);
    if (!inv) return gagal("Invoice tidak ditemukan.");

    // Transisi sah? (tabel murni — tidak ada jalan lain.)
    const ke = canTransitionInvoice(inv.status, "issue");
    if (ke === null) {
      return gagal(
        `Transisi tidak sah: invoice berstatus ${inv.status} tidak bisa diterbitkan. Lihat docs/STATE-MACHINE.md §2.`,
      );
    }

    /*
     * R9.4 sudah ditegakkan saat CREATE (podDiterimaAt ATAU jalur R9.4b
     * dengan izin OWNER ≠ pembuat). Tidak dicek ulang di sini — kolom tidak
     * bisa dinolkan diam-diam: ubahDraft menolak semua perubahan setelah
     * TERBIT (guard status DRAFT di atas).
     */

    // Ambil job (jobNo untuk nomor invoice + seqScope untuk topDays).
    const [job] = await tx
      .select({ jobNo: jobs.jobNo, seqScope: jobs.seqScope })
      .from(jobs)
      .where(eq(jobs.id, inv.jobId));
    if (!job) return gagal("Job tidak ditemukan.");

    // Baris selling aktif (deleted_at IS NULL).
    const barisRows = await tx
      .select({
        sellingIdr: chargeLines.sellingIdr,
        isReimburse: chargeLines.isReimburse,
        chargeCode: chargeLines.chargeCode,
        keterangan: chargeLines.keterangan,
        urutan: chargeLines.urutan,
        deletedAt: chargeLines.deletedAt,
      })
      .from(chargeLines)
      .where(and(eq(chargeLines.jobId, inv.jobId), isNull(chargeLines.deletedAt)))
      .orderBy(chargeLines.urutan);
    const lines = barisRows.map((r) => ({
      sellingIdr: rupiah(r.sellingIdr),
      isReimburse: r.isReimburse,
      chargeCode: r.chargeCode,
      deletedAt: r.deletedAt,
    }));

    // Hitung pajak — bisa melempar RangeError (mis. job tanpa baris aktif).
    let pajak: HasilPajak;
    try {
      pajak = hitungPajakInvoiceDariBaris({
        lines,
        pph23Applicable: input.pph23Applicable,
      });
    } catch (e) {
      return gagal((e as Error).message);
    }

    // Periode terbit dari issueDate (R2.2: romawi = bulan TERBIT).
    const d = new Date(`${issueDate}T00:00:00Z`);
    if (Number.isNaN(d.getTime()))
      return gagal("Tanggal terbit tidak valid (YYYY-MM-DD).");
    const issueYear = d.getUTCFullYear();
    const issueMonth = d.getUTCMonth() + 1;

    // Alokasi nomor — dalam transaksi yang sama (allocator, R2).
    const invType = (await tx
      .select({ invType: customerInvoices.invType })
      .from(customerInvoices)
      .where(eq(customerInvoices.id, invoiceId))
      .then((r) => r[0]?.invType)) as InvoiceType | undefined;
    if (!invType) return gagal("Tipe invoice tidak ditemukan.");

    const running = await allocateInvoiceNumber(tx, {
      invType,
      issueYear,
      issueMonth,
    });
    const invoiceNo = formatInvoiceNumber({
      running,
      invoiceType: invType,
      jobNo: job.jobNo,
      issueMonth,
      issueYear,
    });

    const teksTerbilang = terbilang(pajak.grandTotal);

    // Bekukan angka + nomor + tanggal. Guard status=DRAFT menangkal race.
    const [sesudah] = await tx
      .update(customerInvoices)
      .set({
        status: ke,
        invoiceNo,
        running,
        issueYear,
        issueMonth,
        issueDate,
        dueDate,
        topDays: paymentTermDays(job.seqScope as SeqScope),
        subTotalIdr: pajak.subTotal,
        reimburseIdr: pajak.reimburse,
        dppIdr: pajak.dpp,
        ppnRateBp: 110,
        ppnIdr: pajak.ppn,
        pph23Applied: input.pph23Applicable,
        pph23Idr: pajak.pph23,
        grandTotalIdr: pajak.grandTotal,
        terbilang: teksTerbilang,
        taxRuleVersion: pajak.taxRuleVersion,
      })
      .where(
        and(eq(customerInvoices.id, invoiceId), eq(customerInvoices.status, "DRAFT")),
      )
      .returning();
    if (!sesudah) {
      return gagal(
        "Status invoice berubah di tengah proses — muat ulang lalu coba lagi.",
      );
    }

    // Snapshot rincian (I-INV-1): salin baris, jangan referensi hidup.
    if (barisRows.length > 0) {
      await tx.insert(invoiceLines).values(
        barisRows.map((r) => ({
          invoiceId,
          urutan: r.urutan,
          chargeCode: r.chargeCode,
          keterangan: r.keterangan ?? r.chargeCode,
          isReimburse: r.isReimburse,
          amountIdr: r.sellingIdr,
        })),
      );
    }

    await writeAudit(tx, {
      userId: user.id,
      aksi: "ISSUE",
      entitas: "CUSTOMER_INVOICE",
      entitasId: invoiceId,
      sebelum: inv,
      sesudah,
      alasan: `Terbitkan ${invoiceNo} (pajak beku, I-INV-1).`,
    });
    return { ok: true, data: { id: invoiceId, invoiceNo } };
  });
}

// ---------------------------------------------------------------------------
// SEND / VOID / PAY — transisi dengan guard status-lama
// ---------------------------------------------------------------------------

async function transisiInvoice(
  dbOrTx: DbOrTx,
  user: PelaksanaInvoice,
  invoiceId: string,
  aksi: AksiInvoice,
  opts: { alasan?: string | null; jumlahIdr?: bigint | null; tanggal?: string | null },
): Promise<HasilInvoice<{ status: InvoiceStatus }>> {
  const izin = IZIN_PER_AKSI_INVOICE[aksi] as Parameters<typeof assertCan>[1];
  try {
    assertCan(user.role, izin);
  } catch (e) {
    if (e instanceof AuthorizationError) return gagal(e.message);
    throw e;
  }
  const id = teks(invoiceId);
  if (!id) return gagal("Invoice wajib dipilih.");
  const alasan = teks(opts.alasan);

  return dbOrTx.transaction(async (tx) => {
    const inv = await ambilInvoice(tx, id);
    if (!inv) return gagal("Invoice tidak ditemukan.");

    const ke = canTransitionInvoice(inv.status, aksi);
    if (ke === null) {
      return gagal(
        `Transisi tidak sah: invoice berstatus ${inv.status} tidak bisa menerima aksi "${aksi}". Lihat docs/STATE-MACHINE.md §2.`,
      );
    }

    if (aksi === "void" && !alasan) {
      return gagal("Alasan pembatalan invoice wajib diisi.");
    }

    // Pembayaran: hitung total terbayar + validasi jumlah (§2 pay_partial/pay_full).
    let jumlahBayar: bigint | null = null;
    if (aksi === "pay_partial" || aksi === "pay_full") {
      const [tot] = await tx
        .select({ total: sql<string>`COALESCE(SUM(${paymentsIn.jumlahIdr}), 0)::text` })
        .from(paymentsIn)
        .where(eq(paymentsIn.invoiceId, id));
      const sudahBayar = BigInt(tot?.total ?? "0");
      const sisa = subtract(rupiah(inv.grandTotalIdr), rupiah(sudahBayar));

      if (aksi === "pay_full") {
        jumlahBayar = sisa; // sisanya sekali habis
        if (sisa === 0n) return gagal("Invoice sudah lunas — tidak ada sisa tagihan.");
      } else {
        jumlahBayar = opts.jumlahIdr ?? null;
        if (jumlahBayar === null || jumlahBayar <= 0n) {
          return gagal("Nilai pembayaran parsial harus lebih besar dari nol.");
        }
        if (jumlahBayar >= sisa) {
          return gagal(
            `Nilai pembayaran (${jumlahBayar}) harus KURANG dari sisa (${sisa}) — kalau menutup semua, pakai aksi lunas.`,
          );
        }
      }
      const tanggal = teks(opts.tanggal) ?? new Date().toISOString().slice(0, 10);
      await tx.insert(paymentsIn).values({
        invoiceId: id,
        jumlahIdr: jumlahBayar,
        tanggal,
        recordedBy: user.id,
      });
    }

    const [sesudah] = await tx
      .update(customerInvoices)
      .set({
        status: ke,
        ...(aksi === "send" ? { sentDate: new Date().toISOString().slice(0, 10) } : {}),
      })
      .where(and(eq(customerInvoices.id, id), eq(customerInvoices.status, inv.status)))
      .returning();
    if (!sesudah) {
      return gagal(
        "Status invoice berubah di tengah proses — muat ulang lalu coba lagi.",
      );
    }

    await writeAudit(tx, {
      userId: user.id,
      aksi: AKSI_AUDIT_PER_AKSI[aksi],
      entitas: "CUSTOMER_INVOICE",
      entitasId: id,
      sebelum: inv,
      sesudah,
      alasan: alasan ?? `Transisi ${aksi} invoice ${id}.`,
    });
    return { ok: true, data: { status: ke } };
  });
}

/** TERBIT → TERKIRIM (invoice:issue — Finance). */
export function sendInvoice(dbOrTx: DbOrTx, user: PelaksanaInvoice, invoiceId: string) {
  return transisiInvoice(dbOrTx, user, invoiceId, "send", {});
}

/**
 * TERBIT → BATAL (invoice:void — OWNER SAJA; konflik #1: void = aksi uang
 * serius, konsisten approve_final/unlock). Alasan wajib. Nomor hangus (I-INV-2).
 */
export function voidInvoice(
  dbOrTx: DbOrTx,
  user: PelaksanaInvoice,
  invoiceId: string,
  alasan: string,
) {
  return transisiInvoice(dbOrTx, user, invoiceId, "void", { alasan });
}

/**
 * TERKIRIM → TERBAYAR_SEBAGIAN (payment:record). Jumlah wajib > 0 dan < sisa.
 */
export function bayarSebagian(
  dbOrTx: DbOrTx,
  user: PelaksanaInvoice,
  invoiceId: string,
  jumlahIdr: bigint,
  tanggal: string,
) {
  return transisiInvoice(dbOrTx, user, invoiceId, "pay_partial", {
    jumlahIdr,
    tanggal,
  });
}

/** TERKIRIM/TERBAYAR_SEBAGIAN → LUNAS (payment:record) — bayar sisa habis. */
export function lunasiInvoice(
  dbOrTx: DbOrTx,
  user: PelaksanaInvoice,
  invoiceId: string,
  tanggal: string,
) {
  return transisiInvoice(dbOrTx, user, invoiceId, "pay_full", { tanggal });
}

// ---------------------------------------------------------------------------
// ADDENDUM R16 — buat → setujui → terbitkan
// ---------------------------------------------------------------------------

export interface BuatAddendumInput {
  originalInvoiceId: string;
  /** Selisih tagihan. Harus > 0 (koreksi turun belum ada aturan pajaknya — Q69). */
  amountIdr: bigint;
  labelInternal: string;
  alasan: string;
  /**
   * R3.5: centang PPh 23 awal (preview pajak disimpan di DRAFT). Nilai FINAL
   * ditentukan param eksplisit terbitkanAddendum — bukan disimpulkan.
   */
  pph23Applicable: boolean;
  /** Periode "bulan berikutnya" penagihan selisih. */
  issueYear: number;
  issueMonth: number;
}

/**
 * Buat addendum DRAFT. Kolom pajak diisi PREVIEW (default Q69: selisih kena
 * pajak) supaya kolom NOT NULL bermakna — lalu DIHITUNG ULANG saat
 * terbitkanAddendum memakai versi aturan yang berlaku SAAT ITU (R16.3).
 */
export async function buatAddendum(
  dbOrTx: DbOrTx,
  user: PelaksanaInvoice,
  input: BuatAddendumInput,
): Promise<HasilInvoice<{ id: string; addendumSeq: number }>> {
  try {
    assertCan(user.role, "invoice:create");
  } catch (e) {
    if (e instanceof AuthorizationError) return gagal(e.message);
    throw e;
  }
  const originalId = teks(input.originalInvoiceId);
  if (!originalId) return gagal("Invoice asal wajib dipilih.");
  if (!teks(input.labelInternal))
    return gagal("Label pembeda wajib diisi (mis. SUSULAN-1).");
  if (!teks(input.alasan)) return gagal("Alasan addendum wajib diisi (R16.2).");

  return dbOrTx.transaction(async (tx) => {
    const [asal] = await tx
      .select({ id: customerInvoices.id, status: customerInvoices.status })
      .from(customerInvoices)
      .where(eq(customerInvoices.id, originalId))
      .for("update");
    if (!asal) return gagal("Invoice asal tidak ditemukan.");
    // Addendum hanya untuk invoice yang sudah terbit (angka asal sudah beku).
    if (asal.status === "DRAFT" || asal.status === "BATAL") {
      return gagal(
        `Invoice asal berstatus ${asal.status} — addendum hanya untuk invoice terbit (I-INV-1 konteks).`,
      );
    }

    // addendum_seq = MAX+1 per invoice asal (uq_addendum menjaga bentrok).
    const [maks] = await tx
      .select({
        maks: sql<number>`COALESCE(MAX(${customerInvoiceAddenda.addendumSeq}), 0)::int`,
      })
      .from(customerInvoiceAddenda)
      .where(eq(customerInvoiceAddenda.originalInvoiceId, originalId));
    const addendumSeq = (maks?.maks ?? 0) + 1;

    let pajak: HasilPajak;
    try {
      pajak = hitungPajakAddendum({
        amountIdr: rupiah(input.amountIdr),
        pph23Applicable: input.pph23Applicable,
      });
    } catch (e) {
      return gagal((e as Error).message);
    }

    const [baris] = await tx
      .insert(customerInvoiceAddenda)
      .values({
        originalInvoiceId: originalId,
        addendumSeq,
        labelInternal: teks(input.labelInternal) ?? "",
        alasan: teks(input.alasan) ?? "",
        amountIdr: input.amountIdr,
        dppIdr: pajak.dpp,
        ppnIdr: pajak.ppn,
        pph23Applied: input.pph23Applicable,
        pph23Idr: pajak.pph23,
        grandTotalIdr: pajak.grandTotal,
        taxRuleVersion: pajak.taxRuleVersion,
        issueYear: input.issueYear,
        issueMonth: input.issueMonth,
        createdBy: user.id,
      })
      .returning({ id: customerInvoiceAddenda.id });

    await writeAudit(tx, {
      userId: user.id,
      aksi: "CREATE",
      entitas: "CUSTOMER_INVOICE_ADDENDUM",
      entitasId: baris?.id ?? null,
      sesudah: { originalInvoiceId: originalId, addendumSeq, amountIdr: input.amountIdr },
      alasan: teks(input.alasan),
    });
    return { ok: true, data: { id: baris?.id ?? "", addendumSeq } };
  });
}

/**
 * Setujui addendum (DRAFT → DISETUJUI). Q70: Manager/Owner, ≠ pembuat (R-A1).
 * Sampai disetujui, addendum belum boleh diterbitkan.
 */
export async function setujuiAddendum(
  dbOrTx: DbOrTx,
  user: PelaksanaInvoice,
  addendumId: string,
): Promise<HasilInvoice<{ id: string }>> {
  try {
    assertCan(user.role, "invoice:issue");
  } catch (e) {
    if (e instanceof AuthorizationError) return gagal(e.message);
    throw e;
  }

  return dbOrTx.transaction(async (tx) => {
    const [adm] = await tx
      .select()
      .from(customerInvoiceAddenda)
      .where(eq(customerInvoiceAddenda.id, addendumId))
      .for("update");
    if (!adm) return gagal("Addendum tidak ditemukan.");
    if (adm.status !== "DRAFT") {
      return gagal(`Addendum berstatus ${adm.status} — hanya DRAFT yang bisa disetujui.`);
    }
    try {
      assertNotSelfApproval(user.id, adm.createdBy);
    } catch (e) {
      return gagal((e as Error).message);
    }

    const [sesudah] = await tx
      .update(customerInvoiceAddenda)
      .set({ status: "DISETUJUI", approvedBy: user.id })
      .where(
        and(
          eq(customerInvoiceAddenda.id, addendumId),
          eq(customerInvoiceAddenda.status, "DRAFT"),
        ),
      )
      .returning();
    if (!sesudah) return gagal("Status addendum berubah di tengah proses — muat ulang.");

    await writeAudit(tx, {
      userId: user.id,
      aksi: "APPROVE_ADDENDUM",
      entitas: "CUSTOMER_INVOICE_ADDENDUM",
      entitasId: addendumId,
      sebelum: adm,
      sesudah,
    });
    return { ok: true, data: { id: addendumId } };
  });
}

/**
 * Terbitkan addendum (DISETUJUI → ISSUED). Pajak selisih dihitung ULANG di
 * sini — R16.3: memakai versi aturan yang berlaku SAAT ADDENDUM terbit, bukan
 * versi preview saat create, dan pph23Applicable adalah keputusan eksplisit
 * penerbit (R3.5). Setelah ISSUED angkanya beku (I-INV-1 konteks addendum).
 */
export async function terbitkanAddendum(
  dbOrTx: DbOrTx,
  user: PelaksanaInvoice,
  addendumId: string,
  pph23Applicable: boolean,
): Promise<HasilInvoice<{ id: string }>> {
  try {
    assertCan(user.role, "invoice:issue");
  } catch (e) {
    if (e instanceof AuthorizationError) return gagal(e.message);
    throw e;
  }

  return dbOrTx.transaction(async (tx) => {
    const [adm] = await tx
      .select()
      .from(customerInvoiceAddenda)
      .where(eq(customerInvoiceAddenda.id, addendumId))
      .for("update");
    if (!adm) return gagal("Addendum tidak ditemukan.");
    if (adm.status !== "DISETUJUI") {
      return gagal(
        `Addendum berstatus ${adm.status} — harus disetujui dulu (R16.5) sebelum diterbitkan.`,
      );
    }

    let pajak: HasilPajak;
    try {
      pajak = hitungPajakAddendum({
        amountIdr: rupiah(adm.amountIdr),
        pph23Applicable,
      });
    } catch (e) {
      return gagal((e as Error).message);
    }

    const [sesudah] = await tx
      .update(customerInvoiceAddenda)
      .set({
        status: "ISSUED",
        dppIdr: pajak.dpp,
        ppnIdr: pajak.ppn,
        pph23Applied: pph23Applicable,
        pph23Idr: pajak.pph23,
        grandTotalIdr: pajak.grandTotal,
        taxRuleVersion: pajak.taxRuleVersion,
      })
      .where(
        and(
          eq(customerInvoiceAddenda.id, addendumId),
          eq(customerInvoiceAddenda.status, "DISETUJUI"),
        ),
      )
      .returning();
    if (!sesudah) return gagal("Status addendum berubah di tengah proses — muat ulang.");

    await writeAudit(tx, {
      userId: user.id,
      aksi: "ISSUE",
      entitas: "CUSTOMER_INVOICE_ADDENDUM",
      entitasId: addendumId,
      sebelum: adm,
      sesudah,
      alasan: `Terbitkan addendum ${adm.addendumSeq} (${adm.labelInternal}) atas invoice asal — pajak selisih versi ${pajak.taxRuleVersion} (R16.3).`,
    });
    return { ok: true, data: { id: addendumId } };
  });
}

/** Daftar invoice satu job (untuk halaman detail / guard J-INV-3/4). */
export async function daftarInvoiceJob(dbOrTx: DbOrTx, jobId: string) {
  return dbOrTx.select().from(customerInvoices).where(eq(customerInvoices.jobId, jobId));
}

/** Total pembayaran masuk satu invoice — dihitung saat tampil (R14.5). */
export async function totalPembayaran(
  dbOrTx: DbOrTx,
  invoiceId: string,
): Promise<Rupiah> {
  const [tot] = await dbOrTx
    .select({ total: sql<string>`COALESCE(SUM(${paymentsIn.jumlahIdr}), 0)::text` })
    .from(paymentsIn)
    .where(eq(paymentsIn.invoiceId, invoiceId));
  return rupiah(BigInt(tot?.total ?? "0"));
}

/** Re-export agregat untuk pemakaian service-level (hindari import ganda). */
export { hitungPajakInvoiceDariBaris, sum };
