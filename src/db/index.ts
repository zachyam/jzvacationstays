import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>>;

export function getDb() {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
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
