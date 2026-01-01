CREATE TABLE "bonus_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(36, 18) NOT NULL,
	"type" varchar(50) NOT NULL,
	"description" varchar(500),
	"tx_hash" varchar(66),
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "bonus_rewards" ADD CONSTRAINT "bonus_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bonus_rewards_user_id_idx" ON "bonus_rewards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bonus_rewards_type_idx" ON "bonus_rewards" USING btree ("type");--> statement-breakpoint
CREATE INDEX "bonus_rewards_status_idx" ON "bonus_rewards" USING btree ("status");