import { createServerFn } from "@tanstack/react-start";
import { eq, desc } from "drizzle-orm";

import { db } from "../../db";
import { bookings, properties } from "../../db/schema";
import { requireAdmin } from "../middleware/admin";

export const getAdminBookings = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdmin();

    const result = await db
      .select({
        booking: bookings,
        propertyName: properties.name,
        propertySlug: properties.slug,
      })
      .from(bookings)
      .innerJoin(properties, eq(bookings.propertyId, properties.id))
      .orderBy(desc(bookings.createdAt));

    return result;
  },
);

export const updateBookingStatus = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { bookingId: string; status: string }) => {
      if (!data.bookingId || !data.status) {
        throw new Error("Booking ID and status are required");
      }
      return data;
    },
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    await db
      .update(bookings)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(bookings.id, data.bookingId));

    return { success: true };
  });
