CREATE TYPE "public"."member_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."stage" AS ENUM('group', 'r32', 'r16', 'qf', 'sf', 'tp', 'final');--> statement-breakpoint
CREATE TYPE "public"."ko_winner" AS ENUM('A', 'B');--> statement-breakpoint
CREATE TABLE "bolao_match_state" (
	"bolao_id" text NOT NULL,
	"match_id" text NOT NULL,
	"team_a" text,
	"team_b" text,
	"result_a" integer,
	"result_b" integer,
	"winner" "ko_winner",
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bolao_match_state_bolao_id_match_id_pk" PRIMARY KEY("bolao_id","match_id")
);
--> statement-breakpoint
CREATE TABLE "boloes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"stake" text,
	"admin_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_teams" (
	"group_id" text NOT NULL,
	"team_code" text NOT NULL,
	CONSTRAINT "group_teams_group_id_team_code_pk" PRIMARY KEY("group_id","team_code")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_official_result" (
	"match_id" text PRIMARY KEY NOT NULL,
	"team_a" text,
	"team_b" text,
	"result_a" integer,
	"result_b" integer,
	"winner" "ko_winner",
	"status" text,
	"source" text DEFAULT 'football-data' NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" text PRIMARY KEY NOT NULL,
	"stage" "stage" NOT NULL,
	"round" text NOT NULL,
	"group_id" text,
	"team_a" text,
	"team_b" text,
	"kickoff_at" timestamp with time zone NOT NULL,
	"venue" text,
	"external_id" text,
	CONSTRAINT "matches_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"bolao_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_bolao_id_user_id_pk" PRIMARY KEY("bolao_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"bolao_id" text NOT NULL,
	"user_id" text NOT NULL,
	"match_id" text NOT NULL,
	"score_a" integer NOT NULL,
	"score_b" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "predictions_bolao_id_user_id_match_id_pk" PRIMARY KEY("bolao_id","user_id","match_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color1" text NOT NULL,
	"color2" text NOT NULL,
	"color3" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bolao_match_state" ADD CONSTRAINT "bolao_match_state_bolao_id_boloes_id_fk" FOREIGN KEY ("bolao_id") REFERENCES "public"."boloes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bolao_match_state" ADD CONSTRAINT "bolao_match_state_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bolao_match_state" ADD CONSTRAINT "bolao_match_state_team_a_teams_code_fk" FOREIGN KEY ("team_a") REFERENCES "public"."teams"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bolao_match_state" ADD CONSTRAINT "bolao_match_state_team_b_teams_code_fk" FOREIGN KEY ("team_b") REFERENCES "public"."teams"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_teams" ADD CONSTRAINT "group_teams_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_teams" ADD CONSTRAINT "group_teams_team_code_teams_code_fk" FOREIGN KEY ("team_code") REFERENCES "public"."teams"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_official_result" ADD CONSTRAINT "match_official_result_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_official_result" ADD CONSTRAINT "match_official_result_team_a_teams_code_fk" FOREIGN KEY ("team_a") REFERENCES "public"."teams"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_official_result" ADD CONSTRAINT "match_official_result_team_b_teams_code_fk" FOREIGN KEY ("team_b") REFERENCES "public"."teams"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_a_teams_code_fk" FOREIGN KEY ("team_a") REFERENCES "public"."teams"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_team_b_teams_code_fk" FOREIGN KEY ("team_b") REFERENCES "public"."teams"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_bolao_id_boloes_id_fk" FOREIGN KEY ("bolao_id") REFERENCES "public"."boloes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_bolao_id_boloes_id_fk" FOREIGN KEY ("bolao_id") REFERENCES "public"."boloes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "boloes_code_idx" ON "boloes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "matches_stage_idx" ON "matches" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "matches_kickoff_idx" ON "matches" USING btree ("kickoff_at");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "predictions_user_idx" ON "predictions" USING btree ("user_id");