import { createServerFn } from "@tanstack/react-start";
import { eq, and, gte, lte } from "drizzle-orm";

import { db } from "../../db";
import { bookings, properties, blockedDates } from "../../db/schema";
import { requireAdmin } from "../middleware/admin";

export const getCalendarBookings = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { propertyId: string; year: number; month: number }) => {
      if (!data.propertyId) throw new Error("Property ID is required");
      return data;
    },
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    // Get first/last day of month (with padding for calendar display)
    const firstDay = new Date(data.year, data.month, 1);
    const lastDay = new Date(data.year, data.month + 1, 0);
    const startStr = `${data.year}-${String(data.month + 1).padStart(2, "0")}-01`;
    const endStr = `${data.year}-${String(data.month + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;

    // Get bookings that overlap with this month
    const monthBookings = await db
      .select({
        booking: bookings,
        propertyName: properties.name,
      })
      .from(bookings)
      .innerJoin(properties, eq(bookings.propertyId, properties.id))
      .where(
        and(
          eq(bookings.propertyId, data.propertyId),
          lte(bookings.checkIn, endStr),
          gte(bookings.checkOut, startStr),
        ),
      );

    // Get blocked dates for the month
    const monthBlocked = await db
      .select()
      .from(blockedDates)
      .where(
        and(
          eq(blockedDates.propertyId, data.propertyId),
          gte(blockedDates.date, startStr),
          lte(blockedDates.date, endStr),
        ),
      );

    return {
      bookings: monthBookings,
      blockedDates: monthBlocked,
      month: data.month,
      year: data.year,
    };
  });
