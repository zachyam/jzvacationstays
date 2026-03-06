import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log("Seeding database...");

  // Create admin user
  const [adminUser] = await db
    .insert(schema.users)
    .values({
      email: "admin@jzvacationstays.com",
      name: "JZ Admin",
      role: "admin",
    })
    .returning();

  console.log("Created admin user:", adminUser.email);

  // Create properties
  const [seaglassVilla] = await db
    .insert(schema.properties)
    .values({
      slug: "seaglass-villa",
      name: "Seaglass Villa",
      tagline: "Oceanfront",
      description:
        "A stunning oceanfront villa perfect for family vacations. Wake up to the sound of waves and enjoy breathtaking views from every room. Features a spacious open floor plan, gourmet kitchen, and direct beach access.",
      maxGuests: 8,
      bedrooms: 4,
      bathrooms: "3.5",
      cleaningFee: 25000, // $250.00
      amenities: [
        "Ocean view",
        "Beach access",
        "WiFi",
        "Full kitchen",
        "Washer/Dryer",
        "A/C",
        "Parking",
        "BBQ grill",
        "Outdoor shower",
        "Beach chairs",
      ],
      highlight: "Family favorite",
    })
    .returning();

  const [coralRetreat] = await db
    .insert(schema.properties)
    .values({
      slug: "coral-retreat",
      name: "Coral Retreat",
      tagline: "Private Pool",
      description:
        "A charming retreat with a private heated pool, perfect for families with young children. Located just minutes from the beach with a fully fenced yard and kid-friendly amenities throughout.",
      maxGuests: 4,
      bedrooms: 2,
      bathrooms: "2.0",
      cleaningFee: 15000, // $150.00
      amenities: [
        "Private pool",
        "Heated pool",
        "Fenced yard",
        "WiFi",
        "Full kitchen",
        "Washer/Dryer",
        "A/C",
        "Parking",
        "Pack n Play",
        "High chair",
      ],
      highlight: "Kid-friendly pool",
    })
    .returning();

  console.log("Created properties:", seaglassVilla.name, coralRetreat.name);

  // Create sample reviews
  await db.insert(schema.reviews).values([
    {
      propertyId: seaglassVilla.id,
      guestName: "Sarah M.",
      rating: 5,
      comment:
        "Absolutely magical! The kids loved waking up to the ocean every morning. We'll definitely be back.",
      source: "airbnb",
      stayDate: "2025-06-15",
    },
    {
      propertyId: seaglassVilla.id,
      guestName: "David R.",
      rating: 5,
      comment:
        "Perfect family getaway. The house had everything we needed and the beach was just steps away.",
      source: "vrbo",
      stayDate: "2025-07-20",
    },
    {
      propertyId: seaglassVilla.id,
      guestName: "Jennifer L.",
      rating: 4,
      comment:
        "Beautiful property with stunning views. Kitchen was well-stocked. Would have loved a few more beach towels.",
      source: "direct",
      stayDate: "2025-08-10",
    },
    {
      propertyId: coralRetreat.id,
      guestName: "Mike T.",
      rating: 5,
      comment:
        "Our toddler absolutely loved the pool! The fenced yard gave us peace of mind. Great little house.",
      source: "airbnb",
      stayDate: "2025-05-22",
    },
    {
      propertyId: coralRetreat.id,
      guestName: "Amanda K.",
      rating: 5,
      comment:
        "Cozy and perfect for our small family. The heated pool was a huge hit. Very clean and well-maintained.",
      source: "vrbo",
      stayDate: "2025-09-05",
    },
  ]);

  console.log("Created sample reviews");

  // Create a sample turnover checklist
  const [turnoverChecklist] = await db
    .insert(schema.checklists)
    .values({
      propertyId: seaglassVilla.id,
      title: "Guest Turnover Checklist",
      type: "turnover",
      createdBy: adminUser.id,
    })
    .returning();

  await db.insert(schema.checklistItems).values([
    { checklistId: turnoverChecklist.id, title: "Strip all beds and start laundry", sortOrder: 0 },
    { checklistId: turnoverChecklist.id, title: "Clean all bathrooms", sortOrder: 1 },
    { checklistId: turnoverChecklist.id, title: "Vacuum and mop all floors", sortOrder: 2 },
    { checklistId: turnoverChecklist.id, title: "Wipe down kitchen surfaces and appliances", sortOrder: 3 },
    { checklistId: turnoverChecklist.id, title: "Restock toiletries and paper goods", sortOrder: 4 },
    { checklistId: turnoverChecklist.id, title: "Make all beds with fresh linens", sortOrder: 5 },
    { checklistId: turnoverChecklist.id, title: "Take out trash and recycling", sortOrder: 6 },
    { checklistId: turnoverChecklist.id, title: "Check A/C filter and thermostat", sortOrder: 7 },
    { checklistId: turnoverChecklist.id, title: "Set lockbox code for next guest", sortOrder: 8 },
  ]);

  console.log("Created turnover checklist with items");

  console.log("Seeding complete!");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
