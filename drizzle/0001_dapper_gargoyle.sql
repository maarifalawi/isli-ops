CREATE TABLE "invoice_sequence" (
	"inv_type" text NOT NULL,
	"issue_year" smallint NOT NULL,
	"issue_month" smallint NOT NULL,
	"last_running" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "invoice_sequence_inv_type_issue_year_issue_month_pk" PRIMARY KEY("inv_type","issue_year","issue_month"),
	CONSTRAINT "ck_inv_seq_type" CHECK (inv_type IN ('INVDOM', 'INVEXP', 'INVIMP')),
	CONSTRAINT "ck_inv_seq_month" CHECK (issue_month BETWEEN 1 AND 12)
);
--> statement-breakpoint
CREATE TABLE "job_sequence" (
	"seq_scope" text NOT NULL,
	"tahun" smallint NOT NULL,
	"bulan" smallint NOT NULL,
	"last_running" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "job_sequence_seq_scope_tahun_bulan_pk" PRIMARY KEY("seq_scope","tahun","bulan"),
	CONSTRAINT "ck_job_seq_scope" CHECK (seq_scope IN ('DOM', 'EXP', 'IMP')),
	CONSTRAINT "ck_job_seq_bulan" CHECK (bulan BETWEEN 1 AND 12)
);
--> statement-breakpoint
DROP INDEX "uq_inv";--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD COLUMN "issue_month" smallint;--> statement-breakpoint
UPDATE "customer_invoices" SET "issue_month" = EXTRACT(MONTH FROM "issue_date")::smallint;--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "issue_month" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_inv" ON "customer_invoices" USING btree ("inv_type","issue_year","issue_month","running");
