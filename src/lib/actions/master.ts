"use server";

/*
 * Server actions halaman master data — Irisan 3 (RENCANA-IRISAN-3-CRUD §3-§4).
 *
 * Pola di setiap action:
 * 1. requireUser() — middleware sudah menahan jalur, ini lapis kedua;
 * 2. panggil logika murni src/lib/master-data dengan `db` — validasi, RBAC,
 *    transaksi, dan audit terjadi di sana (satu pintu, ADR-0004);
 * 3. kembalikan { ok, error?, miripDengan? } untuk ditampilkan halaman
 *    (PesanHasil / PeringatanMirip).
 *
 * Setelah mutasi berhasil, `revalidatePath` memaksa Next merender ulang
 * daftar — server component mengambil data segar dari DB.
 */

import { revalidatePath } from "next/cache";
import { db } from "@/db/index";
import { requireUser } from "@/lib/session/index";
import {
  buatCustomer,
  buatPort,
  buatShipLine,
  buatVendor,
  ubahChargeCode,
  ubahCustomer,
  ubahPort,
  ubahShipLine,
  ubahStatusAktif,
  ubahVendor,
} from "@/lib/master-data/index";

export type HasilAction =
  | { ok: true; miripDengan?: { id: string; nama: string; skor: number }[] }
  | { ok: false; error: string };

function angka(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (s === "") return null;
  return Number(s); // NaN dibiarkan — lib memberi pesan error ramah
}

function bool(v: FormDataEntryValue | null): boolean {
  return v != null && v !== "";
}

// ── CUSTOMER ──────────────────────────────────────────────────────────────────

export async function actionBuatCustomer(fd: FormData): Promise<HasilAction> {
  const user = await requireUser();
  const hasil = await buatCustomer(db, user, {
    nama: String(fd.get("nama") ?? ""),
    legalName: String(fd.get("legalName") ?? ""),
    npwp: String(fd.get("npwp") ?? ""),
    alamat: String(fd.get("alamat") ?? ""),
    topHari: angka(fd.get("topHari")),
    pph23Default: bool(fd.get("pph23Default")),
  });
  if (hasil.ok) revalidatePath("/master/customers");
  return hasil;
}

export async function actionUbahCustomer(fd: FormData): Promise<HasilAction> {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");
  const hasil = await ubahCustomer(db, user, id, {
    nama: String(fd.get("nama") ?? ""),
    legalName: String(fd.get("legalName") ?? ""),
    npwp: String(fd.get("npwp") ?? ""),
    alamat: String(fd.get("alamat") ?? ""),
    topHari: angka(fd.get("topHari")),
    pph23Default: bool(fd.get("pph23Default")),
  });
  if (hasil.ok) revalidatePath("/master/customers");
  return hasil;
}

// ── VENDOR ────────────────────────────────────────────────────────────────────

export async function actionBuatVendor(fd: FormData): Promise<HasilAction> {
  const user = await requireUser();
  const hasil = await buatVendor(db, user, {
    nama: String(fd.get("nama") ?? ""),
    legalName: String(fd.get("legalName") ?? ""),
    npwp: String(fd.get("npwp") ?? ""),
    vendorType: String(fd.get("vendorType") ?? ""),
    paymentTerm: String(fd.get("paymentTerm") ?? ""),
    paymentTermDays: angka(fd.get("paymentTermDays")),
    pph23Default: bool(fd.get("pph23Default")),
  });
  if (hasil.ok) revalidatePath("/master/vendors");
  return hasil;
}

export async function actionUbahVendor(fd: FormData): Promise<HasilAction> {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");
  const hasil = await ubahVendor(db, user, id, {
    nama: String(fd.get("nama") ?? ""),
    legalName: String(fd.get("legalName") ?? ""),
    npwp: String(fd.get("npwp") ?? ""),
    vendorType: String(fd.get("vendorType") ?? ""),
    paymentTerm: String(fd.get("paymentTerm") ?? ""),
    paymentTermDays: angka(fd.get("paymentTermDays")),
    pph23Default: bool(fd.get("pph23Default")),
  });
  if (hasil.ok) revalidatePath("/master/vendors");
  return hasil;
}

// ── PORT ──────────────────────────────────────────────────────────────────────

export async function actionBuatPort(fd: FormData): Promise<HasilAction> {
  const user = await requireUser();
  const hasil = await buatPort(db, user, {
    kode: String(fd.get("kode") ?? ""),
    nama: String(fd.get("nama") ?? ""),
    negara: String(fd.get("negara") ?? ""),
  });
  if (hasil.ok) revalidatePath("/master/ports");
  return hasil;
}

export async function actionUbahPort(fd: FormData): Promise<HasilAction> {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");
  const hasil = await ubahPort(db, user, id, {
    kode: String(fd.get("kode") ?? ""),
    nama: String(fd.get("nama") ?? ""),
    negara: String(fd.get("negara") ?? ""),
  });
  if (hasil.ok) revalidatePath("/master/ports");
  return hasil;
}

// ── SHIP LINE ─────────────────────────────────────────────────────────────────

export async function actionBuatShipLine(fd: FormData): Promise<HasilAction> {
  const user = await requireUser();
  const hasil = await buatShipLine(db, user, {
    kode: String(fd.get("kode") ?? ""),
    nama: String(fd.get("nama") ?? ""),
  });
  if (hasil.ok) revalidatePath("/master/ship-lines");
  return hasil;
}

export async function actionUbahShipLine(fd: FormData): Promise<HasilAction> {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");
  const hasil = await ubahShipLine(db, user, id, {
    kode: String(fd.get("kode") ?? ""),
    nama: String(fd.get("nama") ?? ""),
  });
  if (hasil.ok) revalidatePath("/master/ship-lines");
  return hasil;
}

// ── CHARGE CODE ───────────────────────────────────────────────────────────────

export async function actionUbahChargeCode(fd: FormData): Promise<HasilAction> {
  const user = await requireUser();
  const kode = String(fd.get("kode") ?? "");
  const hasil = await ubahChargeCode(db, user, kode, {
    keterangan: String(fd.get("keterangan") ?? ""),
    nameId: String(fd.get("nameId") ?? ""),
    category: String(fd.get("category") ?? ""),
    defaultLeg: angka(fd.get("defaultLeg")),
    kategori: bool(fd.get("kategoriFixed")) ? "FIXED" : "OPSIONAL",
    segmentScope: (String(fd.get("segmentScope") || "BOTH") || "BOTH") as
      | "DOM"
      | "EXIM"
      | "BOTH",
    defaultReimburse: bool(fd.get("defaultReimburse")),
    isAtCostDefault: bool(fd.get("isAtCostDefault")),
    isTaxable: bool(fd.get("isTaxable")),
    pph23Applicable: bool(fd.get("pph23Applicable")),
    butuhVendor: bool(fd.get("butuhVendor")),
  });
  if (hasil.ok) revalidatePath("/master/charge-codes");
  return hasil;
}

// ── NONAKTIFKAN / AKTIFKAN (soft delete, RENCANA §6) ──────────────────────────

type EntitasAktif = "CUSTOMER" | "VENDOR" | "CHARGE_CODE";

export async function actionUbahStatus(
  fd: FormData,
  entitas: EntitasAktif,
  path: string,
): Promise<HasilAction> {
  const user = await requireUser();
  const id = String(fd.get("id") ?? "");
  const aktifBaru = String(fd.get("aktifBaru") ?? "") === "true";
  const hasil = await ubahStatusAktif(db, user, entitas, id, aktifBaru, {
    alasan: String(fd.get("alasan") ?? ""),
  });
  if (hasil.ok) revalidatePath(path);
  return hasil;
}

export async function actionStatusCustomer(fd: FormData): Promise<HasilAction> {
  return actionUbahStatus(fd, "CUSTOMER", "/master/customers");
}

export async function actionStatusVendor(fd: FormData): Promise<HasilAction> {
  return actionUbahStatus(fd, "VENDOR", "/master/vendors");
}

export async function actionStatusChargeCode(fd: FormData): Promise<HasilAction> {
  return actionUbahStatus(fd, "CHARGE_CODE", "/master/charge-codes");
}
