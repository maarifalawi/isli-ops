import type { db } from "@/db/index";
import { customers, jobs } from "@/db/schema/index";
import { writeAudit } from "@/lib/audit/index";
import { AuthorizationError, assertCan } from "@/lib/authz/index";
import {
  type JobSuffix,
  type SeqScope,
  allocateJobNumber,
  formatJobNumber,
} from "@/lib/job-number/index";
import { type PilihanLeg, validasiLeg } from "@/lib/job/leg-rules";
import { eq } from "drizzle-orm";

/*
 * Pembuatan job — Irisan 4a (schema sudah ada sejak migrasi 0000).
 *
 * Cakupan 4a: penomoran job + validasi kombinasi leg (R10) + kolom kurs USD
 * per job (R8.1, input manual, TANPA konversi). BUKAN cakupan 4a: editor
 * charge line, konversi kurs, at-cost, GP/GP%/NETT, realokasi. Semua nilai
 * uang tetap BIGINT rupiah; tidak ada aritmetika uang di sini.
 *
 * Pola (sama dengan src/lib/master-data):
 *   1. assertCan(role, "job:create")   — SATU pintu (ADR-0004)
 *   2. validasi input (termasuk R10)
 *   3. db.transaction: alokasi nomor (UPSERT counter, lihat allocator) →
 *      INSERT job → writeAudit (TEPAT 1 baris)
 *
 * R11 / Q19: tidak ada pelonggaran "0 leg". Semua job wajib >=1 leg. ck_legs
 * (drizzle/0000) tetap jadi backstop di DB.
 */

/** Tipe tx callback db.transaction. */
type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer T) => unknown
  ? T
  : never;
export type DbOrTx = typeof db | Tx;

export interface PelaksanaJob {
  id: string;
  role: "OWNER" | "MANAGER" | "STAFF";
}

export type HasilJob<T> = { ok: true; data: T } | { ok: false; error: string };

export const SERVICE_TYPES = ["FCL", "LCL", "AF"] as const;

export interface CreateJobInput {
  /** Segmen = seq_scope: DOM | EXP | IMP. */
  segmen: SeqScope;
  tahun: number;
  bulan: number;
  customerId: string;
  /** Kombinasi leg (R10). */
  legs: PilihanLeg;
  /** Wajib bila domestik menyimpang dari default 1+2+3 (R10). */
  legOverrideAlasan?: string | null;
  suffix?: JobSuffix | null;
  serviceType?: "FCL" | "LCL" | "AF" | null;
  rute?: string | null;
  vessel?: string | null;
  /** ETD (tanggal). Disimpan apa adanya; tanpa validasi lanjutan di 4a. */
  etd?: string | null;
  sales?: string | null;
  /**
   * Kurs USD PER JOB (R8.1). Kolom saja, input manual. `sellingUsd` = nilai
   * USD utuh (integer). `kursX100` = kurs dikali 100 (integer), mis. 18.200 →
   * 1_820_000. TIDAK ada konversi ke IDR di 4a.
   */
  sellingUsd?: number | bigint | null;
  kursX100?: number | bigint | null;
}

function teks(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

function gagal(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/** Integer bulat → bigint; tolak pecahan/NaN. null diteruskan. */
function bigintUtuh(
  v: number | bigint | null | undefined,
  label: string,
): { ok: true; value: bigint | null } | { ok: false; error: string } {
  if (v === null || v === undefined) return { ok: true, value: null };
  if (typeof v === "bigint") return { ok: true, value: v };
  if (!Number.isInteger(v)) {
    return { ok: false, error: `${label} harus bilangan bulat (tanpa pecahan).` };
  }
  return { ok: true, value: BigInt(v) };
}

/**
 * Buat job baru. Nomor dialokasikan di dalam transaksi yang sama dengan INSERT
 * (tidak pernah dihitung di memori aplikasi). Status awal DRAFT.
 */
export async function createJob(
  dbOrTx: DbOrTx,
  user: PelaksanaJob,
  input: CreateJobInput,
): Promise<HasilJob<{ id: string; jobNo: string; running: number }>> {
  // 1. Wewenang — satu pintu.
  try {
    assertCan(user.role, "job:create");
  } catch (e) {
    if (e instanceof AuthorizationError) return gagal(e.message);
    throw e;
  }

  // 2. Validasi dasar.
  if (!["DOM", "EXP", "IMP"].includes(input.segmen)) {
    return gagal("Segmen job harus DOM, EXP, atau IMP.");
  }
  if (!Number.isInteger(input.bulan) || input.bulan < 1 || input.bulan > 12) {
    return gagal("Bulan harus 1-12.");
  }
  if (!Number.isInteger(input.tahun) || input.tahun < 2000 || input.tahun > 2100) {
    return gagal("Tahun tidak masuk akal (harus 2000-2100).");
  }
  const customerId = teks(input.customerId);
  if (!customerId) return gagal("Customer wajib dipilih.");
  if (input.serviceType && !SERVICE_TYPES.includes(input.serviceType)) {
    return gagal("Jenis layanan harus FCL, LCL, atau AF.");
  }

  // 2b. Validasi kombinasi leg R10 (dua tingkat, lihat leg-rules).
  const legOk = validasiLeg(input.segmen, input.legs, input.legOverrideAlasan);
  if (!legOk.ok) return gagal(legOk.error);
  // Alasan hanya disimpan kalau memang menyimpang (perluAlasan). Kalau tidak
  // menyimpang, jangan simpan alasan usang.
  const legOverrideAlasan = legOk.perluAlasan ? teks(input.legOverrideAlasan) : null;

  // 2c. Kurs USD per job — kolom saja, integer, tanpa konversi.
  const usd = bigintUtuh(input.sellingUsd, "Nilai USD");
  if (!usd.ok) return gagal(usd.error);
  const kurs = bigintUtuh(input.kursX100, "Kurs (x100)");
  if (!kurs.ok) return gagal(kurs.error);

  return dbOrTx.transaction(async (tx) => {
    // Customer harus ada (pesan ramah; FK tetap backstop).
    const [cust] = await tx
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.id, customerId));
    if (!cust) return gagal("Customer tidak ditemukan.");

    // 3. Alokasi nomor di dalam transaksi (UPSERT counter, allocator).
    const running = await allocateJobNumber(tx, {
      scope: input.segmen,
      tahun: input.tahun,
      bulan: input.bulan,
    });
    const jobNo = formatJobNumber({
      year: input.tahun,
      month: input.bulan,
      running,
      ...(input.suffix ? { suffix: input.suffix } : {}),
    });

    const [baris] = await tx
      .insert(jobs)
      .values({
        seqScope: input.segmen,
        tahun: input.tahun,
        bulan: input.bulan,
        running,
        jobNo,
        suffix: input.suffix ?? null,
        customerId,
        legTrucking: input.legs.trucking,
        legFreight: input.legs.freight,
        legDelivery: input.legs.delivery,
        legOverrideAlasan,
        serviceType: input.serviceType ?? null,
        rute: teks(input.rute),
        vessel: teks(input.vessel),
        etd: teks(input.etd),
        sales: teks(input.sales),
        // Uang: default 0 (costing di 4b). Tidak diisi dari input di 4a.
        sellingUsd: usd.value,
        kursX100: kurs.value,
        makerId: user.id,
        // status default DRAFT dari skema.
      })
      .returning();

    await writeAudit(tx, {
      userId: user.id,
      aksi: "CREATE",
      entitas: "JOB",
      entitasId: baris?.id ?? null,
      sesudah: baris,
      alasan: legOverrideAlasan
        ? `Buat job ${jobNo}; override leg: ${legOverrideAlasan}`
        : `Buat job ${jobNo}`,
    });

    return {
      ok: true,
      data: { id: baris?.id ?? "", jobNo, running },
    };
  });
}

/** Pembacaan sederhana untuk halaman server component. */
export async function daftarJob(dbOrTx: DbOrTx) {
  return dbOrTx.select().from(jobs).orderBy(jobs.createdAt);
}
