CREATE TABLE "time26_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"amount" numeric(78, 0) NOT NULL,
	"direction" varchar(10) NOT NULL,
	"balance_before" numeric(78, 0) NOT NULL,
	"balance_after" numeric(78, 0) NOT NULL,
	"reference_id" varchar(100),
	"reference_type" varchar(50),
	"description" varchar(500),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- ALTER TABLE "users" ADD COLUMN "time26_pending_burn" numeric(78, 0) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "time26_transactions" ADD CONSTRAINT "time26_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "time26_transactions_user_id_idx" ON "time26_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "time26_transactions_type_idx" ON "time26_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "time26_transactions_created_at_idx" ON "time26_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "time26_transactions_reference_idx" ON "time26_transactions" USING btree ("reference_id","reference_type");--> statement-breakpoint
-- ALTER TABLE "users" DROP COLUMN "time26_spent";