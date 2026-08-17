/*
 * State machine invoice vendor (AP) — Irisan 7 (pure functions, TANPA database).
 *
 * Sumber kebenaran: docs/STATE-MACHINE.md §3. DILARANG membuat status atau
 * transisi baru di luar tabel TRANSISI_VENDOR_INVOICE di bawah — kalau dirasa
 * perlu, itu perubahan dokumen dulu, baru kode.
 *
 * Mapping nama (keputusan user D1, 17 Agu 2026 — pola Q-IRIS5-2 & konflik
 * #1/#2 Irisan 6: SKEMA MENANG, dokumen menyusul):
 *   RECEIVED  = DITERIMA
 *   VERIFIED  = DIVERIFIKASI
 *   PAID      = DIBAYAR
 *   CANCELLED/REJECTED/DISPUTED/AWAITING_VENDOR = DIBATALKAN
 *     (dilipat ke satu state terminal; kasus nyata — ditolak, dispute,
 *     minta revisi ke vendor — dibedakan lewat kolom `alasan` di audit_log,
 *     bukan lewat state tambahan. TIDAK ada state APPROVED_TO_PAY/
 *     DISPUTED/AWAITING_VENDOR/REJECTED — skema 4-state menang.)
 *
 * Mapping peran (keputusan user D2): "AP Staff" = STAFF (hanya receive),
 * "Finance Manager" = MANAGER. Verify = O/M (D3, aksi verifikasi finansial).
 *
 * Perilaku terminal:
 *   - DIBAYAR: terminal kecuali unlock_paid oleh OWNER dengan alasan (R-A5).
 *     Kembalikan DIVERIFIKASI = invoice boleh dibayar ulang setelah koreksi.
 *   - DIBATALKAN: terminal mutlak.
 *
 * Transisi yang TIDAK ada (sengaja, D1): dispute/request_revision/receive_revision
 * sebagai state — jalur revisi vendor = batal (DIBATALKAN, junction dihapus,
 * actual di-reset) lalu receive ulang nomor baru (dokumen §3 receive_revision:
 * "nomor invoice baru dari vendor").
 */

import type { Action } from "../authz/index";

/** Nilai enum `vendor_invoice_status` (skema + migrasi 0000). */
export const VENDOR_INVOICE_STATUS = [
  "DITERIMA",
  "DIVERIFIKASI",
  "DIBAYAR",
  "DIBATALKAN",
] as const;
export type VendorInvoiceStatus = (typeof VENDOR_INVOICE_STATUS)[number];

/** Empat aksi transisi (persis STATE-MACHINE.md §3 hasil D1 — tidak ada yang lain). */
export const AKSI_VENDOR_INVOICE = ["verify", "pay", "batal", "unlock_paid"] as const;
export type AksiVendorInvoice = (typeof AKSI_VENDOR_INVOICE)[number];

export interface BarisTransisiVendorInvoice {
  readonly dari: VendorInvoiceStatus;
  readonly aksi: AksiVendorInvoice;
  readonly ke: VendorInvoiceStatus;
}

/**
 * Tabel transisi — SATU-SATUNYA tempat mendefinisikan alur hidup invoice
 * vendor. `receive` bukan transisi (INSERT baru berstatus DITERIMA, bukan
 * perubahan status baris yang sudah ada).
 */
export const TRANSISI_VENDOR_INVOICE: readonly BarisTransisiVendorInvoice[] = [
  { dari: "DITERIMA", aksi: "verify", ke: "DIVERIFIKASI" },
  { dari: "DIVERIFIKASI", aksi: "pay", ke: "DIBAYAR" },
  /* D1: batal dari state mana pun sebelum DIBATALKAN, dengan alasan (R-A5). */
  { dari: "DITERIMA", aksi: "batal", ke: "DIBATALKAN" },
  { dari: "DIVERIFIKASI", aksi: "batal", ke: "DIBATALKAN" },
  /* R-A5: HANYA OWNER (vendor_invoice:unlock_paid) yang bisa buka kunci DIBAYAR. */
  { dari: "DIBAYAR", aksi: "unlock_paid", ke: "DIVERIFIKASI" },
];

/**
 * Izin authz per aksi (ADR-0004 — satu pintu `assertCan`).
 * - verify  = vendor_invoice:verify (O/M — D3; STAFF ✗, aksi finansial).
 * - pay     = vendor_invoice:mark_paid (O/M).
 * - batal   = vendor_invoice:unlock_paid (OWNER SAJA — R-A5: "Hanya OWNER
 *   yang bisa membatalkan"; konsisten void invoice & unlock job = Owner only).
 * - unlock_paid = vendor_invoice:unlock_paid (OWNER SAJA — R-A5).
 */
export const IZIN_PER_AKSI_VENDOR_INVOICE: Readonly<Record<AksiVendorInvoice, Action>> = {
  verify: "vendor_invoice:verify",
  pay: "vendor_invoice:mark_paid",
  batal: "vendor_invoice:unlock_paid",
  unlock_paid: "vendor_invoice:unlock_paid",
};

/** Status tujuan bila transisi sah; null bila tidak. */
export function canTransitionVendorInvoice(
  dari: VendorInvoiceStatus,
  aksi: AksiVendorInvoice,
): VendorInvoiceStatus | null {
  for (const t of TRANSISI_VENDOR_INVOICE) {
    if (t.dari === dari && t.aksi === aksi) return t.ke;
  }
  return null;
}

/** Sama seperti canTransitionVendorInvoice tapi melempar Error informatif. */
export function statusTujuanVendorInvoice(
  dari: VendorInvoiceStatus,
  aksi: AksiVendorInvoice,
): VendorInvoiceStatus {
  const ke = canTransitionVendorInvoice(dari, aksi);
  if (ke === null) {
    throw new Error(
      `Transisi tidak sah: invoice vendor berstatus ${dari} tidak bisa menerima aksi "${aksi}". Lihat docs/STATE-MACHINE.md §3.`,
    );
  }
  return ke;
}

/** V-INV-4: DIBAYAR = actual terkunci (beku, tidak bisa diubah). */
export function isDibayar(status: VendorInvoiceStatus): boolean {
  return status === "DIBAYAR";
}

/** DIBATALKAN terminal mutlak (D1) — tidak ada transisi keluar. */
export function isDibatalkan(status: VendorInvoiceStatus): boolean {
  return status === "DIBATALKAN";
}

/**
 * Status invoice vendor yang menjadikan charge line terkait "terverifikasi"
 * (punya link junction aktif yang menjaga actual_idr — guard D7 di
 * src/lib/charge-line). DIBATALKAN tidak termasuk: junction baris batal
 * sebelum bayar dihapus & actual di-reset, jadi tidak mengunci apa pun.
 */
export function mengunciActual(status: VendorInvoiceStatus): boolean {
  return status === "DIVERIFIKASI" || status === "DIBAYAR";
}
