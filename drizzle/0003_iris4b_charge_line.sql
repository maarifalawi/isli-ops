-- Irisan 4b: editor charge line + at-cost (R4.3) + leg per baris (R10).
--
-- SEMUA STATEMENT ADD-ONLY (ADD COLUMN / ADD CONSTRAINT). Tidak ada DROP,
-- tidak ada ALTER TYPE, tidak menyentuh kolom buying yang sudah ada
-- (pencadangan_idr / actual_idr / selisih_idr / is_reimburse / urutan).
--
-- Kenapa aman di database yang sudah berisi baris lama:
--   - selling_idr, is_at_cost, currency: NOT NULL tapi punya DEFAULT, jadi
--     baris lama otomatis terisi (0 / false / 'IDR').
--   - leg, created_by, deleted_at: nullable — baris lama boleh kosong.
--   - created_at, updated_at: DEFAULT now().
--   - ck_charge_line_at_cost: baris lama is_at_cost=false → sisi kiri NOT
--     "is_at_cost" bernilai true → constraint otomatis lolos tanpa backfill.
--   - ck_charge_line_leg: baris lama leg IS NULL → lolos.
--
-- R4.3 (at-cost selling = buying) & R10 (leg 1|2|3) ditegakkan DI DATABASE
-- sebagai backstop; lapis aplikasi (src/lib/charge-line) memberi pesan ramah.

ALTER TABLE "charge_lines" ADD COLUMN "selling_idr" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "charge_lines" ADD COLUMN "is_at_cost" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "charge_lines" ADD COLUMN "leg" smallint;--> statement-breakpoint
ALTER TABLE "charge_lines" ADD COLUMN "currency" text DEFAULT 'IDR' NOT NULL;--> statement-breakpoint
ALTER TABLE "charge_lines" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "charge_lines" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "charge_lines" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "charge_lines" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_lines" ADD CONSTRAINT "ck_charge_line_leg" CHECK ("leg" IS NULL OR "leg" IN (1, 2, 3));--> statement-breakpoint
ALTER TABLE "charge_lines" ADD CONSTRAINT "ck_charge_line_currency" CHECK ("currency" IN ('IDR', 'USD'));--> statement-breakpoint
ALTER TABLE "charge_lines" ADD CONSTRAINT "ck_charge_line_at_cost" CHECK (NOT "is_at_cost" OR "selling_idr" = "pencadangan_idr");