import type { db } from "@/db/index";
import { vendorInvoiceAddenda, vendorInvoices } from "@/db/schema/index";
import { writeAudit } from "@/lib/audit/index";
import { AuthorizationError, assertCan, assertNotSelfApproval } from "@/lib/authz/index";
import { and, eq, sql } from "drizzle-orm";

/*
 * Addenda invoice vendor — R17 (Irisan 10 Item 10, fase 1).
 *
 * Konteks (docs/DOMAIN-RULES.md R17 + komentar skema): satu nomor invoice
 * vendor boleh SENGAJA dipakai ulang untuk menagih SISA di bulan berikutnya.
 * uq_vendor_invoice (vendor_id, vendor_invoice_no) TIDAK disentuh — kunci
 * unik addenda ada di (original_vendor_invoice_id, addendum_seq).
 *
 * Alur (default Q77, pola R16.5 — keputusan user 18 Agu 2026):
 *   DRAFT → DISETUJUI (Manager/Owner ≠ pembuat, R-A1) → ISSUED.
 *   dibayar_at HANYA boleh terisi setelah ISSUED (guard eksplisit).
 *
 * Sisa kuota (R17.3) = original.jumlah_idr − SUM(addendum dibayar_at terisi)
 * — DIHITUNG SAAT TAMPIL (R14.5), TIDAK disimpan sebagai kolom.
 *
 * Audit: CREATE (buat DRAFT), APPROVE_ADDENDUM (setujui), EDIT (issue),
 * PAY (catat bayar) — aksi/entitas existing + VENDOR_INVOICE_ADDENDUM.
 */

type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer T) => unknown
  ? T
  : never;
export type DbOrTx = typeof db | Tx;

export interface PelaksanaAddenda {
  id: string;
  role: "OWNER" | "MANAGER" | "STAFF";
}

export type HasilAddenda<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** Transisi sah addenda vendor (tabel murni — tidak ada jalan lain). */
export const TRANSISI_ADDENDA = {
  DISETUJUI: { dari: ["DRAFT"] },
  ISSUED: { dari: ["DISETUJUI"] },
} as const;

export function bisaTransisiAddendum(
  dari: string,
  ke: keyof typeof TRANSISI_ADDENDA,
): boolean {
  return (TRANSISI_ADDENDA[ke] as { dari: readonly string[] }).dari.includes(dari);
}

/** Sisa kuota R17.3 — murni, tanpa DB (diuji unit). */
export function hitungSisaKuota(
  jumlahAsli: bigint,
  totalAddendumDibayar: bigint,
): bigint {
  return jumlahAsli - totalAddendumDibayar;
}

function gagal(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function teks(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

function cekWewenang(
  role: PelaksanaAddenda["role"],
  action: "vendor_invoice:create" | "vendor_invoice:verify" | "vendor_invoice:mark_paid",
): { ok: false; error: string } | null {
  try {
    assertCan(role, action);
    return null;
  } catch (e) {
    if (e instanceof AuthorizationError) return gagal(e.message);
    throw e;
  }
}

async function ambilAddendum(tx: Tx, id: string) {
  const [row] = await tx
    .select()
    .from(vendorInvoiceAddenda)
    .where(eq(vendorInvoiceAddenda.id, id))
    .for("update");
  return row ?? null;
}

// ---------------------------------------------------------------------------
// BUAT (DRAFT) — vendor_invoice:create (semua peran; pola input manual AP).
// ---------------------------------------------------------------------------

export interface InputBuatAddendum {
  originalVendorInvoiceId: string;
  /** Wajib, pembeda dua tagihan atas nomor sama (mis. SUSULAN-1). */
  labelInternal: string;
  /** Wajib (masuk audit_log). */
  alasan: string;
  /** Selisih yang ditagih. R17.3: jumlah seluruh addendum ≤ jumlah asli. */
  jumlahIdr: bigint;
  pph23Applied: boolean;
  pph23Idr: bigint;
  issueYear: number;
  issueMonth: number;
}

export async function buatAddendumVendor(
  dbOrTx: DbOrTx,
  user: PelaksanaAddenda,
  input: InputBuatAddendum,
): Promise<HasilAddenda<{ id: string; addendumSeq: number }>> {
  const tolak = cekWewenang(user.role, "vendor_invoice:create");
  if (tolak) return tolak;
  const originalId = teks(input.originalVendorInvoiceId);
  if (!originalId) return gagal("Invoice vendor asal wajib dipilih.");
  if (!teks(input.labelInternal))
    return gagal("Label pembeda wajib diisi (mis. SUSULAN-1).");
  if (!teks(input.alasan)) return gagal("Alasan addendum wajib diisi.");
  if (input.jumlahIdr <= 0n) return gagal("Jumlah addendum harus lebih dari nol.");
  if (input.issueMonth < 1 || input.issueMonth > 12)
    return gagal("Bulan terbit harus 1-12.");

  return dbOrTx.transaction(async (tx) => {
    const [asal] = await tx
      .select({ id: vendorInvoices.id, status: vendorInvoices.status })
      .from(vendorInvoices)
      .where(eq(vendorInvoices.id, originalId))
      .for("update");
    if (!asal) return gagal("Invoice vendor asal tidak ditemukan.");
    // Addendum hanya atas invoice yang sudah dibayar penuh (R17: sisa tagihan
    // muncul SETELAH pembayaran pertama dikonfirmasi).
    if (asal.status !== "DIBAYAR") {
      return gagal(
        `Invoice asal berstatus ${asal.status} — addenda hanya untuk invoice DIBAYAR (R17).`,
      );
    }

    // addendum_seq = MAX+1 per invoice asal (uq_vendor_addendum menjaga bentrok).
    const [maks] = await tx
      .select({
        maks: sql<number>`COALESCE(MAX(${vendorInvoiceAddenda.addendumSeq}), 0)::int`,
      })
      .from(vendorInvoiceAddenda)
      .where(eq(vendorInvoiceAddenda.originalVendorInvoiceId, originalId));
    const addendumSeq = (maks?.maks ?? 0) + 1;

    const [baris] = await tx
      .insert(vendorInvoiceAddenda)
      .values({
        originalVendorInvoiceId: originalId,
        addendumSeq,
        labelInternal: teks(input.labelInternal) ?? "",
        alasan: teks(input.alasan) ?? "",
        jumlahIdr: input.jumlahIdr,
        pph23Applied: input.pph23Applied,
        pph23Idr: input.pph23Idr,
        issueYear: input.issueYear,
        issueMonth: input.issueMonth,
        createdBy: user.id,
      })
      .returning();

    await writeAudit(tx, {
      userId: user.id,
      aksi: "CREATE",
      entitas: "VENDOR_INVOICE_ADDENDUM",
      entitasId: baris?.id ?? null,
      sesudah: baris ?? null,
      alasan: teks(input.alasan),
    });
    return { ok: true, data: { id: baris?.id ?? "", addendumSeq } };
  });
}

// ---------------------------------------------------------------------------
// SETUJUI (DRAFT → DISETUJUI) — vendor_invoice:verify (M/O), ≠ pembuat.
// ---------------------------------------------------------------------------

export async function setujuiAddendumVendor(
  dbOrTx: DbOrTx,
  user: PelaksanaAddenda,
  addendumId: string,
): Promise<HasilAddenda<{ id: string }>> {
  const tolak = cekWewenang(user.role, "vendor_invoice:verify");
  if (tolak) return tolak;
  const id = teks(addendumId);
  if (!id) return gagal("Addendum tidak valid.");

  return dbOrTx.transaction(async (tx) => {
    const adm = await ambilAddendum(tx, id);
    if (!adm) return gagal("Addendum tidak ditemukan.");
    if (!bisaTransisiAddendum(adm.status, "DISETUJUI")) {
      return gagal(`Addendum berstatus ${adm.status} — hanya DRAFT yang bisa disetujui.`);
    }
    try {
      assertNotSelfApproval(user.id, adm.createdBy);
    } catch (e) {
      return gagal((e as Error).message);
    }

    const [sesudah] = await tx
      .update(vendorInvoiceAddenda)
      .set({ status: "DISETUJUI", approvedBy: user.id })
      .where(
        and(eq(vendorInvoiceAddenda.id, id), eq(vendorInvoiceAddenda.status, "DRAFT")),
      )
      .returning();
    if (!sesudah) return gagal("Status addendum berubah di tengah proses — muat ulang.");

    await writeAudit(tx, {
      userId: user.id,
      aksi: "APPROVE_ADDENDUM",
      entitas: "VENDOR_INVOICE_ADDENDUM",
      entitasId: id,
      sebelum: adm,
      sesudah,
    });
    return { ok: true, data: { id } };
  });
}

// ---------------------------------------------------------------------------
// TERBITKAN (DISETUJUI → ISSUED) — vendor_invoice:verify (M/O).
// ---------------------------------------------------------------------------

export async function terbitkanAddendumVendor(
  dbOrTx: DbOrTx,
  user: PelaksanaAddenda,
  addendumId: string,
): Promise<HasilAddenda<{ id: string }>> {
  const tolak = cekWewenang(user.role, "vendor_invoice:verify");
  if (tolak) return tolak;
  const id = teks(addendumId);
  if (!id) return gagal("Addendum tidak valid.");

  return dbOrTx.transaction(async (tx) => {
    const adm = await ambilAddendum(tx, id);
    if (!adm) return gagal("Addendum tidak ditemukan.");
    if (!bisaTransisiAddendum(adm.status, "ISSUED")) {
      return gagal(
        `Addendum berstatus ${adm.status} — harus disetujui dulu sebelum diterbitkan.`,
      );
    }

    const [sesudah] = await tx
      .update(vendorInvoiceAddenda)
      .set({ status: "ISSUED" })
      .where(
        and(
          eq(vendorInvoiceAddenda.id, id),
          eq(vendorInvoiceAddenda.status, "DISETUJUI"),
        ),
      )
      .returning();
    if (!sesudah) return gagal("Status addendum berubah di tengah proses — muat ulang.");

    await writeAudit(tx, {
      userId: user.id,
      aksi: "EDIT",
      entitas: "VENDOR_INVOICE_ADDENDUM",
      entitasId: id,
      sebelum: adm,
      sesudah,
      alasan: "Terbitkan addendum vendor (ISSUED).",
    });
    return { ok: true, data: { id } };
  });
}

// ---------------------------------------------------------------------------
// CATAT BAYAR (ISSUED → dibayar_at terisi) — vendor_invoice:mark_paid.
// ---------------------------------------------------------------------------

export async function catatBayarAddendumVendor(
  dbOrTx: DbOrTx,
  user: PelaksanaAddenda,
  addendumId: string,
  dibayarAt: Date,
): Promise<HasilAddenda<{ id: string }>> {
  const tolak = cekWewenang(user.role, "vendor_invoice:mark_paid");
  if (tolak) return tolak;
  const id = teks(addendumId);
  if (!id) return gagal("Addendum tidak valid.");
  if (!(dibayarAt instanceof Date) || Number.isNaN(dibayarAt.getTime())) {
    return gagal("Tanggal bayar tidak valid.");
  }

  return dbOrTx.transaction(async (tx) => {
    const adm = await ambilAddendum(tx, id);
    if (!adm) return gagal("Addendum tidak ditemukan.");
    // Guard eksplisit: dibayar_at HANYA setelah ISSUED.
    if (adm.status !== "ISSUED" || adm.dibayarAt !== null) {
      return gagal(
        `Addendum berstatus ${adm.status}${adm.dibayarAt ? " (sudah dibayar)" : ""} — pembayaran hanya untuk addendum ISSUED yang belum dibayar.`,
      );
    }

    const [sesudah] = await tx
      .update(vendorInvoiceAddenda)
      .set({ dibayarAt })
      .where(
        and(
          eq(vendorInvoiceAddenda.id, id),
          eq(vendorInvoiceAddenda.status, "ISSUED"),
          sql`${vendorInvoiceAddenda.dibayarAt} IS NULL`,
        ),
      )
      .returning();
    if (!sesudah) return gagal("Status addendum berubah di tengah proses — muat ulang.");

    await writeAudit(tx, {
      userId: user.id,
      aksi: "PAY",
      entitas: "VENDOR_INVOICE_ADDENDUM",
      entitasId: id,
      sebelum: adm,
      sesudah,
      alasan: "Catat pembayaran addendum vendor (R17.3 — memengaruhi sisa kuota).",
    });
    return { ok: true, data: { id } };
  });
}

// ---------------------------------------------------------------------------
// Query baca — sisa kuota dihitung saat tampil (R14.5), bukan kolom.
// ---------------------------------------------------------------------------

/** Sisa kuota satu invoice vendor = jumlah asli − SUM addendum dibayar. */
export async function sisaKuotaVendorInvoice(
  dbOrTx: DbOrTx,
  vendorInvoiceId: string,
): Promise<bigint> {
  const [asal] = await dbOrTx
    .select({ jumlah: vendorInvoices.jumlahIdr })
    .from(vendorInvoices)
    .where(eq(vendorInvoices.id, vendorInvoiceId))
    .limit(1);
  if (!asal) throw new Error("Invoice vendor tidak ditemukan.");
  const [tot] = await dbOrTx
    .select({
      total: sql<string>`COALESCE(SUM(${vendorInvoiceAddenda.jumlahIdr}), 0)::text`,
    })
    .from(vendorInvoiceAddenda)
    .where(
      and(
        eq(vendorInvoiceAddenda.originalVendorInvoiceId, vendorInvoiceId),
        sql`${vendorInvoiceAddenda.dibayarAt} IS NOT NULL`,
      ),
    );
  return hitungSisaKuota(asal.jumlah, BigInt(tot?.total ?? "0"));
}
