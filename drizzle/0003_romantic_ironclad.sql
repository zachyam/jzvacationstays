ALTER TABLE "properties" ADD COLUMN "beds" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "nightly_rate" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "pet_fee" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "max_pets" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "min_stay" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "check_in_time" varchar(10) DEFAULT '16:00';--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "check_out_time" varchar(10) DEFAULT '11:00';--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "house_rules" text;