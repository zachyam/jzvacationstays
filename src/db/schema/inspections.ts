import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

import { properties } from "./properties";
import { checklists, checklistItems } from "./checklists";

export const inspections = pgTable("inspections", {
  id: uuid("id").defaultRandom().primaryKey(),
  checklistId: uuid("checklist_id")
    .notNull()
    .references(() => checklists.id),
  propertyId: uuid("property_id").references(() => properties.id),
  token: varchar("token", { length: 64 }).notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  notes: text("notes"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inspectionItems = pgTable("inspection_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  inspectionId: uuid("inspection_id")
    .notNull()
    .references(() => inspections.id, { onDelete: "cascade" }),
  checklistItemId: uuid("checklist_item_id").references(() => checklistItems.id),
  room: varchar("room", { length: 100 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  isCompleted: boolean("is_completed").notNull().default(false),
  status: varchar("status", { length: 20 }),
  comment: text("comment"),
  completedAt: timestamp("completed_at"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inspectionMedia = pgTable("inspection_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  inspectionItemId: uuid("inspection_item_id")
    .notNull()
    .references(() => inspectionItems.id, { onDelete: "cascade" }),
  url: varchar("url", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 10 }).notNull(),
  fileName: varchar("file_name", { length: 255 }),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
