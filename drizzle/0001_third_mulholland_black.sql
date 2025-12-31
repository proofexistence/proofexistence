ALTER TABLE "sessions" ADD COLUMN "preview_url" varchar(500);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "clerk_id" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referral_code" varchar(10);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referred_by" uuid;--> statement-breakpoint
CREATE INDEX "users_clerk_id_idx" ON "users" USING btree ("clerk_id");--> statement-breakpoint
CREATE INDEX "users_referral_code_idx" ON "users" USING btree ("referral_code");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "image_url";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code");