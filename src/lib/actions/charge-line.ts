"use server";

/*
 * Server actions charge line — Irisan 4b.
 *
 * Pola sama dengan src/lib/actions/job.ts & master.ts:
 *   1. requireUser() — lapis kedua setelah middleware;
 *   2. panggil logika murni src/lib/charge-line dengan `db` — RBAC, validasi
 *      at-cost (R4.3), vendor wajib (R15), transaksi, dan audit terjadi di sana;
 *   3. kembalikan { ok, error? } untuk halaman, lalu revalidatePath.
 *
 * Uang TIDAK dihitung di sini. Nilai diteruskan sebagai integer rupiah bulat;
 * pecahan/float ditolak di lapis domain.
 */

import { db } from "@/db/index";
import {
  type ChargeLineInput,
  createChargeLine,
  hapusChargeLine,
  updateChargeLine,
} from "@/lib/charge-line/index";
import { requireUser } from "@/lib/session/index";
import { revalidatePath } from "next/cache";

export type HasilChargeLineAction = { ok: true } | { ok: false; error: string };

/** number bulat dari field form; string kosong → null. NaN dibiarkan (ditolak di domain). */
function angka(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  return Number(s);
}

function bool(v: FormDataEntryValue | null): boolean {
  return v != null && v !== "";
}

function teks(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

function legDariForm(v: FormDataEntryValue | null): number | null {
  const n = angka(v);
  return n === null ? null : n;
}

function inputDariForm(fd: FormData): Omit<ChargeLineInput, "jobId"> {
  return {
    chargeCode: String(fd.get("chargeCode") ?? ""),
    vendorId: teks(fd.get("vendorId")),
    keterangan: teks(fd.get("keterangan")),
    sellingIdr: angka(fd.get("sellingIdr")),
    pencadanganIdr: angka(fd.get("pencadanganIdr")),
    isReimburse: bool(fd.get("isReimburse")),
    isAtCost: bool(fd.get("isAtCost")),
    leg: legDariForm(fd.get("leg")),
    currency: teks(fd.get("currency")) ?? "IDR",
    urutan: angka(fd.get("urutan")),
  };
}

export async function actionTambahChargeLine(
  fd: FormData,
): Promise<HasilChargeLineAction> {
  const user = await requireUser();
  const jobId = String(fd.get("jobId") ?? "");
  const hasil = await createChargeLine(db, user, { ...inputDariForm(fd), jobId });
  if (!hasil.ok) return { ok: false, error: hasil.error };
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

export async function actionUbahChargeLine(fd: FormData): Promise<HasilChargeLineAction> {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");
  const jobId = String(fd.get("jobId") ?? "");
  const hasil = await updateChargeLine(db, user, id, inputDariForm(fd));
  if (!hasil.ok) return { ok: false, error: hasil.error };
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

export async function actionHapusChargeLine(
  fd: FormData,
): Promise<HasilChargeLineAction> {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");
  const jobId = String(fd.get("jobId") ?? "");
  const alasan = String(fd.get("alasan") ?? "");
  const hasil = await hapusChargeLine(db, user, id, alasan);
  if (!hasil.ok) return { ok: false, error: hasil.error };
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}
