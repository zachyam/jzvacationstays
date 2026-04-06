import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { properties } from "./properties";

// Main property images (hero, gallery, etc.)
export const propertyMedia = pgTable("property_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: varchar("caption", { length: 255 }),
  type: varchar("type", { length: 50 }).notNull().default("image"), // image, video
  category: varchar("category", { length: 50 }).notNull().default("gallery"), // hero, gallery, etc.
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Room types (e.g., Master Bedroom, Guest Room, Living Room)
export const roomTypes = pgTable("room_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(), // Master Bedroom, Guest Room, etc.
  description: text("description"),
  beds: text("beds"), // King bed, 2 Twin beds, etc.
  maxOccupancy: integer("max_occupancy"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Images for each room type
export const roomMedia = pgTable("room_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomTypeId: uuid("room_type_id")
    .notNull()
    .references(() => roomTypes.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  caption: varchar("caption", { length: 255 }),
  type: varchar("type", { length: 50 }).notNull().default("image"), // image, video
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});