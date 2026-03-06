export const PROPERTY_SLUGS = {
  SEAGLASS_VILLA: "seaglass-villa",
  CORAL_RETREAT: "coral-retreat",
} as const;

export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
} as const;

export const USER_ROLES = {
  GUEST: "guest",
  ADMIN: "admin",
} as const;

export const BOOKING_SOURCES = {
  DIRECT: "direct",
  AIRBNB: "airbnb",
  VRBO: "vrbo",
  HOSPITABLE: "hospitable",
} as const;
