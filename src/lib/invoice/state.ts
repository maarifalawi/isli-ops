/*
 * State machine invoice customer — Irisan 6 (pure functions, TANPA database).
 *
 * Sumber kebenaran: docs/STATE-MACHINE.md §2. DILARANG membuat status atau
 * transisi baru di luar tabel TRANSISI_INVOICE di bawah — kalau dirasa perlu,
 * itu perubahan dokumen dulu, baru kode.
 *
 * Mapping nama (keputusan user 17 Agu 2026, pola Q-IRIS5-2 — skema = sumber
 * kebenaran):
 *   ISSUED         = TERBIT
 *   SENT           = TERKIRIM
 *   PARTIALLY_PAID = TERBAYAR_SEBAGIAN  (konflik #2: state proper di enum,
 *                    bukan derivasi payment_in)
 *   PAID           = LUNAS
 *   CANCELLED      = BATAL
 *   DRAFT          = DRAFT
 *
 * Izin per aksi (keputusan user 17 Agu 2026):
 *   - issue/send = invoice:issue (OWNER/MANAGER — "Finance" dokumen = dua
 *     peran ini; STAFF ✗ sesuai RBAC.md invoice.issue).
 *   - void       = invoice:void (OWNER SAJA — konflik #1: RBAC/kode menang,
 *     "Finance Manager" di STATE-MACHINE.md diperbaiki ke OWNER. Void invoice
 *     = aksi uang serius, konsisten approve_final/unlock = Owner only).
 *   - pay_*      = payment.record (O/M/S sesuai RBAC.md).
 *   OVERDUE BUKAN status — turunan tanggal (I-INV-5), jangan simpan.
 */

import type { Action } from "../authz/index";

/** Nilai enum `invoice_status` (skema + migrasi Irisan 6). */
export const INVOICE_STATUS = [
  "DRAFT",
  "TERBIT",
  "TERKIRIM",
  "TERBAYAR_SEBAGIAN",
  "LUNAS",
  "BATAL",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUS)[number];

/** Enam aksi transisi (persis STATE-MACHINE.md §2 — tidak ada yang lain). */
export const AKSI_INVOICE = ["issue", "send", "void", "pay_partial", "pay_full"] as const;
export type AksiInvoice = (typeof AKSI_INVOICE)[number];

export interface BarisTransisiInvoice {
  readonly dari: InvoiceStatus;
  readonly aksi: AksiInvoice;
  readonly ke: InvoiceStatus;
}

/** Tabel transisi — SATU-SATUNYA tempat mendefinisikan alur hidup invoice. */
export const TRANSISI_INVOICE: readonly BarisTransisiInvoice[] = [
  { dari: "DRAFT", aksi: "issue", ke: "TERBIT" },
  { dari: "TERBIT", aksi: "send", ke: "TERKIRIM" },
  { dari: "TERBIT", aksi: "void", ke: "BATAL" },
  { dari: "TERKIRIM", aksi: "pay_partial", ke: "TERBAYAR_SEBAGIAN" },
  { dari: "TERKIRIM", aksi: "pay_full", ke: "LUNAS" },
  { dari: "TERBAYAR_SEBAGIAN", aksi: "pay_full", ke: "LUNAS" },
];

/**
 * Izin authz per aksi (ADR-0004 — satu pintu `assertCan`).
 * Void = invoice:void → hanya OWNER yang memilikinya di PERMISSIONS, jadi
 * penolakan MANAGER/STAFF ditegakkan otomatis tanpa cek peran di service.
 */
export const IZIN_PER_AKSI_INVOICE: Readonly<Record<AksiInvoice, Action>> = {
  issue: "invoice:issue",
  send: "invoice:issue",
  void: "invoice:void",
  pay_partial: "payment:record",
  pay_full: "payment:record",
};

/** Status tujuan bila transisi sah; null bila tidak. */
export function canTransitionInvoice(
  dari: InvoiceStatus,
  aksi: AksiInvoice,
): InvoiceStatus | null {
  for (const t of TRANSISI_INVOICE) {
    if (t.dari === dari && t.aksi === aksi) return t.ke;
  }
  return null;
}

/** Sama seperti canTransitionInvoice tapi melempar Error informatif. */
export function statusTujuanInvoice(
  dari: InvoiceStatus,
  aksi: AksiInvoice,
): InvoiceStatus {
  const ke = canTransitionInvoice(dari, aksi);
  if (ke === null) {
    throw new Error(
      `Transisi tidak sah: invoice berstatus ${dari} tidak bisa menerima aksi "${aksi}". Lihat docs/STATE-MACHINE.md §2.`,
    );
  }
  return ke;
}

/** I-INV-1: TERBIT ke atas = angka pajak beku. */
export function isIssued(status: InvoiceStatus): boolean {
  return (
    status === "TERBIT" ||
    status === "TERKIRIM" ||
    status === "TERBAYAR_SEBAGIAN" ||
    status === "LUNAS"
  );
}

/** I-INV-3: LUNAS terminal — tidak ada jalan kembali. */
export function isPaid(status: InvoiceStatus): boolean {
  return status === "LUNAS";
}

/** DRAFT = masih boleh edit / hard delete (keputusan user 17 Agu 2026). */
export function isEditable(status: InvoiceStatus): boolean {
  return status === "DRAFT";
}

/** Status yang membuat job tidak boleh di-unlock (J-INV-3/4 sisi job). */
export function mengunciJob(status: InvoiceStatus): boolean {
  return status !== "DRAFT" && status !== "BATAL";
}
