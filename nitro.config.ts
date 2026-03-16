import { defineNitroConfig } from "nitropack";

export default defineNitroConfig({
  preset: "node-server",
  runtimeConfig: {
    // Server-side only environment variables
    databaseUrl: process.env.DATABASE_URL,
    resendApiKey: process.env.RESEND_API_KEY,
  },
});