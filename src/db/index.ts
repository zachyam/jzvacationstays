import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;
let _client: ReturnType<typeof postgres> | undefined;

export function getDb() {
  // Only initialize database on server side
  if (typeof window !== "undefined") {
    throw new Error("Database cannot be accessed from client side");
  }

  if (!_db) {
    // Try to get DATABASE_URL from environment
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      // Log more details to help debug
      console.error("Environment check:", {
        NODE_ENV: process.env.NODE_ENV,
        hasDB: !!process.env.DATABASE_URL,
        keys: Object.keys(process.env).filter(k => k.includes("DATABASE"))
      });
      throw new Error("DATABASE_URL is not set");
    }

    if (!_client) {
      _client = postgres(connectionString);
    }
    _db = drizzle(_client, { schema });
  }
  return _db;
}

// Lazy proxy that only initializes DB when actually used
// This prevents client-side initialization
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    const database = getDb();
    return (database as any)[prop];
  },
});
