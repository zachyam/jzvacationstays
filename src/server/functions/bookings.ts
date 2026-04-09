import { createServerFn } from "@tanstack/react-start";
import { eq, and, desc } from "drizzle-orm";

import { db } from "../../db";
import { bookings, properties, users } from "../../db/schema";
import { requireAuth } from "../middleware/auth";

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      propertySlug: string;
      checkIn: string;
      checkOut: string;
      guestsCount: number;
      totalAmount: number;
      userId?: string;
    }) => {
      if (!data.propertySlug || !data.checkIn || !data.checkOut) {
        throw new Error("Property, check-in, and check-out are required");
      }
      return data;
    },
  )
  .handler(async ({ data }) => {
    // Look up user information if userId is provided
    let guestName = "Guest";
    let guestEmail = "";
    let guestPhone = "";

    if (data.userId) {
      const [user] = await db
        .select({
          name: users.name,
          email: users.email,
          emailVerified: users.emailVerified
        })
        .from(users)
        .where(eq(users.id, data.userId))
        .limit(1);

      if (!user || !user.emailVerified) {
        return { success: false, error: "User not found or email verification required" };
      }

      guestName = user.name || "Guest";
      guestEmail = user.email;
    }

    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.slug, data.propertySlug))
      .limit(1);

    if (!property) {
      return { success: false, error: "Property not found" };
    }

    const [booking] = await db
      .insert(bookings)
      .values({
        propertyId: property.id,
        userId: data.userId,
        guestName,
        guestEmail,
        guestPhone,
        guestsCount: data.guestsCount,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        totalAmount: data.totalAmount,
        status: "pending",
        source: "direct",
      })
      .returning();

    return { success: true, booking };
  });

export const getBookingById = createServerFn({ method: "GET" })
  .inputValidator((data: { bookingId: string }) => {
    if (!data.bookingId) throw new Error("Booking ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, data.bookingId))
      .limit(1);

    if (!booking) return { booking: null, property: null };

    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, booking.propertyId))
      .limit(1);

    return { booking, property };
  });

export const getMyBookings = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = await requireAuth();

    const result = await db
      .select({
        booking: bookings,
        propertyName: properties.name,
        propertySlug: properties.slug,
      })
      .from(bookings)
      .innerJoin(properties, eq(bookings.propertyId, properties.id))
      .where(eq(bookings.userId, user.id))
      .orderBy(desc(bookings.createdAt));

    return result;
  },
);
