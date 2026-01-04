ALTER TABLE "bonus_rewards" ALTER COLUMN "amount" SET DATA TYPE numeric(78, 0);--> statement-breakpoint
ALTER TABLE "daily_rewards" ALTER COLUMN "total_budget" SET DATA TYPE numeric(78, 0);--> statement-breakpoint
ALTER TABLE "daily_rewards" ALTER COLUMN "total_distributed" SET DATA TYPE numeric(78, 0);--> statement-breakpoint
ALTER TABLE "daily_rewards" ALTER COLUMN "contract_balance_before" SET DATA TYPE numeric(78, 0);--> statement-breakpoint
ALTER TABLE "daily_rewards" ALTER COLUMN "contract_balance_after" SET DATA TYPE numeric(78, 0);--> statement-breakpoint
ALTER TABLE "daily_snapshots" ALTER COLUMN "total_rewards" SET DATA TYPE numeric(78, 0);--> statement-breakpoint
ALTER TABLE "user_daily_rewards" ALTER COLUMN "base_reward" SET DATA TYPE numeric(78, 0);--> statement-breakpoint
ALTER TABLE "user_daily_rewards" ALTER COLUMN "bonus_reward" SET DATA TYPE numeric(78, 0);--> statement-breakpoint
ALTER TABLE "user_daily_rewards" ALTER COLUMN "total_reward" SET DATA TYPE numeric(78, 0);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "time26_balance" SET DATA TYPE numeric(78, 0);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "time26_balance" SET DEFAULT '0';