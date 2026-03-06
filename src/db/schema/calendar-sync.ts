import {
  pgTable,
  uuid,
  varchar,
  integer,
  date,
  boolean,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { properties } from "./properties";
import { bookings } from "./bookings";

export const calendarSync = pgTable("calendar_sync", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id),
  platform: varchar("platform", { length: 30 }).notNull(),
  icalImportUrl: varchar("ical_import_url", { length: 500 }),
  icalExportToken: varchar("ical_export_token", { length: 255 }),
  lastSyncedAt: timestamp("last_synced_at"),
  syncIntervalMinutes: integer("sync_interval_minutes").notNull().default(30),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const blockedDates = pgTable(
  "blocked_dates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id),
    date: date("date").notNull(),
    reason: varchar("reason", { length: 30 }).notNull().default("booked"),
    source: varchar("source", { length: 30 }),
    bookingId: uuid("booking_id").references(() => bookings.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [unique().on(table.propertyId, table.date)],
);
