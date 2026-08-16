ALTER TYPE "public"."invoice_status" ADD VALUE 'TERBAYAR_SEBAGIAN' BEFORE 'LUNAS';--> statement-breakpoint
CREATE TABLE "invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"urutan" integer DEFAULT 0 NOT NULL,
	"charge_code" text NOT NULL,
	"keterangan" text NOT NULL,
	"is_reimburse" boolean DEFAULT false NOT NULL,
	"amount_idr" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments_in" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"jumlah_idr" bigint NOT NULL,
	"tanggal" date NOT NULL,
	"recorded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "running" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "invoice_no" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "issue_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "due_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "sub_total_idr" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "dpp_idr" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "ppn_idr" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "grand_total_idr" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD COLUMN "ppn_rate_bp" smallint DEFAULT 110 NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD COLUMN "pph23_applied" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD COLUMN "terbilang" text;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD COLUMN "top_days" integer;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD COLUMN "sent_date" date;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD COLUMN "is_reimburse_invoice" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD COLUMN "customer_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD COLUMN "created_by" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_customer_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."customer_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_in" ADD CONSTRAINT "payments_in_invoice_id_customer_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."customer_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments_in" ADD CONSTRAINT "payments_in_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_invoice_line_invoice" ON "invoice_lines" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "idx_payment_in_invoice" ON "payments_in" USING btree ("invoice_id");--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD CONSTRAINT "customer_invoices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;