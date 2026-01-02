ALTER TABLE "users" ALTER COLUMN "clerk_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "first_name" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" varchar(500);