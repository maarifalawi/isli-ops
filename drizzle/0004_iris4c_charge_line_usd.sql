ALTER TABLE "charge_lines" ADD COLUMN "selling_usd" bigint;--> statement-breakpoint
ALTER TABLE "charge_lines" ADD COLUMN "pencadangan_usd" bigint;--> statement-breakpoint
ALTER TABLE "charge_lines" ADD COLUMN "actual_usd" bigint;--> statement-breakpoint
ALTER TABLE "charge_lines" ADD CONSTRAINT "ck_charge_line_usd_native" CHECK ("currency" = 'USD'
			    OR ("selling_usd" IS NULL AND "pencadangan_usd" IS NULL AND "actual_usd" IS NULL));