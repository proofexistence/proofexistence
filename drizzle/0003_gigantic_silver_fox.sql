CREATE TABLE "daily_themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" varchar(10) NOT NULL,
	"theme" varchar(100) NOT NULL,
	"description" varchar(500),
	"is_default" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_themes_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "daisy_mint_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daisy_mint_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"edition" varchar(20) NOT NULL,
	"token_id" varchar(78),
	"tx_hash" varchar(66),
	"paid_amount" numeric(36, 18),
	"payment_token" varchar(10),
	"is_free_participant" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "daisy_mint_claims_daisy_mint_id_user_id_edition_unique" UNIQUE("daisy_mint_id","user_id","edition")
);
--> statement-breakpoint
CREATE TABLE "daisy_mints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" varchar(10) NOT NULL,
	"genesis_token_id" varchar(78),
	"genesis_arweave_hash" varchar(255),
	"genesis_tx_hash" varchar(66),
	"genesis_minted_at" timestamp with time zone,
	"genesis_minted_to" varchar(42),
	"auction_start_price" numeric(36, 18),
	"auction_current_bid" numeric(36, 18),
	"auction_highest_bidder" varchar(42),
	"auction_end_time" timestamp with time zone,
	"auction_settled" boolean DEFAULT false,
	"standard_arweave_hash" varchar(255),
	"standard_mint_count" integer DEFAULT 0,
	"participant_count" integer DEFAULT 0,
	"session_count" integer DEFAULT 0,
	"is_special_day" boolean DEFAULT false,
	"special_day_name" varchar(100),
	"special_day_multiplier" numeric(4, 2) DEFAULT '1.00',
	"participants_merkle_root" varchar(66),
	"theme" varchar(100),
	"dominant_color" varchar(100),
	"preview_url" varchar(500),
	"status" varchar(20) DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "daisy_mints_date_unique" UNIQUE("date")
);
--> statement-breakpoint
CREATE TABLE "default_themes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "default_themes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"theme" varchar(100) NOT NULL,
	"description" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"sessions_count" integer DEFAULT 0 NOT NULL,
	"total_duration" integer DEFAULT 0 NOT NULL,
	"rewards_earned" numeric(78, 0) DEFAULT '0' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500),
	"theme" varchar(100),
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"reward_multiplier" numeric(5, 2) DEFAULT '1.00' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"image_url" varchar(500),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quest_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" varchar(10) NOT NULL,
	"reward_type" varchar(50) NOT NULL,
	"amount" numeric(78, 0) NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"milestone_day" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "rewards_merkle_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merkle_root" varchar(66) NOT NULL,
	"entries" jsonb NOT NULL,
	"user_count" integer NOT NULL,
	"tx_hash" varchar(66),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rewards_merkle_snapshots_merkle_root_unique" UNIQUE("merkle_root")
);
--> statement-breakpoint
CREATE TABLE "time_capsules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"unlock_date" timestamp NOT NULL,
	"message" varchar(500),
	"is_opened" boolean DEFAULT false NOT NULL,
	"opened_at" timestamp,
	"notify_on_unlock" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_daily_quests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" varchar(10) NOT NULL,
	"create_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"theme_completed" boolean DEFAULT false NOT NULL,
	"theme_session_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_streaks" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"last_active_date" varchar(10),
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_themes" ADD CONSTRAINT "daily_themes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daisy_mint_claims" ADD CONSTRAINT "daisy_mint_claims_daisy_mint_id_daisy_mints_id_fk" FOREIGN KEY ("daisy_mint_id") REFERENCES "public"."daisy_mints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daisy_mint_claims" ADD CONSTRAINT "daisy_mint_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_rewards" ADD CONSTRAINT "quest_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_capsules" ADD CONSTRAINT "time_capsules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_capsules" ADD CONSTRAINT "time_capsules_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_daily_quests" ADD CONSTRAINT "user_daily_quests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_daily_quests" ADD CONSTRAINT "user_daily_quests_theme_session_id_sessions_id_fk" FOREIGN KEY ("theme_session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_themes_date_idx" ON "daily_themes" USING btree ("date");--> statement-breakpoint
CREATE INDEX "event_participants_event_id_idx" ON "event_participants" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_participants_user_id_idx" ON "event_participants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "events_start_date_idx" ON "events" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "events_end_date_idx" ON "events" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "events_is_active_idx" ON "events" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "quest_rewards_user_id_idx" ON "quest_rewards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quest_rewards_status_idx" ON "quest_rewards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quest_rewards_date_idx" ON "quest_rewards" USING btree ("date");--> statement-breakpoint
CREATE INDEX "time_capsules_user_id_idx" ON "time_capsules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "time_capsules_unlock_date_idx" ON "time_capsules" USING btree ("unlock_date");--> statement-breakpoint
CREATE INDEX "time_capsules_is_opened_idx" ON "time_capsules" USING btree ("is_opened");--> statement-breakpoint
CREATE INDEX "user_daily_quests_user_date_idx" ON "user_daily_quests" USING btree ("user_id","date");