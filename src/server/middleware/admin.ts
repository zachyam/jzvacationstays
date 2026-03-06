import { requireAuth, type SessionUser } from "./auth";

/**
 * Validates the session and checks for admin role.
 * Use this in server functions that require admin access.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();

  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
}
