import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
  },
  plugins: [
    tanstackStart(),
    nitro({
      preset: "node-server",
      // Ensure environment variables are available at runtime
      runtimeConfig: {
        // These will be available in server functions
        databaseUrl: process.env.DATABASE_URL,
        resendApiKey: process.env.RESEND_API_KEY,
      },
    }),
    viteReact(),
    tailwindcss()
  ],
});
