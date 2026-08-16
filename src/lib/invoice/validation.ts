/*
 * Validasi murni invoice customer — Irisan 6 (TANPA database).
 *
 * Fungsi-fungsi di sini diekspor untuk unit test dan dipakai service di
 * index.ts. Semua keputusan R3.5/R9.2/R9.4/R-A1 ditegakkan eksplisit di sini
 * supaya bisa diuji tanpa DB — pola charge-line/validation.ts.
 */

import type { Rupiah } from "../money/index";
import type { JobStatus } from "../state-machine/index";
import { terbilang } from "../terbilang/index";

/** Bentuk tipis konteks job yang dibutuhkan validasi create draft. */
export interface KonteksJobUntukInvoice {
  readonly status: JobStatus;
  /** R9.4: tanggal POD diterima (dari draft invoice), null bila belum. */
  readonly podDiterimaAt: Date | string | null;
}

export type HasilValidasi = { ok: true } | { ok: false; error: string };

function gagalV(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/**
 * R9.4 + R9.4b: job FINAL dan (POD ada ATAU jalur early-issue disetujui
 * OWNER ≠ pembuat). Dipisah per pertanyaan supaya pesan error spesifik.
 */
export function validasiSyaratTerbit(
  job: KonteksJobUntukInvoice,
  opts: {
    issuedBeforePod: boolean;
    earlyIssueApprovedBy: string | null;
    pembuatId: string;
    approverRole: "OWNER" | "MANAGER" | "STAFF" | null;
  },
): HasilValidasi {
  if (job.status !== "FINAL") {
    return gagalV(
      `Job berstatus ${job.status} — invoice hanya boleh dibuat untuk job FINAL (R9.4).`,
    );
  }
  if (!opts.issuedBeforePod) {
    if (job.podDiterimaAt === null || job.podDiterimaAt === undefined) {
      return gagalV(
        "POD belum diterima — invoice tidak boleh dibuat (R9.4). Catat tanggal POD, atau gunakan jalur khusus terbit-dulu (R9.4b) dengan izin Owner.",
      );
    }
    return { ok: true };
  }
  // Jalur R9.4b: wajib approver OWNER ≠ pembuat (Q78 default defensif).
  if (!opts.earlyIssueApprovedBy) {
    return gagalV(
      "Terbit sebelum POD (R9.4b) wajib nama pemberi izin (Owner) — jalur khusus, bukan pelonggaran R9.4.",
    );
  }
  if (opts.approverRole !== "OWNER") {
    return gagalV("Pemberi izin terbit-dulu wajib OWNER (Q78 default defensif).");
  }
  if (opts.earlyIssueApprovedBy === opts.pembuatId) {
    return gagalV(
      "Pembuat tidak boleh menyetujui pekerjaannya sendiri (R-A1). Minta orang lain yang menyetujui.",
    );
  }
  return { ok: true };
}

/**
 * validasiIssue: invoice DRAFT + ada baris selling aktif + dueDate terisi.
 * Charge lines kosong ditolak — invoice nol tidak boleh tercipta diam-diam.
 */
export function validasiIssue(
  statusInvoice: string,
  jumlahBarisSellingAktif: number,
  dueDate: string | null,
): HasilValidasi {
  if (statusInvoice !== "DRAFT") {
    return gagalV(
      `Invoice berstatus ${statusInvoice} — hanya DRAFT yang bisa diterbitkan (I-INV-1).`,
    );
  }
  if (jumlahBarisSellingAktif === 0) {
    return gagalV(
      "Job tidak punya baris selling aktif — invoice tidak bisa diterbitkan dari data kosong.",
    );
  }
  if (!dueDate || dueDate.trim() === "") {
    return gagalV(
      "Tanggal jatuh tempo wajib diisi manual oleh Finance (R9.2) — tidak dihitung otomatis.",
    );
  }
  return { ok: true };
}

/**
 * R3.5: PPh 23 hanya boleh berasal dari centang manual Finance. Fungsi ini
 * SENGAJA tidak menerima konteks customer/job — satu-satunya input boolean
 * eksplisit. Menerima context apa pun akan menggoda pemanggil menyerahkan
 * "disimpulkan dari data", dan itu dilarang (Q04: aturannya belum diketahui).
 */
export function validasiPph23(pph23Applied: boolean): boolean {
  return typeof pph23Applied === "boolean";
}

/**
 * Terbilang grand total — dibungkus supaya service tinggal memanggil satu
 * tempat (ADR-0005 poin 5: dihasilkan saat issue dan DISIMPAN, bukan render).
 */
export function hitungTerbilang(grandTotalIdr: Rupiah): string {
  return terbilang(grandTotalIdr);
}
