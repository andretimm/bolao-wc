CREATE TABLE "champion_picks" (
	"bolao_id" text NOT NULL,
	"user_id" text NOT NULL,
	"team_code" text NOT NULL,
	"picked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "champion_picks_bolao_id_user_id_pk" PRIMARY KEY("bolao_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "champion_picks" ADD CONSTRAINT "champion_picks_bolao_id_boloes_id_fk" FOREIGN KEY ("bolao_id") REFERENCES "public"."boloes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "champion_picks" ADD CONSTRAINT "champion_picks_team_code_teams_code_fk" FOREIGN KEY ("team_code") REFERENCES "public"."teams"("code") ON DELETE no action ON UPDATE no action;