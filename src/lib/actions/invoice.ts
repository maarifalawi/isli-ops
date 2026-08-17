"use server";

/*
 * Server action invoice customer — Irisan 10 Item 6 (UI /invoice).
 *
 * Wrapper TIPIS atas service Irisan 6 (src/lib/invoice/index.ts): TIDAK ada
 * logika state machine/authz/audit/pajak yang ditulis ulang — semuanya tetap
 * di service (terkunci test integrasi Irisan 6). Nomor invoice TIDAK pernah
 * dibuat di sini: alokasi terjadi di dalam issueInvoice (allocateInvoiceNumber,
 * satu transaksi dengan beku pajak — R2 + I-INV-1).
 */

import { db } from "@/db/index";
import {
  bayarSebagian,
  createDraftInvoice,
  hapusDraftInvoice,
  issueInvoice,
  lunasiInvoice,
  sendInvoice,
  ubahDraftInvoice,
  voidInvoice,
} from "@/lib/invoice/index";
import { requireUser } from "@/lib/session/index";
import { revalidatePath } from "next/cache";

export type HasilInvoiceAction =
  | { ok: true; pesan?: string }
  | { ok: false; error: string };

function bungkus(hasil: { ok: boolean; error?: string }): HasilInvoiceAction {
  if (!hasil.ok) return { ok: false, error: hasil.error ?? "Gagal." };
  revalidatePath("/invoice");
  return { ok: true };
}

function teks(fd: FormData, nama: string): string {
  return String(fd.get(nama) ?? "").trim();
}

function centang(fd: FormData, nama: string): boolean {
  const v = teks(fd, nama);
  return v === "on" || v === "true" || v === "1";
}

/** Buat DRAFT (job FINAL + POD R9.4 / jalur R9.4b — dicek service). */
export async function actionBuatDraftInvoice(fd: FormData): Promise<HasilInvoiceAction> {
  const user = await requireUser();
  return bungkus(
    await createDraftInvoice(db, user, {
      jobId: teks(fd, "jobId"),
      pph23Applicable: centang(fd, "pph23Applicable"),
      ...(teks(fd, "podDiterimaAt") ? { podDiterimaAt: teks(fd, "podDiterimaAt") } : {}),
    }),
  );
}

/**
 * Terbitkan DRAFT → TERBIT. Nomor dialokasikan DI SERVICE (allocateInvoiceNumber
 * dalam transaksi yang sama dengan beku pajak) — UI tidak pernah menyetel nomor.
 * dueDate manual wajib (R9.2/Q07), pph23Applicable eksplisit (R3.5).
 */
export async function actionTerbitkanInvoice(
  fd: FormData,
): Promise<{ ok: true; invoiceNo: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const hasil = await issueInvoice(db, user, {
    invoiceId: teks(fd, "invoiceId"),
    issueDate: teks(fd, "issueDate"),
    dueDate: teks(fd, "dueDate"),
    pph23Applicable: centang(fd, "pph23Applicable"),
  });
  if (!hasil.ok) return { ok: false, error: hasil.error };
  revalidatePath("/invoice");
  return { ok: true, invoiceNo: hasil.data.invoiceNo };
}

/** Ubah field pra-terbit DRAFT (pph23/periode/POD — angka & nomor terkunci). */
export async function actionUbahDraftInvoice(fd: FormData): Promise<HasilInvoiceAction> {
  const user = await requireUser();
  const bulan = teks(fd, "issueMonth");
  const tahun = teks(fd, "issueYear");
  return bungkus(
    await ubahDraftInvoice(db, user, teks(fd, "invoiceId"), {
      ...(fd.has("pph23Applicable")
        ? { pph23Applicable: centang(fd, "pph23Applicable") }
        : {}),
      ...(tahun !== "" ? { issueYear: Number(tahun) } : {}),
      ...(bulan !== "" ? { issueMonth: Number(bulan) } : {}),
      ...(fd.has("podDiterimaAt")
        ? { podDiterimaAt: teks(fd, "podDiterimaAt") || null }
        : {}),
    }),
  );
}

/** Hapus DRAFT (hard delete tanpa audit — belum ada nomor/peristiwa uang). */
export async function actionHapusDraftInvoice(fd: FormData): Promise<HasilInvoiceAction> {
  const user = await requireUser();
  return bungkus(await hapusDraftInvoice(db, user, teks(fd, "invoiceId")));
}

/** TERBIT → TERKIRIM. */
export async function actionKirimInvoice(fd: FormData): Promise<HasilInvoiceAction> {
  const user = await requireUser();
  return bungkus(await sendInvoice(db, user, teks(fd, "invoiceId")));
}

/** TERBIT → BATAL (OWNER saja + alasan wajib — service). */
export async function actionBatalkanInvoice(fd: FormData): Promise<HasilInvoiceAction> {
  const user = await requireUser();
  return bungkus(await voidInvoice(db, user, teks(fd, "invoiceId"), teks(fd, "alasan")));
}

/** TERKIRIM → TERBAYAR_SEBAGIAN (jumlah < sisa — divalidasi service). */
export async function actionBayarSebagian(fd: FormData): Promise<HasilInvoiceAction> {
  const user = await requireUser();
  const jumlah = teks(fd, "jumlahIdr");
  if (jumlah === "" || !/^\d+$/.test(jumlah)) {
    return { ok: false, error: "Nilai pembayaran harus angka bulat rupiah." };
  }
  return bungkus(
    await bayarSebagian(
      db,
      user,
      teks(fd, "invoiceId"),
      BigInt(jumlah),
      teks(fd, "tanggal") || new Date().toISOString().slice(0, 10),
    ),
  );
}

/** TERKIRIM/TERBAYAR_SEBAGIAN → LUNAS (bayar sisa — jumlah dihitung service). */
export async function actionLunasiInvoice(fd: FormData): Promise<HasilInvoiceAction> {
  const user = await requireUser();
  return bungkus(
    await lunasiInvoice(
      db,
      user,
      teks(fd, "invoiceId"),
      teks(fd, "tanggal") || new Date().toISOString().slice(0, 10),
    ),
  );
}
