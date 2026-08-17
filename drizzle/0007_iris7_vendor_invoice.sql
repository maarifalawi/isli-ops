ALTER TABLE "vendor_invoices" ADD COLUMN "diterima_oleh" uuid;--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD COLUMN "diverifikasi_oleh" uuid;--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD COLUMN "diverifikasi_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_diterima_oleh_users_id_fk" FOREIGN KEY ("diterima_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_diverifikasi_oleh_users_id_fk" FOREIGN KEY ("diverifikasi_oleh") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_vendor_inv_line_charge_line" ON "vendor_invoice_lines" USING btree ("charge_line_id");--> statement-breakpoint
CREATE INDEX "idx_vinv_line_invoice" ON "vendor_invoice_lines" USING btree ("vendor_invoice_id");