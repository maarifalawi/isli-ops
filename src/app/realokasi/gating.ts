import { type Role, can } from "@/lib/authz/index";

/*
 * Gating UI realokasi — Irisan 10 Item 8. Murni; service 4e tetap penjaga
 * otoritatif (cap, FINAL-lock, ≠ pembuat R-A1, audit).
 */

/** Ajukan: job:edit — semua peran (termasuk STAFF). */
export function bolehMengajukan(role: Role): boolean {
  return can(role, "job:edit");
}

/** Setujui/tolak: job:reallocate — MANAGER/OWNER saja. */
export function bolehMenyetujui(role: Role): boolean {
  return can(role, "job:reallocate");
}
