CREATE TABLE "daily_rewards" (
	"day_id" varchar(10) PRIMARY KEY NOT NULL,
	"total_budget" numeric(36, 18) NOT NULL,
	"total_seconds" integer NOT NULL,
	"total_distributed" numeric(36, 18) NOT NULL,
	"participant_count" integer NOT NULL,
	"contract_balance_before" numeric(36, 18),
	"contract_balance_after" numeric(36, 18),
	"settled_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_daily_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"day_id" varchar(10) NOT NULL,
	"total_seconds" integer NOT NULL,
	"exclusive_seconds" integer NOT NULL,
	"shared_seconds" integer NOT NULL,
	"base_reward" numeric(36, 18) NOT NULL,
	"bonus_reward" numeric(36, 18) NOT NULL,
	"total_reward" numeric(36, 18) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "time26_balance" numeric(36, 18) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_daily_rewards" ADD CONSTRAINT "user_daily_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_daily_rewards_user_id_idx" ON "user_daily_rewards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_daily_rewards_day_id_idx" ON "user_daily_rewards" USING btree ("day_id");