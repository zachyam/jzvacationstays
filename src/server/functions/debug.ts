import { createServerFn } from "@tanstack/react-start";

export const checkEnv = createServerFn({ method: "GET" }).handler(async () => {
  // Only return non-sensitive info about environment
  return {
    nodeEnv: process.env.NODE_ENV,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasResendKey: !!process.env.RESEND_API_KEY,
    envKeys: Object.keys(process.env).filter(k =>
      k.includes("DATABASE") ||
      k.includes("RAILWAY") ||
      k.includes("NODE") ||
      k.includes("PORT")
    ),
    // Railway specific vars
    railwayEnv: process.env.RAILWAY_ENVIRONMENT,
    port: process.env.PORT,
  };
});