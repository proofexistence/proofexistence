ALTER TABLE "sessions" ADD COLUMN "hidden" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "first_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "last_name";