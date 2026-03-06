import { createServerFn } from "@tanstack/react-start";
import { eq, and, desc } from "drizzle-orm";

import { db } from "../../db";
import { bookings, properties } from "../../db/schema";
import { requireAuth } from "../middleware/auth";

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      propertySlug: string;
      checkIn: string;
      checkOut: string;
      guestsCount: number;
      guestName: string;
      guestEmail: string;
      guestPhone?: string;
      totalAmount: number;
      userId?: string;
    }) => {
      if (!data.propertySlug || !data.checkIn || !data.checkOut) {
        throw new Error("Property, check-in, and check-out are required");
      }
      if (!data.guestName || !data.guestEmail) {
        throw new Error("Guest name and email are required");
      }
      return data;
    },
  )
  .handler(async ({ data }) => {
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
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
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
