ALTER TYPE "public"."job_status" ADD VALUE 'UNLOCK_REQUESTED' BEFORE 'DIBATALKAN';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "approval_cycle" integer DEFAULT 1 NOT NULL;