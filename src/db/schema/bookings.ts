import {
  pgTable,
  uuid,
  varchar,
  integer,
  date,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { properties } from "./properties";
import { users } from "./users";

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id),
  userId: uuid("user_id").references(() => users.id),
  guestName: varchar("guest_name", { length: 255 }).notNull(),
  guestEmail: varchar("guest_email", { length: 255 }).notNull(),
  guestPhone: varchar("guest_phone", { length: 50 }),
  guestsCount: integer("guests_count").notNull(),
  checkIn: date("check_in").notNull(),
  checkOut: date("check_out").notNull(),
  totalAmount: integer("total_amount").notNull(),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  source: varchar("source", { length: 30 }).notNull().default("direct"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
