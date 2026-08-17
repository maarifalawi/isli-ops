import { type Role, can } from "@/lib/authz/index";

/*
 * Logika tampil aksi invoice customer — Irisan 10 Item 6. Murni supaya
 * dikunci unit test. UI hanya menyembunyikan; service src/lib/invoice tetap
 * penjaga otoritatif (assertCan + transisi + I-INV-1 + audit).
 */

/** Terbitkan (DRAFT → TERBIT): invoice:issue — Owner/Manager saja. */
export function bolehTerbitkan(role: Role): boolean {
  return can(role, "invoice:issue");
}

/** Kirim (TERBIT → TERKIRIM): invoice:issue. */
export function bolehKirim(role: Role): boolean {
  return can(role, "invoice:issue");
}

/** Batalkan (void): invoice:void — OWNER SAJA (I-INV-2, konflik #1 Irisan 6). */
export function bolehBatalkan(role: Role): boolean {
  return can(role, "invoice:void");
}

/** Catat pembayaran (parsial/lunas): payment:record — Owner/Manager/STAFF. */
export function bolehMencatatBayar(role: Role): boolean {
  return can(role, "payment:record");
}

/** Buat/hapus draft: invoice:create (termasuk STAFF). */
export function bolehBuatDraft(role: Role): boolean {
  return can(role, "invoice:create");
}
