import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./schema";

if (typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const g = globalThis as unknown as { _pool?: Pool };

function getPool(): Pool {
  if (g._pool) return g._pool;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString: url });
  if (process.env.NODE_ENV !== "production") g._pool = pool;
  return pool;
}

export const db = drizzle(
  // Pool is constructed lazily on first query (drizzle wraps it).
  // Wrap getPool() in a Proxy so build-time imports do not require DATABASE_URL.
  new Proxy({} as Pool, {
    get(_t, prop) {
      const p = getPool() as unknown as Record<string | symbol, unknown>;
      const v = p[prop];
      return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(p) : v;
    },
  }),
  { schema },
);

export type DB = typeof db;
