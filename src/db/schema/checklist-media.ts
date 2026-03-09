import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

import { checklistItems } from "./checklists";
import { users } from "./users";

export const checklistItemMedia = pgTable("checklist_item_media", {
  id: uuid("id").defaultRandom().primaryKey(),
  checklistItemId: uuid("checklist_item_id")
    .notNull()
    .references(() => checklistItems.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  filePath: text("file_path").notNull(), // storage path
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id),
  uploaderType: varchar("uploader_type", { length: 20 }).notNull(), // 'admin' or 'handyman'
  description: text("description"), // optional description/notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});