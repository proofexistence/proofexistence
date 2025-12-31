CREATE TABLE "badges" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(255) NOT NULL,
	"image_url" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "brand_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(7) NOT NULL,
	"is_visible" integer DEFAULT 1 NOT NULL,
	"criteria" jsonb,
	"explicit_points" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_snapshots" (
	"day_id" varchar(10) PRIMARY KEY NOT NULL,
	"merkle_root" varchar(66) NOT NULL,
	"total_rewards" numeric(36, 18) NOT NULL,
	"participant_count" integer NOT NULL,
	"tx_hash" varchar(66),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "likes_user_id_session_id_pk" PRIMARY KEY("user_id","session_id")
);
--> statement-breakpoint
CREATE TABLE "saved_sessions" (
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "saved_sessions_user_id_session_id_pk" PRIMARY KEY("user_id","session_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"start_time" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"sector_id" integer NOT NULL,
	"trail_data" jsonb,
	"message" varchar(280),
	"title" varchar(100),
	"description" varchar(500),
	"color" varchar(7),
	"token_id" varchar(78),
	"views" integer DEFAULT 0 NOT NULL,
	"likes" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'PENDING' NOT NULL,
	"tx_hash" varchar(66),
	"ipfs_hash" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "duration_min_10s" CHECK ("sessions"."duration" >= 10)
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"user_id" uuid NOT NULL,
	"badge_id" varchar(50) NOT NULL,
	"awarded_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_badges_user_id_badge_id_pk" PRIMARY KEY("user_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" varchar(42) NOT NULL,
	"email" varchar(255),
	"username" varchar(30),
	"name" varchar(50),
	"image_url" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp,
	CONSTRAINT "users_wallet_address_unique" UNIQUE("wallet_address"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_sessions" ADD CONSTRAINT "saved_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_sessions" ADD CONSTRAINT "saved_sessions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "likes_session_id_idx" ON "likes" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "saved_sessions_user_id_idx" ON "saved_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_sector_id_idx" ON "sessions" USING btree ("sector_id");--> statement-breakpoint
CREATE INDEX "sessions_status_idx" ON "sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sessions_created_at_idx" ON "sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_wallet_address_idx" ON "users" USING btree ("wallet_address");