import postgres from "postgres";

const globalForDb = globalThis as unknown as { db: postgres.Sql };

export const db =
  globalForDb.db ??
  postgres(process.env.DATABASE_URL!, {
    ssl: { rejectUnauthorized: false },
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.db = db;

/** Type-safe wrapper for db.json() that accepts unknown values from parsed request bodies */
export function jsonb(value: unknown) {
  return db.json(value as Parameters<typeof db.json>[0]);
}
