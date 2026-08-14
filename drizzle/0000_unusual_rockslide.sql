CREATE TYPE "public"."charge_code_kategori" AS ENUM('FIXED', 'OPSIONAL');--> statement-breakpoint
CREATE TYPE "public"."invoice_addendum_status" AS ENUM('DRAFT', 'DISETUJUI', 'ISSUED');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('DRAFT', 'TERBIT', 'TERKIRIM', 'LUNAS', 'BATAL');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('DRAFT', 'DIAJUKAN', 'DISETUJUI_1', 'FINAL', 'DIBATALKAN');--> statement-breakpoint
CREATE TYPE "public"."reopen_request_status" AS ENUM('DIAJUKAN', 'DISETUJUI', 'DITOLAK');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('OWNER', 'MANAGER', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."seq_scope" AS ENUM('DOM', 'EXP', 'IMP');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('FCL', 'LCL', 'AF');--> statement-breakpoint
CREATE TYPE "public"."vendor_invoice_status" AS ENUM('DITERIMA', 'DIVERIFIKASI', 'DIBAYAR', 'DIBATALKAN');--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"cycle" integer DEFAULT 1 NOT NULL,
	"tingkat" integer NOT NULL,
	"approver_id" uuid NOT NULL,
	"catatan" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"aksi" text NOT NULL,
	"entitas" text NOT NULL,
	"entitas_id" uuid,
	"sebelum" text,
	"sesudah" text,
	"alasan" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charge_codes" (
	"kode" text PRIMARY KEY NOT NULL,
	"keterangan" text NOT NULL,
	"default_reimburse" boolean DEFAULT false NOT NULL,
	"butuh_vendor" boolean DEFAULT true NOT NULL,
	"kategori" charge_code_kategori DEFAULT 'OPSIONAL' NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "charge_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"charge_code" text NOT NULL,
	"vendor_id" uuid,
	"keterangan" text,
	"pencadangan_idr" bigint DEFAULT 0 NOT NULL,
	"actual_idr" bigint,
	"selisih_idr" bigint GENERATED ALWAYS AS (pencadangan_idr - actual_idr) STORED,
	"is_reimburse" boolean DEFAULT false NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cost_reallocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"origin_charge_line_id" uuid NOT NULL,
	"origin_job_id" uuid NOT NULL,
	"destination_job_id" uuid NOT NULL,
	"jumlah_idr" bigint NOT NULL,
	"alasan" text NOT NULL,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_realloc_not_self" CHECK ("cost_reallocations"."origin_job_id" != "cost_reallocations"."destination_job_id"),
	CONSTRAINT "ck_realloc_positive" CHECK ("cost_reallocations"."jumlah_idr" > 0)
);
--> statement-breakpoint
CREATE TABLE "cost_reopen_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"co_signed_by" uuid,
	"berita_acara_file_url" text NOT NULL,
	"alasan" text NOT NULL,
	"nilai_tambahan_idr" bigint,
	"status" "reopen_request_status" DEFAULT 'DIAJUKAN' NOT NULL,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"catatan_keputusan" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_invoice_addenda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_invoice_id" uuid NOT NULL,
	"addendum_seq" integer NOT NULL,
	"label_internal" text NOT NULL,
	"alasan" text NOT NULL,
	"amount_idr" bigint NOT NULL,
	"dpp_idr" bigint NOT NULL,
	"ppn_idr" bigint NOT NULL,
	"pph23_applied" boolean DEFAULT false NOT NULL,
	"pph23_idr" bigint DEFAULT 0 NOT NULL,
	"grand_total_idr" bigint NOT NULL,
	"tax_rule_version" text NOT NULL,
	"issue_month" integer NOT NULL,
	"issue_year" integer NOT NULL,
	"status" "invoice_addendum_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"inv_type" text NOT NULL,
	"issue_year" integer NOT NULL,
	"running" integer NOT NULL,
	"invoice_no" text NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"sub_total_idr" bigint NOT NULL,
	"reimburse_idr" bigint DEFAULT 0 NOT NULL,
	"dpp_idr" bigint NOT NULL,
	"ppn_idr" bigint NOT NULL,
	"pph23_idr" bigint DEFAULT 0 NOT NULL,
	"grand_total_idr" bigint NOT NULL,
	"tax_rule_version" text NOT NULL,
	"status" "invoice_status" DEFAULT 'DRAFT' NOT NULL,
	"pod_diterima_at" timestamp with time zone,
	"issued_before_pod" boolean DEFAULT false NOT NULL,
	"early_issue_approved_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ck_early_issue_needs_approval" CHECK ((issued_before_pod = false) OR (early_issue_approved_by IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"npwp" text,
	"alamat" text,
	"top_hari" integer DEFAULT 30 NOT NULL,
	"pph23_default" boolean DEFAULT false NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq_scope" "seq_scope" NOT NULL,
	"tahun" integer NOT NULL,
	"bulan" integer NOT NULL,
	"running" integer NOT NULL,
	"job_no" text NOT NULL,
	"suffix" text,
	"customer_id" uuid NOT NULL,
	"leg_trucking" boolean DEFAULT false NOT NULL,
	"leg_freight" boolean DEFAULT false NOT NULL,
	"leg_delivery" boolean DEFAULT false NOT NULL,
	"leg_override_alasan" text,
	"service_type" "service_type",
	"rute" text,
	"vessel" text,
	"etd" date,
	"sales" text,
	"selling_idr" bigint DEFAULT 0 NOT NULL,
	"ppn_idr" bigint DEFAULT 0 NOT NULL,
	"selling_usd" bigint,
	"kurs_x100" bigint,
	"status" "job_status" DEFAULT 'DRAFT' NOT NULL,
	"maker_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "ck_legs" CHECK (NOT ("jobs"."leg_trucking" AND "jobs"."leg_delivery" AND NOT "jobs"."leg_freight")
			    AND ("jobs"."leg_trucking" OR "jobs"."leg_freight" OR "jobs"."leg_delivery"))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nama" text NOT NULL,
	"role" "role" DEFAULT 'STAFF' NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vendor_invoice_addenda" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"original_vendor_invoice_id" uuid NOT NULL,
	"addendum_seq" integer NOT NULL,
	"label_internal" text NOT NULL,
	"alasan" text NOT NULL,
	"jumlah_idr" bigint NOT NULL,
	"pph23_applied" boolean DEFAULT false NOT NULL,
	"pph23_idr" bigint DEFAULT 0 NOT NULL,
	"issue_month" integer NOT NULL,
	"issue_year" integer NOT NULL,
	"status" "invoice_addendum_status" DEFAULT 'DRAFT' NOT NULL,
	"created_by" uuid NOT NULL,
	"approved_by" uuid,
	"dibayar_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_invoice_id" uuid NOT NULL,
	"charge_line_id" uuid NOT NULL,
	"jumlah_idr" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_id" uuid NOT NULL,
	"vendor_invoice_no" text NOT NULL,
	"tanggal_invoice" date NOT NULL,
	"jumlah_idr" bigint NOT NULL,
	"pph23_idr" bigint DEFAULT 0 NOT NULL,
	"status" "vendor_invoice_status" DEFAULT 'DITERIMA' NOT NULL,
	"dibayar_at" timestamp with time zone,
	"dibayar_oleh" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nama" text NOT NULL,
	"npwp" text,
	"pph23_default" boolean DEFAULT false NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_charge_code_charge_codes_kode_fk" FOREIGN KEY ("charge_code") REFERENCES "public"."charge_codes"("kode") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charge_lines" ADD CONSTRAINT "charge_lines_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_reallocations" ADD CONSTRAINT "cost_reallocations_origin_charge_line_id_charge_lines_id_fk" FOREIGN KEY ("origin_charge_line_id") REFERENCES "public"."charge_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_reallocations" ADD CONSTRAINT "cost_reallocations_origin_job_id_jobs_id_fk" FOREIGN KEY ("origin_job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_reallocations" ADD CONSTRAINT "cost_reallocations_destination_job_id_jobs_id_fk" FOREIGN KEY ("destination_job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_reallocations" ADD CONSTRAINT "cost_reallocations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_reallocations" ADD CONSTRAINT "cost_reallocations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_reopen_requests" ADD CONSTRAINT "cost_reopen_requests_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_reopen_requests" ADD CONSTRAINT "cost_reopen_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_reopen_requests" ADD CONSTRAINT "cost_reopen_requests_co_signed_by_users_id_fk" FOREIGN KEY ("co_signed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cost_reopen_requests" ADD CONSTRAINT "cost_reopen_requests_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_invoice_addenda" ADD CONSTRAINT "customer_invoice_addenda_original_invoice_id_customer_invoices_id_fk" FOREIGN KEY ("original_invoice_id") REFERENCES "public"."customer_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_invoice_addenda" ADD CONSTRAINT "customer_invoice_addenda_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_invoice_addenda" ADD CONSTRAINT "customer_invoice_addenda_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_early_issue_approved_by_users_id_fk" FOREIGN KEY ("early_issue_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_maker_id_users_id_fk" FOREIGN KEY ("maker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoice_addenda" ADD CONSTRAINT "vendor_invoice_addenda_original_vendor_invoice_id_vendor_invoices_id_fk" FOREIGN KEY ("original_vendor_invoice_id") REFERENCES "public"."vendor_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoice_addenda" ADD CONSTRAINT "vendor_invoice_addenda_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoice_addenda" ADD CONSTRAINT "vendor_invoice_addenda_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoice_lines" ADD CONSTRAINT "vendor_invoice_lines_vendor_invoice_id_vendor_invoices_id_fk" FOREIGN KEY ("vendor_invoice_id") REFERENCES "public"."vendor_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoice_lines" ADD CONSTRAINT "vendor_invoice_lines_charge_line_id_charge_lines_id_fk" FOREIGN KEY ("charge_line_id") REFERENCES "public"."charge_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_dibayar_oleh_users_id_fk" FOREIGN KEY ("dibayar_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_approval_sekali" ON "approvals" USING btree ("job_id","cycle","tingkat");--> statement-breakpoint
CREATE INDEX "idx_audit_entitas" ON "audit_log" USING btree ("entitas","entitas_id");--> statement-breakpoint
CREATE INDEX "idx_audit_waktu" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_charge_job" ON "charge_lines" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "idx_charge_vendor" ON "charge_lines" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "idx_realloc_origin_job" ON "cost_reallocations" USING btree ("origin_job_id");--> statement-breakpoint
CREATE INDEX "idx_realloc_dest_job" ON "cost_reallocations" USING btree ("destination_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_addendum" ON "customer_invoice_addenda" USING btree ("original_invoice_id","addendum_seq");--> statement-breakpoint
CREATE INDEX "idx_addendum_original" ON "customer_invoice_addenda" USING btree ("original_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_inv" ON "customer_invoices" USING btree ("inv_type","issue_year","running");--> statement-breakpoint
CREATE INDEX "idx_inv_job" ON "customer_invoices" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_job_nomor" ON "jobs" USING btree ("seq_scope","tahun","bulan","running");--> statement-breakpoint
CREATE INDEX "idx_job_customer" ON "jobs" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_job_status" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_job_periode" ON "jobs" USING btree ("tahun","bulan");--> statement-breakpoint
CREATE INDEX "idx_job_sales" ON "jobs" USING btree ("sales","tahun","bulan");--> statement-breakpoint
CREATE INDEX "idx_job_rute" ON "jobs" USING btree ("rute","tahun","bulan");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_vendor_addendum" ON "vendor_invoice_addenda" USING btree ("original_vendor_invoice_id","addendum_seq");--> statement-breakpoint
CREATE INDEX "idx_vendor_addendum_original" ON "vendor_invoice_addenda" USING btree ("original_vendor_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_vendor_invoice" ON "vendor_invoices" USING btree ("vendor_id","vendor_invoice_no");--> statement-breakpoint
CREATE INDEX "idx_vinv_vendor" ON "vendor_invoices" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "idx_vinv_status" ON "vendor_invoices" USING btree ("status");