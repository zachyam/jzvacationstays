import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>>;

export function getDb() {
  if (!_db) {
    // Try to get DATABASE_URL from environment
    const connectionString = process.env.DATABASE_URL || process.env.database_url;

    if (!connectionString) {
      // In production, this should never happen if Railway is configured correctly
      console.error("DATABASE_URL is not set in environment variables");
      throw new Error("DATABASE_URL is not set");
    }

    const client = postgres(connectionString);
    _db = drizzle(client, { schema });
  }
  return _db;
}

// Convenience export — use getDb() in server functions
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});
