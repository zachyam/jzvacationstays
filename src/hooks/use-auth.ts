import { useRouteContext } from "@tanstack/react-router";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

/**
 * Access the current auth user from router context.
 * Returns null if not logged in.
 */
export function useAuth(): AuthUser | null {
  const context = useRouteContext({ from: "__root__" });
  return context.user ?? null;
}
