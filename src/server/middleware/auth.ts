import { getCookie } from "@tanstack/react-start/server";
import { eq, and, gt } from "drizzle-orm";

import { db } from "../../db";
import { sessions, users } from "../../db/schema";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

/**
 * Validates the session cookie and returns the user.
 * Use this in server functions that require authentication.
 */
export async function requireAuth(): Promise<SessionUser> {
  const token = getCookie("session_token");
  if (!token) {
    throw new Error("Authentication required");
  }

  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);

  if (!session) {
    throw new Error("Session expired");
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
