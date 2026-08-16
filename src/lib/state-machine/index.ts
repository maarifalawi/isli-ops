/*
 * State machine job — Irisan 5 (pure functions, TANPA database).
 *
 * Sumber kebenaran: docs/STATE-MACHINE.md §1. DILARANG membuat status atau
 * transisi baru di luar tabel TRANSISI di bawah — kalau dirasa perlu, itu
 * perubahan dokumen dulu, baru kode.
 *
 * Mapping nama (keputusan user Q-IRIS5-2, 17 Agu 2026 — skema = sumber
 * kebenaran, dokumen menyusul):
 *   SUBMITTED   = DIAJUKAN
 *   APPROVED_L1 = DISETUJUI_1
 *   CANCELLED   = DIBATALKAN
 *   DRAFT, FINAL, UNLOCK_REQUESTED = sama (UNLOCK_REQUESTED ditambahkan ke
 *   enum job_status lewat migrasi 0005 — keputusan Q-IRIS5-1: state nyata,
 *   bukan turunan cost_reopen_requests).
 *
 * Predikat (keputusan Q-IRIS5-8):
 *   isFinal    = hanya FINAL      → dasar cek J-INV-3/J-INV-4 (sisi invoice).
 *   isLocked   = FINAL | DIBATALKAN → guard realokasi (Irisan 4e) — dua state
 *                terminal sama-sama membekukan angka.
 *   isEditable = hanya DRAFT      → guard edit charge line / header / kurs
 *                (Irisan 4b/5). Setelah diajukan, angka beku sampai dikembalikan.
 */

/** Nilai enum `job_status` (skema + migrasi 0005). */
export const JOB_STATUS = [
  "DRAFT",
  "DIAJUKAN",
  "DISETUJUI_1",
  "FINAL",
  "UNLOCK_REQUESTED",
  "DIBATALKAN",
] as const;
export type JobStatus = (typeof JOB_STATUS)[number];

/** Delapan aksi transisi (persis STATE-MACHINE.md §1 — tidak ada yang lain). */
export const AKSI_TRANSISI = [
  "submit",
  "cancel",
  "approve_l1",
  "reject",
  "approve_final",
  "request_unlock",
  "unlock_granted",
  "unlock_denied",
] as const;
export type AksiTransisi = (typeof AKSI_TRANSISI)[number];

/**
 * Tabel transisi — SATU-SATUNYA tempat mendefinisikan alur hidup job.
 * Baris = transisi yang sah; selainnya DITOLAK.
 */
export interface BarisTransisi {
  readonly dari: JobStatus;
  readonly aksi: AksiTransisi;
  readonly ke: JobStatus;
}

export const TRANSISI: readonly BarisTransisi[] = [
  { dari: "DRAFT", aksi: "submit", ke: "DIAJUKAN" },
  { dari: "DRAFT", aksi: "cancel", ke: "DIBATALKAN" },
  { dari: "DIAJUKAN", aksi: "approve_l1", ke: "DISETUJUI_1" },
  { dari: "DIAJUKAN", aksi: "reject", ke: "DRAFT" },
  { dari: "DISETUJUI_1", aksi: "approve_final", ke: "FINAL" },
  { dari: "DISETUJUI_1", aksi: "reject", ke: "DRAFT" },
  { dari: "FINAL", aksi: "request_unlock", ke: "UNLOCK_REQUESTED" },
  { dari: "UNLOCK_REQUESTED", aksi: "unlock_granted", ke: "DRAFT" },
  { dari: "UNLOCK_REQUESTED", aksi: "unlock_denied", ke: "FINAL" },
];

/**
 * Izin authz per aksi (ADR-0004 — satu pintu `assertCan`).
 * unlock_granted dan unlock_denied sama-sama `job:unlock` (hanya OWNER,
 * RBAC.md) — keputusan keputusan vs penolakan dibedakan service-nya, bukan izinnya.
 */
export const IZIN_PER_AKSI: Readonly<Record<AksiTransisi, string>> = {
  submit: "job:submit",
  cancel: "job:cancel",
  approve_l1: "job:approve_first",
  reject: "job:reject",
  approve_final: "job:approve_final",
  request_unlock: "job:request_unlock",
  unlock_granted: "job:unlock",
  unlock_denied: "job:unlock",
};

/**
 * Status tujuan bila transisi sah; null bila tidak.
 * Fungsi murni — dipakai service transisi DAN test matriks penuh.
 */
export function canTransition(dari: JobStatus, aksi: AksiTransisi): JobStatus | null {
  for (const t of TRANSISI) {
    if (t.dari === dari && t.aksi === aksi) return t.ke;
  }
  return null;
}

/** Sama seperti canTransition tapi melempar Error informatif untuk transisi invalid. */
export function statusTujuan(dari: JobStatus, aksi: AksiTransisi): JobStatus {
  const ke = canTransition(dari, aksi);
  if (ke === null) {
    throw new Error(
      `Transisi tidak sah: job berstatus ${dari} tidak bisa menerima aksi "${aksi}". Lihat docs/STATE-MACHINE.md.`,
    );
  }
  return ke;
}

/** Hanya FINAL (dasar cek J-INV-3/J-INV-4 — unlock vs invoice ISSUED/PAID). */
export function isFinal(status: JobStatus): boolean {
  return status === "FINAL";
}

/**
 * FINAL dan DIBATALKAN — dua state terminal; angka beku (keputusan Q-IRIS5-8).
 * Dipakai guard realokasi 4e (asal & tujuan).
 */
export function isLocked(status: JobStatus): boolean {
  return status === "FINAL" || status === "DIBATALKAN";
}

/**
 * Hanya DRAFT yang boleh diedit (charge line, header, kurs) — keputusan
 * Q-IRIS5-8: begitu diajukan, angka beku sampai dikembalikan (reject/unlock).
 */
export function isEditable(status: JobStatus): boolean {
  return status === "DRAFT";
}
