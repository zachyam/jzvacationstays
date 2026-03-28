ALTER TABLE "checklists" ADD COLUMN "room_order" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "inspections" ADD COLUMN "room_order" jsonb DEFAULT '[]'::jsonb;