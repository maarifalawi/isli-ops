"use server";

/*
 * Server action invoice vendor — Irisan 10 Item 5 (UI AP).
 *
 * Wrapper TIPIS atas service Irisan 7 (src/lib/vendor-invoice/index.ts):
 * TIDAK ada logika state machine/authz/audit yang ditulis ulang — semua
 * guard (assertCan, R-A1, guard status-lama, ON CONFLICT R7.1) tetap di
 * service (terkunci 30 test integrasi).
 *
 * Dua action READ khusus untuk hard requirement HANDOFF-IRISAN-7:
 *   - actionCekNomorMirip (V-INV-2): dipanggil client secara debounced
 *     saat user mengetik nomor — peringatan tampil SEBELUM submit.
 *   - actionLihatStatusPembayaran (V-INV-3): memuat snapshot sebelum
 *     tombol Bayar dirender (gating di ./gating.ts, dikunci unit test).
 */

import { db } from "@/db/index";
import { requireUser } from "@/lib/session/index";
import {
  batalkanInvoiceVendor,
  bayarInvoiceVendor,
  bukaKunciDibayar,
  daftarInvoiceVendor,
  lihatStatusPembayaran,
  terimaInvoiceVendor,
  verifikasiInvoiceVendor,
} from "@/lib/vendor-invoice/index";
import { revalidatePath } from "next/cache";

export type HasilVendorInvoiceAction =
  | { ok: true; status: string }
  | { ok: false; error: string };

function bungkus(hasil: {
  ok: boolean;
  error?: string;
  data?: unknown;
}): HasilVendorInvoiceAction {
  if (!hasil.ok) return { ok: false, error: hasil.error ?? "Gagal." };
  revalidatePath("/invoice-vendor");
  return { ok: true, status: String((hasil.data as { status?: string })?.status ?? "") };
}

function teks(fd: FormData, nama: string): string {
  return String(fd.get(nama) ?? "");
}

/** Terima invoice vendor (D2: O/M/S). Peringatan nomor mirip dari service dikembalikan via hasil terima. */
export async function actionTerimaInvoiceVendor(
  fd: FormData,
): Promise<
  { ok: true; id: string; peringatanNomorMirip: string[] } | { ok: false; error: string }
> {
  const user = await requireUser();
  const jumlah = teks(fd, "jumlahIdr").trim();
  const pph = teks(fd, "pph23Idr").trim();
  const hasil = await terimaInvoiceVendor(db, user, {
    vendorId: teks(fd, "vendorId"),
    vendorInvoiceNo: teks(fd, "vendorInvoiceNo"),
    tanggalInvoice: teks(fd, "tanggalInvoice"),
    jumlahIdr: BigInt(jumlah === "" || Number.isNaN(Number(jumlah)) ? "-1" : jumlah),
    ...(pph !== "" && !Number.isNaN(Number(pph)) ? { pph23Idr: BigInt(pph) } : {}),
  });
  if (!hasil.ok) return { ok: false, error: hasil.error };
  revalidatePath("/invoice-vendor");
  return {
    ok: true,
    id: hasil.data.id,
    peringatanNomorMirip: hasil.data.peringatanNomorMirip,
  };
}

/** V-INV-2: cek nomor mirip SEBELUM submit — dipanggil debounced dari client. */
export async function actionCekNomorMirip(
  vendorId: string,
  vendorInvoiceNo: string,
): Promise<string[]> {
  await requireUser();
  const semua = await daftarInvoiceVendor(db, vendorId);
  const nomor = vendorInvoiceNo.trim();
  if (nomor === "") return [];
  const { jarakLevenshtein } = await import("@/lib/similarity/index");
  return semua
    .filter((r) => r.vendorInvoiceNo !== nomor)
    .filter((r) => jarakLevenshtein(r.vendorInvoiceNo, nomor) <= 2)
    .map((r) => r.vendorInvoiceNo);
}

/** V-INV-3: snapshot status pembayaran — dipanggil SEBELUM tombol Bayar dirender. */
export async function actionLihatStatusPembayaran(vendorInvoiceId: string) {
  await requireUser();
  const s = await lihatStatusPembayaran(db, vendorInvoiceId);
  if (!s) return null;
  return {
    vendorInvoiceNo: s.vendorInvoiceNo,
    status: s.status,
    jumlahIdr: s.jumlahIdr.toString(),
    dibayarAt: s.dibayarAt ? s.dibayarAt.toISOString() : null,
  };
}

/** Verifikasi (D3: O/M; R-A1 verifier != penerima — service). */
export async function actionVerifikasiInvoiceVendor(
  fd: FormData,
): Promise<HasilVendorInvoiceAction> {
  const user = await requireUser();
  const baris: { chargeLineId: string; jumlahIdr: bigint }[] = [];
  for (const pasangan of teks(fd, "baris").split(";")) {
    const [id, jumlah] = pasangan.split("|");
    if (!id || !jumlah) continue;
    baris.push({ chargeLineId: id, jumlahIdr: BigInt(jumlah) });
  }
  return bungkus(
    await verifikasiInvoiceVendor(db, user, {
      vendorInvoiceId: teks(fd, "vendorInvoiceId"),
      baris,
    }),
  );
}

/** Bayar (V-INV-3: UI wajib tampilkan status dulu — gating.ts). */
export async function actionBayarInvoiceVendor(
  fd: FormData,
): Promise<HasilVendorInvoiceAction> {
  const user = await requireUser();
  return bungkus(await bayarInvoiceVendor(db, user, teks(fd, "vendorInvoiceId")));
}

/** Batal (R-A5: OWNER saja + alasan wajib — service). */
export async function actionBatalkanInvoiceVendor(
  fd: FormData,
): Promise<HasilVendorInvoiceAction> {
  const user = await requireUser();
  return bungkus(
    await batalkanInvoiceVendor(
      db,
      user,
      teks(fd, "vendorInvoiceId"),
      teks(fd, "alasan"),
    ),
  );
}

/** Buka kunci DIBAYAR (R-A5: OWNER saja + alasan — service). */
export async function actionBukaKunciDibayar(
  fd: FormData,
): Promise<HasilVendorInvoiceAction> {
  const user = await requireUser();
  return bungkus(
    await bukaKunciDibayar(db, user, teks(fd, "vendorInvoiceId"), teks(fd, "alasan")),
  );
}
