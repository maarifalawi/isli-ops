import type { db } from "@/db/index";
import { auditLog } from "@/db/schema/index";

/*
 * Helper penulisan jejak audit (audit_log).
 *
 * Aturan main (.clinerules, RENCANA-IRISAN-3-CRUD §4-§5):
 * - 1 mutasi = TEPAT 1 baris audit_log, ditulis di transaksi yang sama dengan
 *   mutasinya. Mutasi tanpa baris audit = bug.
 * - Append-only: DILARANG memanggil update/delete pada tabel audit_log di
 *   seluruh codebase.
 * - Nilai kolom mengikuti skema AKTUAL (drizzle), BUKAN ERD.md:
 *   aksi, entitas, entitas_id, sebelum, sesudah, alasan (bahasa Indonesia).
 * - entitas_id bertipe uuid, padahal PK charge_codes adalah TEXT (kode).
 *   Untuk entitas CHARGE_CODE: entitasId = null; kodenya terekam di JSON
 *   sebelum/sesudah (dan di alasan bila perlu).
 *
 * CATATAN REVOKE (OPEN-QUESTION, RENCANA §5):
 * Komentar di src/db/schema/index.ts menyebut
 *   REVOKE UPDATE, DELETE ON audit_log FROM app_role;
 * tetapi grep drizzle/*.sql TIDAK menemukan `app_role` maupun `REVOKE` —
 * role DB itu belum pernah dibuat. Keputusan: JANGAN mengarang role/migrasi
 * baru; append-only ditegakkan lewat disiplin kode + test (tidak ada satu pun
 * update/delete terhadap auditLog), dan REVOKE menyusul bersama setup role DB.
 */

/**
 * Aksi mutasi yang dicatat ke audit_log (RENCANA §4).
 *
 * "HAPUS" ditambahkan Irisan 4b: soft delete charge line (set deleted_at),
 * bukan DELETE keras. Alasan WAJIB, sama seperti NONAKTIFKAN.
 *
 * "REALOKASI" ditambahkan Irisan 4e (Q06, ADR-0006): pengajuan pemindahan
 * biaya antar job. Alasan tertulis WAJIB — sama seperti NONAKTIFKAN/HAPUS.
 *
 * Delapan aksi transisi state machine ditambahkan Irisan 5 (J-INV-6: setiap
 * transisi wajib 1 baris audit; keputusan user Q-IRIS5-7, 17 Agu 2026 — aksi
 * SPESIFIK per transisi, bukan STATE_CHANGE generik):
 *   SUBMIT · CANCEL · APPROVE_L1 · REJECT · APPROVE_FINAL ·
 *   REQUEST_UNLOCK · UNLOCK_GRANTED · UNLOCK_DENIED
 * Alasan WAJIB untuk REJECT, REQUEST_UNLOCK, UNLOCK_DENIED (Q-IRIS5-7);
 * opsional untuk SUBMIT/CANCEL/APPROVE_L1/APPROVE_FINAL/UNLOCK_GRANTED.
 */
export const AKSI_AUDIT = [
  "CREATE",
  "EDIT",
  "NONAKTIFKAN",
  "AKTIFKAN",
  "HAPUS",
  "REALOKASI",
  "SUBMIT",
  "CANCEL",
  "APPROVE_L1",
  "REJECT",
  "APPROVE_FINAL",
  "REQUEST_UNLOCK",
  "UNLOCK_GRANTED",
  "UNLOCK_DENIED",
] as const;
export type AksiAudit = (typeof AKSI_AUDIT)[number];

/**
 * Entitas yang diaudit (RENCANA §4; "JOB" Irisan 4a; "CHARGE_LINE" Irisan 4b;
 * "COST_REALLOCATION" Irisan 4e).
 */
export const ENTITAS_AUDIT = [
  "CUSTOMER",
  "VENDOR",
  "PORT",
  "SHIP_LINE",
  "CHARGE_CODE",
  "JOB",
  "CHARGE_LINE",
  "COST_REALLOCATION",
] as const;

export type EntitasAudit = (typeof ENTITAS_AUDIT)[number];

/**
 * `db` maupun `tx` hasil `db.transaction` sama-sama punya `.insert`,
 * jadi helper ini menerima keduanya.
 */
type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface AuditInput {
  /** id user dari session (users.id). */
  userId: string;
  aksi: AksiAudit;
  entitas: EntitasAudit;
  /** uuid PK baris; null untuk CHARGE_CODE (PK-nya TEXT, lihat catatan di atas). */
  entitasId?: string | null;
  /** Baris SEBELUM mutasi (objek penuh, tanpa filter). null/undefined untuk CREATE. */
  sebelum?: unknown;
  /** Baris SESUDAH mutasi (objek penuh, tanpa filter). null/undefined untuk NONAKTIFKAN bila memakai sesudah=null? Tidak -- selalu isi. */
  sesudah?: unknown;
  /** WAJIB untuk NONAKTIFKAN, HAPUS, REALOKASI, REJECT, REQUEST_UNLOCK, UNLOCK_DENIED; opsional lainnya. */
  alasan?: string | null;
}

/**
 * Serialisasi snapshot baris menjadi JSON text (atau null bila kosong).
 *
 * BigInt (kolom uang rupiah, mis. selling_idr / kurs_x100) tidak bisa
 * di-JSON.stringify secara langsung — ditulis sebagai STRING desimal apa
 * adanya supaya nilai penuhnya tersimpan tanpa kehilangan presisi (tidak
 * pernah diubah jadi float).
 */
function toJsonText(nilai: unknown): string | null {
  if (nilai === undefined || nilai === null) return null;
  return JSON.stringify(nilai, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
}

/**

 * Tulis satu baris audit_log. HARUS dipanggil di dalam transaksi yang sama
 * dengan mutasinya supaya atomik: mutasi gagal → audit tidak tertulis,
 * audit gagal → mutasi ikut rollback.
 */
export async function writeAudit(txOrDb: DbOrTx, input: AuditInput) {
  if (
    (input.aksi === "NONAKTIFKAN" ||
      input.aksi === "HAPUS" ||
      input.aksi === "REALOKASI" ||
      input.aksi === "REJECT" ||
      input.aksi === "REQUEST_UNLOCK" ||
      input.aksi === "UNLOCK_DENIED") &&
    !input.alasan?.trim()
  ) {
    throw new Error(`writeAudit: alasan WAJIB untuk aksi ${input.aksi}.`);
  }

  return txOrDb.insert(auditLog).values({
    userId: input.userId,
    aksi: input.aksi,
    entitas: input.entitas,
    entitasId: input.entitasId ?? null,
    sebelum: toJsonText(input.sebelum),
    sesudah: toJsonText(input.sesudah),
    alasan: input.alasan ?? null,
  });
}
