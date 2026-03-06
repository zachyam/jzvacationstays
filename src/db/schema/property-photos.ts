import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

import { properties } from "./properties";

export const propertyPhotos = pgTable("property_photos", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  url: varchar("url", { length: 500 }).notNull(),
  alt: varchar("alt", { length: 255 }),
  sortOrder: integer("sort_order").notNull().default(0),
  isCover: boolean("is_cover").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
