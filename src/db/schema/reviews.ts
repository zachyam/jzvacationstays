import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  date,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

import { properties } from "./properties";
import { bookings } from "./bookings";

export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id),
  bookingId: uuid("booking_id").references(() => bookings.id),
  guestName: varchar("guest_name", { length: 255 }).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  source: varchar("source", { length: 30 }).notNull().default("direct"),
  stayDate: date("stay_date"),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
