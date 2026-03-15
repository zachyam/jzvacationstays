import { createServerFn } from "@tanstack/react-start";

export const getHostname = createServerFn({ method: "GET" }).handler(async () => {
  // In server context, we can access the request through global context
  // For now, we'll return a default value and handle hostname on the client side
  if (typeof window !== "undefined") {
    return window.location.hostname + (window.location.port ? `:${window.location.port}` : "");
  }

  // Server-side: default to localhost for now
  // In production, this will be handled by the actual domain
  return "localhost:3000";
});