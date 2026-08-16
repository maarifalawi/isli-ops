"use server";

/*
 * Server action buat job — Irisan 4a.
 *
 * Pola sama dengan src/lib/actions/master.ts:
 *   1. requireUser() — lapis kedua setelah middleware;
 *   2. panggil logika murni src/lib/job (createJob) dengan `db` — RBAC,
 *      validasi R10, transaksi, alokasi nomor, dan audit terjadi di sana;
 *   3. kembalikan { ok, error? } (+ data jobNo saat sukses) untuk halaman.
 *
 * Uang TIDAK dihitung di sini. Kurs USD hanya diteruskan sebagai integer.
 */

import { db } from "@/db/index";
import type { JobSuffix, SeqScope } from "@/lib/job-number/index";
import { type CreateJobInput, createJob } from "@/lib/job/index";
import type { PilihanLeg } from "@/lib/job/leg-rules";
import { requireUser } from "@/lib/session/index";
import { revalidatePath } from "next/cache";

export type HasilJobAction = { ok: true; jobNo: string } | { ok: false; error: string };

function angka(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  return Number(s); // NaN dibiarkan — lib memberi pesan error ramah
}

function bool(v: FormDataEntryValue | null): boolean {
  return v != null && v !== "";
}

const SUFFIX_VALID = ["EXP", "IMP", "AF", "SEAFREIGHT"] as const;

export async function actionBuatJob(fd: FormData): Promise<HasilJobAction> {
  const user = await requireUser();

  const segmen = String(fd.get("segmen") ?? "") as SeqScope;
  const suffixRaw = String(fd.get("suffix") ?? "").trim();
  const suffix = SUFFIX_VALID.includes(suffixRaw as JobSuffix)
    ? (suffixRaw as JobSuffix)
    : null;
  const serviceRaw = String(fd.get("serviceType") ?? "").trim();
  const serviceType =
    serviceRaw === "FCL" || serviceRaw === "LCL" || serviceRaw === "AF"
      ? serviceRaw
      : null;

  const legs: PilihanLeg = {
    trucking: bool(fd.get("legTrucking")),
    freight: bool(fd.get("legFreight")),
    delivery: bool(fd.get("legDelivery")),
  };

  const input: CreateJobInput = {
    segmen,
    tahun: angka(fd.get("tahun")) ?? Number.NaN,
    bulan: angka(fd.get("bulan")) ?? Number.NaN,
    customerId: String(fd.get("customerId") ?? ""),
    legs,
    legOverrideAlasan: String(fd.get("legOverrideAlasan") ?? ""),
    suffix,
    serviceType,
    rute: String(fd.get("rute") ?? ""),
    vessel: String(fd.get("vessel") ?? ""),
    etd: String(fd.get("etd") ?? ""),
    sales: String(fd.get("sales") ?? ""),
    sellingUsd: angka(fd.get("sellingUsd")),
    kursX100: angka(fd.get("kursX100")),
  };

  const hasil = await createJob(db, user, input);
  if (!hasil.ok) return { ok: false, error: hasil.error };
  revalidatePath("/jobs");
  return { ok: true, jobNo: hasil.data.jobNo };
}
