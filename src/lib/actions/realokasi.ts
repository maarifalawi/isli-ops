"use server";

/*
 * Server action realokasi — Irisan 10 Item 8. Wrapper TIPIS atas service
 * Irisan 4e (src/lib/realokasi): TIDAK ada logika validasi/cap/FINAL-lock/
 * audit yang ditulis ulang — semuanya tetap di service (terkunci test 4e).
 */

import { db } from "@/db/index";
import { ajukanRealokasi, setujuiRealokasi, tolakRealokasi } from "@/lib/realokasi/index";
import { requireUser } from "@/lib/session/index";
import { revalidatePath } from "next/cache";

export type HasilRealokasiAction = { ok: true } | { ok: false; error: string };

function teks(fd: FormData, nama: string): string {
  return String(fd.get(nama) ?? "").trim();
}

function bungkus(hasil: { ok: boolean; error?: string }): HasilRealokasiAction {
  if (!hasil.ok) return { ok: false, error: hasil.error ?? "Gagal." };
  revalidatePath("/realokasi");
  return { ok: true };
}

/** Ajukan proposal (job:edit — termasuk STAFF; guard cap/FINAL di service). */
export async function actionAjukanRealokasi(fd: FormData): Promise<HasilRealokasiAction> {
  const user = await requireUser();
  const jumlah = teks(fd, "jumlahIdr");
  if (jumlah === "" || !/^\d+$/.test(jumlah)) {
    return { ok: false, error: "Jumlah realokasi harus angka bulat rupiah." };
  }
  return bungkus(
    await ajukanRealokasi(db, user, {
      originChargeLineId: teks(fd, "originChargeLineId"),
      originJobId: teks(fd, "originJobId"),
      destinationJobId: teks(fd, "destinationJobId"),
      jumlahIdr: BigInt(jumlah),
      alasan: teks(fd, "alasan"),
    }),
  );
}

/** Setujui proposal PENDING (job:reallocate M/O; ≠ pembuat R-A1 — service). */
export async function actionSetujuiRealokasi(
  fd: FormData,
): Promise<HasilRealokasiAction> {
  const user = await requireUser();
  return bungkus(await setujuiRealokasi(db, user, teks(fd, "proposalId")));
}

/** Tolak proposal PENDING (job:reallocate; alasan wajib — service). */
export async function actionTolakRealokasi(fd: FormData): Promise<HasilRealokasiAction> {
  const user = await requireUser();
  return bungkus(
    await tolakRealokasi(db, user, teks(fd, "proposalId"), teks(fd, "alasan")),
  );
}
