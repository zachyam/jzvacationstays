import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "./src/db/schema";

async function updatePropertyNames() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log("Updating property names...");

  try {
    // Update Seaglass Villa to The Blue Oasis
    await db
      .update(schema.properties)
      .set({
        name: "The Blue Oasis",
        slug: "the-blue-oasis"
      })
      .where(eq(schema.properties.slug, "seaglass-villa"));

    console.log("Updated Seaglass Villa to The Blue Oasis");

    // Update Coral Retreat to Surfer's Serenity
    await db
      .update(schema.properties)
      .set({
        name: "Surfer's Serenity",
        slug: "surfers-serenity"
      })
      .where(eq(schema.properties.slug, "coral-retreat"));

    console.log("Updated Coral Retreat to Surfer's Serenity");

    console.log("Property names updated successfully!");
  } catch (error) {
    console.error("Error updating property names:", error);
  } finally {
    await client.end();
  }
}

updatePropertyNames();