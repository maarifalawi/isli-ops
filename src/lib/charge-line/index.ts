import type { db } from "@/db/index";
import { chargeCodes, chargeLines, jobs } from "@/db/schema/index";
import { writeAudit } from "@/lib/audit/index";
import { AuthorizationError, assertCan } from "@/lib/authz/index";
import { konversiUsdKeIdr } from "@/lib/money/index";
import { and, eq, isNull } from "drizzle-orm";
import {
  type ChargeLineFields,
  validasiChargeLine,
  validasiCurrencyNative,
} from "./validation";

/*
 * CRUD charge line per job — Irisan 4b.
 *
 * Cakupan: tambah/ubah/hapus (soft delete) baris biaya di satu job, dengan:
 *   - assertCan(role, "job:edit")   — SATU pintu (ADR-0004, RBAC job.edit_draft)
 *   - validasi at-cost R4.3 + leg R10 + currency (validation.ts, lapis aplikasi)
 *   - validasi vendor wajib R15 (charge_codes.butuh_vendor, lapis DB)
 *   - transaksi + TEPAT 1 baris audit per aksi (pola src/lib/master-data)
 *
 * DI LUAR CAKUPAN 4b (jangan dibangun di sini): konversi kurs USD->IDR,
 * hitung GP/GP%/NETT, realokasi biaya antar job (4c-4e). currency hanya
 * penanda tampilan; nilai disimpan apa adanya.
 *
 * BATASAN DISENGAJA (Irisan 5, bukan 4b): pembatasan "STAFF hanya boleh
 * mengedit job miliknya" dan "job FINAL terkunci" BELUM ditegakkan di sini.
 * Keduanya bagian approval/state-machine (R6.3, RBAC job.edit_draft "sendiri").
 * assertCan("job:edit") sudah menolak peran tak berwenang; sisanya menyusul.
 *
 * Semua uang bigint rupiah bulat (ADR-0002). Tidak ada float, tidak ada
 * aritmetika uang inline selain SUM sederhana yang tidak ada di sini.
 */

/** Tipe tx callback db.transaction. */
type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer T) => unknown
  ? T
  : never;
export type DbOrTx = typeof db | Tx;

export interface PelaksanaChargeLine {
  id: string;
  role: "OWNER" | "MANAGER" | "STAFF";
}

export type HasilChargeLine<T> = { ok: true; data: T } | { ok: false; error: string };

/** Input satu baris biaya. Uang boleh number bulat atau bigint; pecahan ditolak. */
export interface ChargeLineInput {
  jobId: string;
  /** PK TEXT charge_codes.kode. */
  chargeCode: string;
  vendorId?: string | null;
  keterangan?: string | null;
  sellingIdr?: number | bigint | null;
  pencadanganIdr?: number | bigint | null;
  /*
   * Irisan 4c — nilai NATIVE USD (utuh, bukan sen). Diisi HANYA saat
   * currency='USD'. Untuk currency='IDR' harus kosong. actualUsd opsional
   * (realisasi belum ada saat baris dibuat).
   */
  sellingUsd?: number | bigint | null;
  pencadanganUsd?: number | bigint | null;
  actualUsd?: number | bigint | null;
  isReimburse?: boolean;
  isAtCost?: boolean;
  leg?: number | null;
  currency?: string | null;
  urutan?: number | null;
}

function teks(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

function gagal(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function salahWewenang(e: unknown): { ok: false; error: string } {
  if (e instanceof AuthorizationError) return gagal(e.message);
  throw e;
}

function cekWewenang(
  role: PelaksanaChargeLine["role"],
): { ok: false; error: string } | null {
  try {
    assertCan(role, "job:edit");
    return null;
  } catch (e) {
    return salahWewenang(e);
  }
}

/** Integer bulat → bigint; tolak pecahan/NaN. null/undefined → 0n. */
function rupiahUtuh(
  v: number | bigint | null | undefined,
  label: string,
): { ok: true; value: bigint } | { ok: false; error: string } {
  if (v === null || v === undefined) return { ok: true, value: 0n };
  if (typeof v === "bigint") return { ok: true, value: v };
  if (!Number.isInteger(v)) {
    return { ok: false, error: `${label} harus bilangan bulat rupiah (tanpa pecahan).` };
  }
  if (!Number.isSafeInteger(v)) {
    return {
      ok: false,
      error: `${label} di luar rentang aman; pakai nilai lebih kecil.`,
    };
  }
  return { ok: true, value: BigInt(v) };
}

/**
 * Integer USD utuh → bigint; tolak pecahan/NaN. null/undefined → null
 * (dibiarkan kosong, dibedakan dari 0 yang berarti "nol dolar").
 */
function usdUtuh(
  v: number | bigint | null | undefined,
  label: string,
): { ok: true; value: bigint | null } | { ok: false; error: string } {
  if (v === null || v === undefined) return { ok: true, value: null };
  if (typeof v === "bigint") return { ok: true, value: v };
  if (!Number.isInteger(v)) {
    return { ok: false, error: `${label} harus bilangan bulat USD (tanpa sen).` };
  }
  if (!Number.isSafeInteger(v)) {
    return {
      ok: false,
      error: `${label} di luar rentang aman; pakai nilai lebih kecil.`,
    };
  }
  return { ok: true, value: BigInt(v) };
}

/**
 * Nilai charge line yang sudah dinormalkan + siap tulis ke DB.
 * Hasil validasi bersama create & update (DRY).
 */
interface NilaiTervalidasi {
  chargeCode: string;
  vendorId: string | null;
  keterangan: string | null;
  /** SELALU IDR murni. Untuk baris USD ini hasil konversi (kurs job dibekukan). */
  sellingIdr: bigint;
  pencadanganIdr: bigint;
  actualIdr: bigint | null;
  /** Native USD (utuh). null untuk baris IDR. */
  sellingUsd: bigint | null;
  pencadanganUsd: bigint | null;
  actualUsd: bigint | null;
  isReimburse: boolean;
  isAtCost: boolean;
  leg: number | null;
  currency: string;
  urutan: number;
}

/**
 * Validasi + normalisasi satu charge line di dalam transaksi.
 *
 * Menegakkan (selain aturan murni validation.ts):
 *   - charge_code WAJIB ada di master & aktif;
 *   - R15: kalau charge_codes.butuh_vendor true → vendor_id WAJIB terisi
 *     (lapis aplikasi, R15.4). Q64 belum dijawab → default butuh_vendor true.
 */
async function validasiDenganMaster(
  tx: Tx,
  input: ChargeLineInput,
): Promise<{ ok: true; nilai: NilaiTervalidasi } | { ok: false; error: string }> {
  const kode = teks(input.chargeCode)?.toUpperCase();
  if (!kode) return gagal("Kode biaya wajib dipilih.");

  const leg = input.leg ?? null;
  const currency = teks(input.currency)?.toUpperCase() ?? "IDR";
  const isReimburse = input.isReimburse ?? false;
  const isAtCost = input.isAtCost ?? false;

  // Nilai USD native (utuh). Untuk baris IDR ini akan null.
  const sUsd = usdUtuh(input.sellingUsd, "Nilai jual USD");
  if (!sUsd.ok) return gagal(sUsd.error);
  const pUsd = usdUtuh(input.pencadanganUsd, "Nilai beli USD");
  if (!pUsd.ok) return gagal(pUsd.error);
  const aUsd = usdUtuh(input.actualUsd, "Nilai aktual USD");
  if (!aUsd.ok) return gagal(aUsd.error);

  /*
   * Sumber kebenaran *_idr:
   *   - Baris IDR : diambil dari input sellingIdr/pencadanganIdr (utuh).
   *   - Baris USD : DIHITUNG dari *_usd × kurs job (kurs dibekukan di baris ini).
   *     Input sellingIdr/pencadanganIdr diabaikan untuk baris USD supaya tidak
   *     ada dua sumber angka yang bisa berbeda diam-diam.
   */
  let sellingIdrVal: bigint;
  let pencadanganIdrVal: bigint;
  let actualIdrVal: bigint | null;

  if (currency === "USD") {
    // R8.1 — kurs per job WAJIB terisi sebelum baris USD boleh dibuat/diubah.
    const [jobRow] = await tx
      .select({ kursX100: jobs.kursX100 })
      .from(jobs)
      .where(eq(jobs.id, input.jobId));
    if (!jobRow) return gagal("Job tidak ditemukan.");
    if (jobRow.kursX100 === null || jobRow.kursX100 === undefined) {
      return gagal(
        "Job ini belum punya kurs USD. Isi kurs USD job terlebih dahulu sebelum " +
          "menambah baris biaya dalam USD (R8.1).",
      );
    }

    // Validasi mata uang native (at-cost dalam USD, wajib isi, non-negatif).
    const nativeCheck = validasiCurrencyNative({
      sellingIdr: 0n,
      pencadanganIdr: 0n,
      isAtCost,
      leg,
      currency,
      sellingUsd: sUsd.value,
      pencadanganUsd: pUsd.value,
      actualUsd: aUsd.value,
    });
    if (!nativeCheck.ok) return gagal(nativeCheck.error);

    // sUsd/pUsd dijamin non-null oleh validasiCurrencyNative di atas.
    const kurs = jobRow.kursX100;
    sellingIdrVal = konversiUsdKeIdr(sUsd.value as bigint, kurs);
    pencadanganIdrVal = konversiUsdKeIdr(pUsd.value as bigint, kurs);
    actualIdrVal = aUsd.value === null ? null : konversiUsdKeIdr(aUsd.value, kurs);
  } else {
    // Baris IDR — *_usd wajib kosong (validasiCurrencyNative), *_idr dari input.
    const nativeCheck = validasiCurrencyNative({
      sellingIdr: 0n,
      pencadanganIdr: 0n,
      isAtCost,
      leg,
      currency,
      sellingUsd: sUsd.value,
      pencadanganUsd: pUsd.value,
      actualUsd: aUsd.value,
    });
    if (!nativeCheck.ok) return gagal(nativeCheck.error);

    const selling = rupiahUtuh(input.sellingIdr, "Nilai jual");
    if (!selling.ok) return gagal(selling.error);
    const pencadangan = rupiahUtuh(input.pencadanganIdr, "Nilai beli (pencadangan)");
    if (!pencadangan.ok) return gagal(pencadangan.error);
    sellingIdrVal = selling.value;
    pencadanganIdrVal = pencadangan.value;
    actualIdrVal = null;
  }

  const fields: ChargeLineFields = {
    sellingIdr: sellingIdrVal,
    pencadanganIdr: pencadanganIdrVal,
    isAtCost,
    leg,
    currency,
  };
  const dasar = validasiChargeLine(fields);
  if (!dasar.ok) return gagal(dasar.error);

  // charge_code harus ada + aktif; ambil butuh_vendor untuk R15.
  const [kodeRow] = await tx
    .select({ aktif: chargeCodes.aktif, butuhVendor: chargeCodes.butuhVendor })
    .from(chargeCodes)
    .where(eq(chargeCodes.kode, kode));
  if (!kodeRow) return gagal(`Kode biaya "${kode}" tidak ditemukan.`);
  if (!kodeRow.aktif) return gagal(`Kode biaya "${kode}" sudah nonaktif.`);

  const vendorId = teks(input.vendorId);
  // R15.4 — vendor wajib bila kode menandai butuh_vendor (default true, Q64).
  if (kodeRow.butuhVendor && !vendorId) {
    return gagal(
      `Kode biaya "${kode}" wajib menyebut vendor. Pilih vendor terlebih dahulu (R15).`,
    );
  }

  return {
    ok: true,
    nilai: {
      chargeCode: kode,
      vendorId,
      keterangan: teks(input.keterangan),
      sellingIdr: sellingIdrVal,
      pencadanganIdr: pencadanganIdrVal,
      actualIdr: actualIdrVal,
      sellingUsd: currency === "USD" ? (sUsd.value as bigint) : null,
      pencadanganUsd: currency === "USD" ? (pUsd.value as bigint) : null,
      actualUsd: currency === "USD" ? aUsd.value : null,
      isReimburse,
      isAtCost,
      leg,
      currency,
      urutan: input.urutan ?? 0,
    },
  };
}

/**
 * TAMBAH baris biaya ke job. Status awal apa adanya (belum ada workflow di 4b).
 * Transaksi: pastikan job ada → validasi → INSERT → writeAudit (1 baris).
 */
export async function createChargeLine(
  dbOrTx: DbOrTx,
  user: PelaksanaChargeLine,
  input: ChargeLineInput,
): Promise<HasilChargeLine<{ id: string }>> {
  const tolak = cekWewenang(user.role);
  if (tolak) return tolak;
  const jobId = teks(input.jobId);
  if (!jobId) return gagal("Job wajib dipilih.");

  return dbOrTx.transaction(async (tx) => {
    const [job] = await tx.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, jobId));
    if (!job) return gagal("Job tidak ditemukan.");

    const val = await validasiDenganMaster(tx, { ...input, jobId });
    if (!val.ok) return gagal(val.error);
    const n = val.nilai;

    const [baris] = await tx
      .insert(chargeLines)
      .values({
        jobId,
        chargeCode: n.chargeCode,
        vendorId: n.vendorId,
        keterangan: n.keterangan,
        sellingIdr: n.sellingIdr,
        pencadanganIdr: n.pencadanganIdr,
        actualIdr: n.actualIdr,
        sellingUsd: n.sellingUsd,
        pencadanganUsd: n.pencadanganUsd,
        actualUsd: n.actualUsd,
        isReimburse: n.isReimburse,
        isAtCost: n.isAtCost,
        leg: n.leg,
        currency: n.currency,
        urutan: n.urutan,
        createdBy: user.id,
      })
      .returning();

    await writeAudit(tx, {
      userId: user.id,
      aksi: "CREATE",
      entitas: "CHARGE_LINE",
      entitasId: baris?.id ?? null,
      sesudah: baris,
    });
    return { ok: true, data: { id: baris?.id ?? "" } };
  });
}

/**
 * UBAH baris biaya. Tidak boleh mengubah jobId (baris pindah job = realokasi,
 * itu 4e). Baris yang sudah dihapus (deleted_at terisi) tidak bisa diubah.
 */
export async function updateChargeLine(
  dbOrTx: DbOrTx,
  user: PelaksanaChargeLine,
  id: string,
  input: Omit<ChargeLineInput, "jobId">,
): Promise<HasilChargeLine<{ id: string }>> {
  const tolak = cekWewenang(user.role);
  if (tolak) return tolak;
  const lineId = teks(id);
  if (!lineId) return gagal("Baris biaya tidak valid.");

  return dbOrTx.transaction(async (tx) => {
    const [sebelum] = await tx
      .select()
      .from(chargeLines)
      .where(eq(chargeLines.id, lineId));
    if (!sebelum) return gagal("Baris biaya tidak ditemukan.");
    if (sebelum.deletedAt) return gagal("Baris biaya sudah dihapus; tidak bisa diubah.");

    const val = await validasiDenganMaster(tx, { ...input, jobId: sebelum.jobId });
    if (!val.ok) return gagal(val.error);
    const n = val.nilai;

    const [sesudah] = await tx
      .update(chargeLines)
      .set({
        chargeCode: n.chargeCode,
        vendorId: n.vendorId,
        keterangan: n.keterangan,
        sellingIdr: n.sellingIdr,
        pencadanganIdr: n.pencadanganIdr,
        actualIdr: n.actualIdr,
        sellingUsd: n.sellingUsd,
        pencadanganUsd: n.pencadanganUsd,
        actualUsd: n.actualUsd,
        isReimburse: n.isReimburse,
        isAtCost: n.isAtCost,
        leg: n.leg,
        currency: n.currency,
        urutan: n.urutan,
        updatedAt: new Date(),
      })
      .where(eq(chargeLines.id, lineId))
      .returning();

    await writeAudit(tx, {
      userId: user.id,
      aksi: "EDIT",
      entitas: "CHARGE_LINE",
      entitasId: lineId,
      sebelum,
      sesudah,
    });
    return { ok: true, data: { id: lineId } };
  });
}

/**
 * HAPUS baris biaya — SOFT DELETE (set deleted_at). Tidak pernah DELETE keras
 * (kewajiban simpan 10 tahun). Alasan WAJIB (writeAudit menegakkan).
 */
export async function hapusChargeLine(
  dbOrTx: DbOrTx,
  user: PelaksanaChargeLine,
  id: string,
  alasan: string,
): Promise<HasilChargeLine<{ id: string }>> {
  const tolak = cekWewenang(user.role);
  if (tolak) return tolak;
  const lineId = teks(id);
  if (!lineId) return gagal("Baris biaya tidak valid.");
  const alasanBersih = teks(alasan);
  if (!alasanBersih) return gagal("Alasan hapus wajib diisi.");

  return dbOrTx.transaction(async (tx) => {
    const [sebelum] = await tx
      .select()
      .from(chargeLines)
      .where(eq(chargeLines.id, lineId));
    if (!sebelum) return gagal("Baris biaya tidak ditemukan.");
    if (sebelum.deletedAt) return gagal("Baris biaya sudah dihapus.");

    const [sesudah] = await tx
      .update(chargeLines)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(chargeLines.id, lineId))
      .returning();

    await writeAudit(tx, {
      userId: user.id,
      aksi: "HAPUS",
      entitas: "CHARGE_LINE",
      entitasId: lineId,
      sebelum,
      sesudah,
      alasan: alasanBersih,
    });
    return { ok: true, data: { id: lineId } };
  });
}

/** Daftar baris biaya aktif (belum dihapus) untuk satu job, urut `urutan`. */
export async function daftarChargeLine(dbOrTx: DbOrTx, jobId: string) {
  return dbOrTx
    .select()
    .from(chargeLines)
    .where(and(eq(chargeLines.jobId, jobId), isNull(chargeLines.deletedAt)))
    .orderBy(chargeLines.urutan);
}
