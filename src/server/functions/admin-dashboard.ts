import { createServerFn } from "@tanstack/react-start";
import { eq, gte, count, sum } from "drizzle-orm";

import { db } from "../../db";
import { bookings, reviews, properties } from "../../db/schema";
import { requireAdmin } from "../middleware/admin";

export const getDashboardStats = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdmin();

    const today = new Date().toISOString().split("T")[0];

    const [totalBookings] = await db
      .select({ count: count() })
      .from(bookings);

    const [confirmedBookings] = await db
      .select({ count: count() })
      .from(bookings)
      .where(eq(bookings.status, "confirmed"));

    const [upcomingBookings] = await db
      .select({ count: count() })
      .from(bookings)
      .where(gte(bookings.checkIn, today));

    const [totalRevenue] = await db
      .select({ total: sum(bookings.totalAmount) })
      .from(bookings)
      .where(eq(bookings.status, "confirmed"));

    const [totalReviews] = await db
      .select({ count: count() })
      .from(reviews);

    const allProperties = await db
      .select({ id: properties.id, name: properties.name, slug: properties.slug })
      .from(properties);

    const recentBookings = await db
      .select({
        booking: bookings,
        propertyName: properties.name,
      })
      .from(bookings)
      .innerJoin(properties, eq(bookings.propertyId, properties.id))
      .orderBy(bookings.createdAt)
      .limit(5);

    return {
      totalBookings: totalBookings.count,
      confirmedBookings: confirmedBookings.count,
      upcomingBookings: upcomingBookings.count,
      totalRevenue: Number(totalRevenue.total) || 0,
      totalReviews: totalReviews.count,
      properties: allProperties,
      recentBookings,
    };
  },
);
