#!/usr/bin/env node

// Ensure environment variables are available
console.log("Starting server with environment check...");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✓ Set" : "✗ Not set");
console.log("RESEND_API_KEY:", process.env.RESEND_API_KEY ? "✓ Set" : "✗ Not set");
console.log("NODE_ENV:", process.env.NODE_ENV || "not set");
console.log("PORT:", process.env.PORT || "not set");

if (!process.env.DATABASE_URL) {
  console.error("\n⚠️  DATABASE_URL is not set!");
  console.error("Please ensure DATABASE_URL is set in your environment variables.");
  // Don't exit, let the app handle it
}

// Import and start the server
await import("../.output/server/index.mjs");