import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

import { properties } from "./properties";
import { users } from "./users";

export const checklists = pgTable("checklists", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => properties.id),
  title: varchar("title", { length: 255 }).notNull(),
  type: varchar("type", { length: 30 }).notNull().default("maintenance"),
  createdBy: uuid("created_by").references(() => users.id),
  roomOrder: jsonb("room_order").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const checklistItems = pgTable("checklist_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  checklistId: uuid("checklist_id")
    .notNull()
    .references(() => checklists.id, { onDelete: "cascade" }),
  room: varchar("room", { length: 100 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  isCompleted: boolean("is_completed").notNull().default(false),
  completedAt: timestamp("completed_at"),
  completedBy: uuid("completed_by").references(() => users.id),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
