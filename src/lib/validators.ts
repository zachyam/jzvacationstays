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
  room: z.string().optional(),
  description: z.string().optional(),
});

export const inspectionSchema = z.object({
  checklistId: z.string().uuid(),
  propertyId: z.string().uuid().optional(),
});

export const inspectionItemUpdateSchema = z.object({
  itemId: z.string().uuid(),
  isCompleted: z.boolean().optional(),
  status: z.enum(["pass", "fail", "na"]).optional(),
  comment: z.string().optional(),
});

export const propertySchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  name: z.string().min(1, "Name is required").max(255),
  tagline: z.string().max(255).optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  moreDetails: z.string().optional().or(z.literal("")),
  maxGuests: z.number().int().min(1, "At least 1 guest"),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().min(0.5, "Must be at least 0.5").refine(val => val % 0.5 === 0, "Must be in increments of 0.5 (e.g. 1, 1.5, 2)"),
  beds: z.array(z.string()).default([]),
  cleaningFee: z.number().int().min(0, "Cannot be negative"),
  nightlyRate: z.number().int().min(0, "Cannot be negative"),
  petFee: z.number().int().min(0, "Cannot be negative"),
  maxPets: z.number().int().min(0),
  minStay: z.number().int().min(1, "Minimum 1 night"),
  checkInTime: z.string().max(10).optional().or(z.literal("")),
  checkOutTime: z.string().max(10).optional().or(z.literal("")),
  houseRules: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  latitude: z.string().optional().or(z.literal("")),
  longitude: z.string().optional().or(z.literal("")),
  amenities: z.array(z.string()).default([]),
  highlight: z.string().max(255).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});
