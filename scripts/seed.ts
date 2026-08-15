/*
 * Seed — data minimum supaya kerangka berjalan bisa dibuka.
 *
 * Ini BUKAN migrasi data historis. Ini hanya cukup untuk membuktikan bahwa
 * rantai browser → server → database → browser benar-benar tersambung,
 * PLUS 43 kode biaya resmi dari fixtures/charge-codes.csv (Irisan 3).
 *
 * Migrasi 75 job historis adalah Irisan 9, dan menunggu jawaban pertanyaan D1
 * (berkas SO BULAN *.xlsx yang belum diterima).
 *
 * Jalankan: pnpm db:seed   (idempoten — aman diulang)
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  chargeCodes,
  chargeLines,
  customers,
  jobs,
  ports,
  shipLines,
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
 * Customer/vendor demo untuk job contoh. Nama disalin PERSIS seperti di
 * berkas asli — normalisasi menunggu jawaban Q25, jangan ditebak.
 *
 * ⚠️ pph23_default TIDAK diisi (default kolom false): aturan pelanggan mana
 * yang dipotong PPh 23 BELUM diketahui (Q A1). Jangan menebak — DILARANG.
 */
const CUSTOMERS = [
  { nama: "TOTAL BANGUN PERSADA", topHari: 30 },
  { nama: "MATEREE NUSANTARA UTAMA", topHari: 30 },
  { nama: "PT DIAMETRAL INVOLUTE", topHari: 14 },
  { nama: "GLOBAL ANUGRAH LOGISTIK", topHari: 30 },
  { nama: "SINAR INDAH LOGISTIK", topHari: 30 },
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

// ---------------------------------------------------------------------------
// 43 kode biaya dari fixtures/charge-codes.csv (Irisan 3)
// ---------------------------------------------------------------------------

/**
 * Baca fixture CSV dan petakan ke baris charge_codes.
 *
 * Header asli fixture di disk (43 baris data):
 * code,name_id,category,default_leg,is_taxable,is_at_cost_default,
 * pph23_applicable,segment_scope,typical_vendor,catatan_verifikasi
 *
 * Aturan keras dari Irisan 3:
 * - kategori: SEMUA "OPSIONAL". Q76 (mana yang FIXED) BELUM dijawab Bu Niken.
 *   DILARANG menebak — termasuk untuk Ocean Freight yang "terlihat jelas".
 *   Fixture tidak punya kolom kategori → hardcode OPSIONAL.
 * - pph23_applicable (D5): UNKNOWN → false. FALSE → false.
 *   TRUE → hormati keputusan eksplisit fixture (jangan menebak sebaliknya).
 * - butuh_vendor: default true (ketat dulu), Q64 belum dijawab.
 * - default_reimburse: fixture tidak punya kolom ini → pakai default DB (false).
 */
function bacaChargeCodesDariCsv(): Array<typeof chargeCodes.$inferInsert> {
  const path = join(process.cwd(), "fixtures", "charge-codes.csv");
  const teks = readFileSync(path, "utf8");
  const baris = teks
    .split(/\r?\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);

  const header = baris[0]?.split(",") ?? [];
  const idx = (nama: string) => header.indexOf(nama);
  const iCode = idx("code");
  const iNama = idx("name_id");
  const iCategory = idx("category");
  const iLeg = idx("default_leg");
  const iTax = idx("is_taxable");
  const iAtCost = idx("is_at_cost_default");
  const iPph23 = idx("pph23_applicable");
  const iScope = idx("segment_scope");
  const iKet = idx("catatan_verifikasi");
  for (const [nama, i] of Object.entries({
    code: iCode,
    name_id: iNama,
    category: iCategory,
    default_leg: iLeg,
    is_taxable: iTax,
    is_at_cost_default: iAtCost,
    pph23_applicable: iPph23,
    segment_scope: iScope,
    catatan_verifikasi: iKet,
  })) {
    if (i === -1) throw new Error(`Kolom ${nama} tidak ada di charge-codes.csv`);
  }

  const boolCsv = (nilai: string | undefined, kode: string, kolom: string): boolean => {
    const v = nilai?.trim().toUpperCase();
    if (v === "TRUE") return true;
    if (v === "FALSE") return false;
    throw new Error(`${kolom} ${kode} bukan TRUE/FALSE: ${nilai}`);
  };

  const CATEGORY_VALID = new Set(["FREIGHT", "TERMINAL", "DARAT", "DOKUMEN", "INTERNAL"]);

  return baris.slice(1).map((baris) => {
    const sel = baris.split(",");
    const kode = sel[iCode]?.trim();
    const nameId = sel[iNama]?.trim();
    const category = sel[iCategory]?.trim();
    const scope = sel[iScope]?.trim();
    if (!kode || !nameId) throw new Error(`Baris CSV tidak valid: ${baris}`);
    if (!category || !CATEGORY_VALID.has(category)) {
      throw new Error(`category ${kode} tidak valid: ${category}`);
    }
    if (scope !== "DOM" && scope !== "EXIM" && scope !== "BOTH") {
      throw new Error(`segment_scope ${kode} tidak valid: ${scope}`);
    }
    const pph23 = sel[iPph23]?.trim().toUpperCase();
    if (pph23 !== "UNKNOWN" && pph23 !== "FALSE" && pph23 !== "TRUE") {
      throw new Error(`pph23_applicable ${kode} tidak valid: ${pph23}`);
    }
    const leg = sel[iLeg]?.trim();
    const defaultLeg = leg === "" ? null : Number(leg);
    if (defaultLeg !== null && (Number.isNaN(defaultLeg) || defaultLeg < 1 || defaultLeg > 3)) {
      throw new Error(`default_leg ${kode} tidak valid: ${leg}`);
    }
    // keterangan: kolom terakhir — gabungkan sisa sel kalau ada koma di dalamnya.
    // Kosong → fallback ke name_id karena kolom DB-nya NOT NULL.
    const ketCsv = sel.slice(iKet).join(",").trim();
    return {
      kode,
      nameId,
      keterangan: ketCsv !== "" ? ketCsv : nameId,
      // Q76 BELUM DIJAWAB — semua OPSIONAL sampai Bu Niken memutuskan.
      kategori: "OPSIONAL" as const,
      butuhVendor: true,
      aktif: true,
      category,
      defaultLeg,
      isTaxable: boolCsv(sel[iTax], kode, "is_taxable"),
      isAtCostDefault: boolCsv(sel[iAtCost], kode, "is_at_cost_default"),
      pph23Applicable: pph23 === "TRUE",
      segmentScope: scope,
    };
  });
}

/**
 * Baca fixture master kode (kolom: code,nama,catatan_verifikasi).
 * Dipakai ports.csv dan ship-lines.csv — keduanya punya bentuk sama.
 * Baris kosong dilewati; nilai di-trim. `catatan_verifikasi` sengaja tidak
 * dipetakan ke database karena hanya catatan review manusia (Q25).
 */
function bacaKodeDariCsv(
  namaFile: string,
): Array<{ kode: string; nama: string }> {
  const path = join(process.cwd(), "fixtures", namaFile);
  const teks = readFileSync(path, "utf8");
  const baris = teks
    .split(/\r?\n/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0);
  // baris[0] = header: code,nama,catatan_verifikasi
  const hasil: Array<{ kode: string; nama: string }> = [];
  for (const b of baris.slice(1)) {
    const sel = b.split(",");
    const kode = sel[0]?.trim();
    const nama = sel[1]?.trim();
    if (!kode || !nama) {
      throw new Error(`Baris tidak valid di ${namaFile}: "${b}"`);
    }
    hasil.push({ kode, nama });
  }
  return hasil;
}

async function main() {
  // users punya UNIQUE(email) → onConflictDoNothing benar-benar bekerja.
  await db.insert(users).values(USERS).onConflictDoNothing().returning();

  // customers & vendors TIDAK punya constraint unik pada `nama` →
  // onConflictDoNothing tidak pernah terpicu dan seed berulang membuat
  // duplikat (25 baris customers / 24 baris vendors ditemukan saat
  // verifikasi handoff). Cek keberadaan nama dulu sebelum insert.
  const sudahAdaCustomer = await db
    .select({ nama: customers.nama })
    .from(customers)
    .where(inArray(customers.nama, CUSTOMERS.map((c) => c.nama)));
  const setCustomerAda = new Set(sudahAdaCustomer.map((c) => c.nama));
  const customerBaru = CUSTOMERS.filter((c) => !setCustomerAda.has(c.nama));
  if (customerBaru.length > 0) {
    await db.insert(customers).values(customerBaru);
  }

  const sudahAdaVendor = await db
    .select({ nama: vendors.nama })
    .from(vendors)
    .where(inArray(vendors.nama, VENDORS));
  const setVendorAda = new Set(sudahAdaVendor.map((v) => v.nama));
  const vendorBaru = VENDORS.filter((n) => !setVendorAda.has(n));
  if (vendorBaru.length > 0) {
    await db.insert(vendors).values(vendorBaru.map((nama) => ({ nama })));
  }

  // Master pelabuhan & perusahaan pelayaran (Irisan 3).
  const daftarPorts = bacaKodeDariCsv("ports.csv");
  await db.insert(ports).values(daftarPorts).onConflictDoNothing();
  const daftarShipLines = bacaKodeDariCsv("ship-lines.csv");
  await db.insert(shipLines).values(daftarShipLines).onConflictDoNothing();

  const kodeBiaya = bacaChargeCodesDariCsv();
  if (kodeBiaya.length !== 43) {
    throw new Error(`Expected 43 charge codes from fixture, got ${kodeBiaya.length}`);
  }
  await db.insert(chargeCodes).values(kodeBiaya).onConflictDoNothing();

  // Satu job nyata supaya kerangka berjalan punya sesuatu untuk ditampilkan.
  // Lewati kalau sudah ada (seed diulang).
  const adaJob = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.jobNo, "ISLI-26.08-005"))
    .limit(1);

  if (adaJob.length === 0) {
    const [maker] = await db
      .select()
      .from(users)
      .where(eq(users.email, "indra@isli.co.id"))
      .limit(1);
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.nama, "TOTAL BANGUN PERSADA"))
      .limit(1);
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
  }

  const total = await db.select({ jumlah: chargeCodes.kode }).from(chargeCodes);
  const totalPorts = await db.select({ jumlah: ports.kode }).from(ports);
  const totalShips = await db.select({ jumlah: shipLines.kode }).from(shipLines);
  console.log(`✓ Seed selesai. charge_codes di database: ${total.length} baris.`);
  console.log(`  ports: ${totalPorts.length} baris, ship_lines: ${totalShips.length} baris.`);
  await client.end();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
