import {
  pgTable,
  text,
  integer,
  timestamp,
  uniqueIndex,
  primaryKey,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ─── Enums ───────────────────────────────────────────── */
export const stageEnum = pgEnum("stage", [
  "group", "r32", "r16", "qf", "sf", "tp", "final",
]);
export const roleEnum = pgEnum("member_role", ["admin", "member"]);
export const winnerEnum = pgEnum("ko_winner", ["A", "B"]);

/* ─── Teams ──────────────────────────────────────────── */
export const teams = pgTable("teams", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  color1: text("color1").notNull(),
  color2: text("color2").notNull(),
  color3: text("color3").notNull(),
});

/* ─── Groups ─────────────────────────────────────────── */
export const groups = pgTable("groups", {
  id: text("id").primaryKey(),
});

export const groupTeams = pgTable(
  "group_teams",
  {
    groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
    teamCode: text("team_code").notNull().references(() => teams.code, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.teamCode] })],
);

/* ─── Matches — global template (schedule + grupo) ──────
   Group stage teams são fato (draw). KO teams começam null e cada bolão preenche
   em `bolao_match_state`. Resultados são sempre por bolão. */
export const matches = pgTable(
  "matches",
  {
    id: text("id").primaryKey(),
    stage: stageEnum("stage").notNull(),
    round: text("round").notNull(),
    groupId: text("group_id").references(() => groups.id),
    teamA: text("team_a").references(() => teams.code),
    teamB: text("team_b").references(() => teams.code),
    kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
    venue: text("venue"),
  },
  (t) => [index("matches_stage_idx").on(t.stage), index("matches_kickoff_idx").on(t.kickoffAt)],
);

/* ─── Estado por bolão (resultado + override de times KO) ─── */
export const bolaoMatchState = pgTable(
  "bolao_match_state",
  {
    bolaoId: text("bolao_id").notNull().references(() => boloes.id, { onDelete: "cascade" }),
    matchId: text("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
    teamA: text("team_a").references(() => teams.code),
    teamB: text("team_b").references(() => teams.code),
    resultA: integer("result_a"),
    resultB: integer("result_b"),
    /** Vencedor do jogo eliminatório. Null em grupos. Em KO:
        - se resultA != resultB → derivado automaticamente (não-null)
        - se resultA == resultB (decidido nos pênaltis) → admin escolhe ("A" ou "B") */
    winner: winnerEnum("winner"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.bolaoId, t.matchId] })],
);

/* ─── Bolões ─────────────────────────────────────────── */
/* adminId/userId armazenam o Clerk user id (text). Sem FK — Clerk é fonte da verdade. */
export const boloes = pgTable(
  "boloes",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    name: text("name").notNull(),
    code: text("code").notNull(),
    stake: text("stake"),
    adminId: text("admin_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("boloes_code_idx").on(t.code)],
);

export const memberships = pgTable(
  "memberships",
  {
    bolaoId: text("bolao_id").notNull().references(() => boloes.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: roleEnum("role").default("member").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.bolaoId, t.userId] }),
    index("memberships_user_idx").on(t.userId),
  ],
);

/* ─── Predictions ────────────────────────────────────── */
export const predictions = pgTable(
  "predictions",
  {
    bolaoId: text("bolao_id").notNull().references(() => boloes.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    matchId: text("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
    scoreA: integer("score_a").notNull(),
    scoreB: integer("score_b").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.bolaoId, t.userId, t.matchId] }),
    index("predictions_user_idx").on(t.userId),
  ],
);

/* ─── Relations ──────────────────────────────────────── */
export const boloesRelations = relations(boloes, ({ many }) => ({
  memberships: many(memberships),
  predictions: many(predictions),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  bolao: one(boloes, { fields: [memberships.bolaoId], references: [boloes.id] }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  group: one(groups, { fields: [matches.groupId], references: [groups.id] }),
  teamARel: one(teams, { fields: [matches.teamA], references: [teams.code], relationName: "teamA" }),
  teamBRel: one(teams, { fields: [matches.teamB], references: [teams.code], relationName: "teamB" }),
  predictions: many(predictions),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  teams: many(groupTeams),
  matches: many(matches),
}));
