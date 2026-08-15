-- Irisan 3: master data
--
-- SEMUA STATEMENT ADD-ONLY (ALTER TABLE ... ADD COLUMN / CREATE TABLE).
-- Idempoten dijamin oleh journal migrasi drizzle (__drizzle_migrations):
-- tiap file dijalankan sekali.
--
-- Urutan penting:
--   1. ADD dulu semua kolom NULL + CHECK (tanpa default yang bisa gagal).
--   2. Backfill deterministik dari data existing (tanpa menebak).
--   3. Baru SET NOT NULL + SET DEFAULT.
--
-- VERIFIKASI TERHADAP 0000_unusual_rockslide.sql (dilakukan 2026-08-15,
-- bukan asumsi dari ERD):
--   - customers SUDAH PUNYA: npwp, alamat, top_hari, pph23_default, aktif
--     → HANYA legal_name yang ditambahkan.
--   - vendors SUDAH PUNYA: npwp, pph23_default, aktif
--     → yang ditambahkan: legal_name, vendor_type, payment_term,
--       payment_term_days (+ CHECK payment_term).
--   - charge_codes SUDAH PUNYA: butuh_vendor, kategori (+ enum
--     charge_code_kategori), aktif → TIDAK ditambahkan ulang.
--
-- Deviasi terdokumentasi (keputusan user, verifikasi handoff 2026-08-15):
--   - D2: "keterangan" TETAP, TIDAK di-rename. "name_id" ADD COLUMN baru,
--     nullable; diisi eksplisit per baris oleh pnpm db:seed dari
--     fixtures/charge-codes.csv (bukan diseragamkan/ditebak di migrasi).
--   - "category" NULLABLE dan TIDAK di-backfill 'INTERNAL' -- tebakan untuk
--     semua baris lama berisiko salah, bukan fakta dari sumber data.
--     Deviasi dari ERD, perlakuan sama seperti pph23_applicable (D5).

-- ============================================================================
-- 1. customers — hanya kolom yang benar-benar belum ada di 0000
-- ============================================================================

ALTER TABLE "customers" ADD COLUMN "legal_name" text;
--> statement-breakpoint

-- ============================================================================
-- 2. vendors — kolom ERD yang belum ada di DB (npwp/pph23_default/aktif
--    sudah ada sejak 0000)
-- ============================================================================

ALTER TABLE "vendors" ADD COLUMN "legal_name" text;
--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "vendor_type" text;
--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "payment_term" text;
--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "payment_term_days" integer;
--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "ck_vendor_payment_term" CHECK ("payment_term" IS NULL OR "payment_term" IN ('CASH', 'TEMPO'));
--> statement-breakpoint

-- ============================================================================
-- 3. charge_codes — kolom ERD baru + name_id (ADD COLUMN baru, bukan rename).
--    butuh_vendor, kategori, aktif SUDAH ADA sejak 0000 — tidak diulang.
-- ============================================================================

-- D2: "keterangan" TETAP tidak diubah. "name_id" kolom BARU nullable;
-- TIDAK di-backfill dari kode — diisi eksplisit oleh seed dari fixture.
ALTER TABLE "charge_codes" ADD COLUMN "name_id" text;
--> statement-breakpoint
-- Deviasi terdokumentasi: NULLABLE. Jangan menebak; seed mengisi eksplisit
-- per baris dari fixtures/charge-codes.csv.
ALTER TABLE "charge_codes" ADD COLUMN "category" text;
--> statement-breakpoint
ALTER TABLE "charge_codes" ADD COLUMN "default_leg" smallint;
--> statement-breakpoint
ALTER TABLE "charge_codes" ADD COLUMN "is_taxable" boolean;
--> statement-breakpoint
ALTER TABLE "charge_codes" ADD COLUMN "is_at_cost_default" boolean;
--> statement-breakpoint
-- UNKNOWN di fixture → false (default ERD). JANGAN menebak.
ALTER TABLE "charge_codes" ADD COLUMN "pph23_applicable" boolean;
--> statement-breakpoint
ALTER TABLE "charge_codes" ADD COLUMN "segment_scope" text;
--> statement-breakpoint
ALTER TABLE "charge_codes" ADD CONSTRAINT "ck_charge_code_segment_scope" CHECK ("segment_scope" IN ('DOM', 'EXIM', 'BOTH'));
--> statement-breakpoint

-- Backfill sebelum SET NOT NULL. Hanya nilai deterministik dari default ERD;
-- tidak ada menebak. name_id dan category TIDAK di-backfill di sini --
-- keduanya diisi eksplisit per baris oleh pnpm db:seed dari
-- fixtures/charge-codes.csv. butuh_vendor tidak perlu di-backfill: sudah
-- NOT NULL DEFAULT true sejak 0000.
UPDATE "charge_codes" SET
  "is_taxable"   = COALESCE("is_taxable", true),
  "is_at_cost_default" = COALESCE("is_at_cost_default", false),
  "pph23_applicable" = COALESCE("pph23_applicable", false),
  "segment_scope" = COALESCE("segment_scope", 'BOTH');
--> statement-breakpoint

-- ============================================================================
-- 4. port + ship_line — tabel baru sesuai ERD (aktif termasuk di dalamnya,
--    sesuai D1)
-- ============================================================================

CREATE TABLE IF NOT EXISTS "ports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kode" text,
  "nama" text NOT NULL,
  "negara" text NOT NULL DEFAULT 'ID',
  "aktif" boolean NOT NULL DEFAULT true,
  CONSTRAINT "ports_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "ship_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kode" text,
  "nama" text NOT NULL,
  "aktif" boolean NOT NULL DEFAULT true,
  CONSTRAINT "ship_lines_kode_unique" UNIQUE("kode")
);
--> statement-breakpoint

-- ============================================================================
-- 5. NOT NULL akhir (setelah backfill)
-- ============================================================================

ALTER TABLE "charge_codes" ALTER COLUMN "is_taxable" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "charge_codes" ALTER COLUMN "is_taxable" SET DEFAULT true;
--> statement-breakpoint
ALTER TABLE "charge_codes" ALTER COLUMN "is_at_cost_default" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "charge_codes" ALTER COLUMN "is_at_cost_default" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "charge_codes" ALTER COLUMN "pph23_applicable" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "charge_codes" ALTER COLUMN "pph23_applicable" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "charge_codes" ALTER COLUMN "segment_scope" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "charge_codes" ALTER COLUMN "segment_scope" SET DEFAULT 'BOTH';
