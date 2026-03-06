import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(1, "Name is required").optional(),
});

export const otpSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Code must be 6 digits"),
  name: z.string().optional(),
});

export const bookingSchema = z.object({
  propertySlug: z.string().min(1),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  guestsCount: z.number().int().min(1, "At least 1 guest required"),
  guestName: z.string().min(1, "Name is required"),
  guestEmail: z.string().email("Please enter a valid email"),
  guestPhone: z.string().optional(),
  totalAmount: z.number().int().min(1),
  userId: z.string().uuid().optional(),
});

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().optional(),
});

export const calendarSyncSchema = z.object({
  propertyId: z.string().uuid(),
  platform: z.enum(["airbnb", "vrbo", "hospitable", "other"]),
  icalImportUrl: z.string().url("Please enter a valid URL"),
});

export const checklistSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum(["turnover", "maintenance", "inspection"]),
  propertyId: z.string().uuid().optional(),
});

export const checklistItemSchema = z.object({
  checklistId: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});
