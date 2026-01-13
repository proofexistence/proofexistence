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
CREATE TABLE "default_themes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "default_themes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"theme" varchar(100) NOT NULL,
	"description" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL
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
ALTER TABLE "quest_rewards" ADD CONSTRAINT "quest_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_daily_quests" ADD CONSTRAINT "user_daily_quests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_daily_quests" ADD CONSTRAINT "user_daily_quests_theme_session_id_sessions_id_fk" FOREIGN KEY ("theme_session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_streaks" ADD CONSTRAINT "user_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_themes_date_idx" ON "daily_themes" USING btree ("date");--> statement-breakpoint
CREATE INDEX "quest_rewards_user_id_idx" ON "quest_rewards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quest_rewards_status_idx" ON "quest_rewards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quest_rewards_date_idx" ON "quest_rewards" USING btree ("date");--> statement-breakpoint
CREATE INDEX "user_daily_quests_user_date_idx" ON "user_daily_quests" USING btree ("user_id","date");