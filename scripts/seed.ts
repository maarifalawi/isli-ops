/*
 * Seed — data minimum supaya kerangka berjalan bisa dibuka.
 *
 * Ini BUKAN migrasi data historis. Ini hanya cukup untuk membuktikan bahwa
 * rantai browser → server → database → browser benar-benar tersambung.
 *
 * Migrasi 75 job historis adalah Irisan 9, dan menunggu jawaban pertanyaan D1
 * (berkas SO BULAN *.xlsx yang belum diterima).
 *
 * Jalankan: pnpm db:seed
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  chargeCodes,
  chargeLines,
  customers,
  jobs,
  users,
  vendors,
} from "../src/db/schema/index";

const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("DIRECT_URL atau DATABASE_URL belum diisi.");

const client = postgres(url, { max: 1 });
const db = drizzle(client);

/**
 * 4 akun sesuai keterangan klien: Pak Indra, manajer, 2 staf.
 *
 * PENTING: baris ini hanya mengisi tabel `users` (peran/RBAC). Supaya
 * mereka bisa benar-benar LOGIN, akun Supabase Auth dengan email yang SAMA
 * PERSIS harus dibuat juga (Supabase Studio > Authentication > Add user,
 * atau lewat script terpisah) -- lihat `src/lib/session/index.ts`, yang
 * mencocokkan berdasarkan email. Tanpa akun Supabase Auth, baris `users`
 * ini ada tapi tidak ada seorang pun yang bisa masuk memakainya.
 */
const USERS = [
  { email: "indra@isli.co.id", nama: "Pak Indra", role: "OWNER" as const },
  { email: "niken@isli.co.id", nama: "Bu Niken", role: "MANAGER" as const },
  { email: "fairol@isli.co.id", nama: "Fairol", role: "STAFF" as const },
  { email: "lana@isli.co.id", nama: "Lana", role: "STAFF" as const },
];

/*
 * Nama customer dan vendor disalin PERSIS seperti tertulis di berkas asli,
 * termasuk ejaannya yang tidak konsisten. Normalisasi menunggu jawaban
 * pertanyaan C5 — kita belum tahu apakah METTA dan META LINTAS itu satu
 * perusahaan yang sama atau dua yang berbeda.
 */
const CUSTOMERS = [
  { nama: "TOTAL BANGUN PERSADA", topHari: 30, pph23Default: false },
  { nama: "MATEREE NUSANTARA UTAMA", topHari: 30, pph23Default: false },
  { nama: "PT DIAMETRAL INVOLUTE", topHari: 14, pph23Default: true },
  { nama: "GLOBAL ANUGRAH LOGISTIK", topHari: 30, pph23Default: false },
  { nama: "SINAR INDAH LOGISTIK", topHari: 30, pph23Default: false },
];

const VENDORS = [
  "ICON",
  "SPIL",
  "TEMAS",
  "MERATUS",
  "SMT",
  "DANISH",
  "METTA",
  "BANGUN RAYA",
];

/** Sebagian dari 43 kode yang ditemukan. Sisanya masuk saat migrasi. */
const CHARGE_CODES = [
  { kode: "OF", keterangan: "Ocean Freight", defaultReimburse: false },
  { kode: "BL", keterangan: "Bill of Lading", defaultReimburse: false },
  { kode: "THC", keterangan: "Terminal Handling Charge", defaultReimburse: false },
  { kode: "LOLO", keterangan: "Lift On Lift Off", defaultReimburse: true },
  { kode: "LSS", keterangan: "Low Sulphur Surcharge", defaultReimburse: false },
  { kode: "THD", keterangan: "Terminal Handling Destination", defaultReimburse: false },
  { kode: "CLEANING", keterangan: "Cleaning container", defaultReimburse: false },
  { kode: "TRUCKING", keterangan: "Trucking", defaultReimburse: false },
  { kode: "DOORING", keterangan: "Dooring", defaultReimburse: false },
  { kode: "HANDLING", keterangan: "Handling operasional", defaultReimburse: false },
  { kode: "SEGEL", keterangan: "Segel container", defaultReimburse: false },
  { kode: "MATERAI", keterangan: "Materai", defaultReimburse: false },
  { kode: "DELIVERY", keterangan: "Delivery", defaultReimburse: false },
];

async function main() {
  const insertedUsers = await db.insert(users).values(USERS).returning();

  const insertedCustomers = await db.insert(customers).values(CUSTOMERS).returning();

  await db.insert(vendors).values(VENDORS.map((nama) => ({ nama })));

  await db.insert(chargeCodes).values(CHARGE_CODES);

  // Satu job nyata supaya kerangka berjalan punya sesuatu untuk ditampilkan.
  const maker = insertedUsers[0];
  const customer = insertedCustomers[0];
  if (!maker || !customer) throw new Error("Seed gagal: data dasar kosong.");

  const [job] = await db
    .insert(jobs)
    .values({
      seqScope: "DOM",
      tahun: 2026,
      bulan: 8,
      running: 5,
      jobNo: "ISLI-26.08-005",
      customerId: customer.id,
      legTrucking: true,
      legFreight: true,
      legDelivery: true,
      serviceType: "FCL",
      rute: "JKT-BTM",
      vessel: "KM. ICON IBRANI V.81",
      etd: "2026-08-14",
      sales: "KIM",
      sellingIdr: 38_000_000n,
      ppnIdr: 418_000n,
      status: "DRAFT",
      makerId: maker.id,
    })
    .returning();

  if (!job) throw new Error("Seed gagal: job tidak terbuat.");

  await db.insert(chargeLines).values([
    { jobId: job.id, chargeCode: "OF", pencadanganIdr: 9_577_000n, urutan: 1 },
    { jobId: job.id, chargeCode: "BL", pencadanganIdr: 200_000n, urutan: 2 },
    { jobId: job.id, chargeCode: "THC", pencadanganIdr: 4_805_000n, urutan: 3 },
    { jobId: job.id, chargeCode: "LSS", pencadanganIdr: 5_100_000n, urutan: 4 },
    { jobId: job.id, chargeCode: "THD", pencadanganIdr: 2_600_000n, urutan: 5 },
  ]);
  await client.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
