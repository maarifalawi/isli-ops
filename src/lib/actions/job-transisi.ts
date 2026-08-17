"use server";

/*
 * Server action transisi status job — Irisan 10 Item 4 (UI aksi state-machine).
 *
 * Wrapper TIPIS atas service Irisan 5 (src/lib/state-machine/transisi.ts):
 * TIDAK ada logika izin/guard/audit yang ditulis ulang di sini — assertCan,
 * tabel transisi, R-A1, approval_cycle, berita acara R6.4, dan audit tetap
 * semuanya di service (terkunci 28 test integrasi).
 *
 * Pola sama dengan src/lib/actions/job.ts: requireUser → panggil service →
 * revalidatePath → kembalikan { ok, status | error } untuk UI.
 */

import { db } from "@/db/index";
import { requireUser } from "@/lib/session/index";
import {
  approveFinal,
  approveL1,
  cancelJob,
  rejectJob,
  requestUnlock,
  submitJob,
  unlockDenied,
  unlockGranted,
} from "@/lib/state-machine/transisi";
import { revalidatePath } from "next/cache";

export type HasilTransisiAction =
  | { ok: true; status: string }
  | { ok: false; error: string };

type HasilService = { ok: true; data: { status: string } } | { ok: false; error: string };

function bungkus(jobId: string, hasil: HasilService): HasilTransisiAction {
  if (!hasil.ok) return { ok: false, error: hasil.error };
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  return { ok: true, status: hasil.data.status };
}

function teks(fd: FormData, nama: string): string {
  return String(fd.get(nama) ?? "");
}

/** DRAFT → DIAJUKAN (hanya Maker; syarat baris biaya Q-IRIS5-6 di service). */
export async function actionSubmitJob(fd: FormData): Promise<HasilTransisiAction> {
  const user = await requireUser();
  const jobId = teks(fd, "jobId");
  return bungkus(jobId, await submitJob(db, user, jobId));
}

/** DRAFT → DIBATALKAN (STAFF hanya miliknya; tanpa invoice aktif — service). */
export async function actionBatalkanJob(fd: FormData): Promise<HasilTransisiAction> {
  const user = await requireUser();
  const jobId = teks(fd, "jobId");
  const alasan = teks(fd, "alasan");
  return bungkus(jobId, await cancelJob(db, user, jobId, alasan === "" ? null : alasan));
}

/** DIAJUKAN → DISETUJUI_1 (Manager/Owner, ≠ maker — R-A1 di service). */
export async function actionSetujuiL1(fd: FormData): Promise<HasilTransisiAction> {
  const user = await requireUser();
  const jobId = teks(fd, "jobId");
  return bungkus(jobId, await approveL1(db, user, jobId));
}

/** DIAJUKAN|DISETUJUI_1 → DRAFT (alasan wajib; cycle naik — R6.2 di service). */
export async function actionKembalikanJob(fd: FormData): Promise<HasilTransisiAction> {
  const user = await requireUser();
  const jobId = teks(fd, "jobId");
  return bungkus(jobId, await rejectJob(db, user, jobId, teks(fd, "alasan")));
}

/** DISETUJUI_1 → FINAL (Owner, ≠ maker — R-A2/R-A1 di service). */
export async function actionSetujuiFinal(fd: FormData): Promise<HasilTransisiAction> {
  const user = await requireUser();
  const jobId = teks(fd, "jobId");
  return bungkus(jobId, await approveFinal(db, user, jobId));
}

/** FINAL → UNLOCK_REQUESTED (Manager/Owner; alasan + berita acara wajib R6.4). */
export async function actionMintaUnlock(fd: FormData): Promise<HasilTransisiAction> {
  const user = await requireUser();
  const jobId = teks(fd, "jobId");
  return bungkus(
    jobId,
    await requestUnlock(
      db,
      user,
      jobId,
      teks(fd, "alasan"),
      teks(fd, "beritaAcaraFileUrl"),
    ),
  );
}

/** UNLOCK_REQUESTED → DRAFT (Owner, ≠ pengaju; invoice terbit memblokir — J-INV-3/4). */
export async function actionBukaKunci(fd: FormData): Promise<HasilTransisiAction> {
  const user = await requireUser();
  const jobId = teks(fd, "jobId");
  return bungkus(jobId, await unlockGranted(db, user, jobId, teks(fd, "alasan")));
}

/** UNLOCK_REQUESTED → FINAL (Owner, ≠ pengaju; alasan wajib). */
export async function actionTolakUnlock(fd: FormData): Promise<HasilTransisiAction> {
  const user = await requireUser();
  const jobId = teks(fd, "jobId");
  return bungkus(jobId, await unlockDenied(db, user, jobId, teks(fd, "alasan")));
}
