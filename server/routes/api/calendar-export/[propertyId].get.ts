import { defineEventHandler, getQuery } from "vinxi/http";
import { eq, and, gte } from "drizzle-orm";

import { getDb } from "../../../../src/db";
import {
  properties,
  bookings,
  blockedDates,
  calendarSync,
} from "../../../../src/db/schema";
import { generateIcalFeed } from "../../../../src/server/services/ical";

export default defineEventHandler(async (event) => {
  const propertyId = (event.context as any).params?.propertyId;
  const query = getQuery(event);
  const token = query.token as string;

  if (!propertyId || !token) {
    return new Response("Missing property ID or token", { status: 400 });
  }

  const db = getDb();

  // Verify token matches a valid calendar sync config
  const [sync] = await db
    .select()
    .from(calendarSync)
    .where(
      and(
        eq(calendarSync.icalExportToken, token),
        eq(calendarSync.isActive, true),
      ),
    )
    .limit(1);

  if (!sync) {
    return new Response("Invalid token", { status: 403 });
  }

  // Get property
  const [property] = await db
    .select()
    .from(properties)
    .where(eq(properties.slug, propertyId))
    .limit(1);

  if (!property) {
    return new Response("Property not found", { status: 404 });
  }

  const today = new Date().toISOString().split("T")[0];

  // Get confirmed bookings
  const confirmedBookings = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.propertyId, property.id),
        eq(bookings.status, "confirmed"),
        gte(bookings.checkOut, today),
      ),
    );

  // Get blocked dates not from this platform (avoid circular sync)
  const blocked = await db
    .select()
    .from(blockedDates)
    .where(
      and(
        eq(blockedDates.propertyId, property.id),
        gte(blockedDates.date, today),
      ),
    );

  // Build events for the iCal feed
  const events: Array<{
    uid: string;
    summary: string;
    start: string;
    end: string;
  }> = [];

  for (const booking of confirmedBookings) {
    events.push({
      uid: `booking-${booking.id}@jzvacationstays.com`,
      summary: "Reserved",
      start: booking.checkIn,
      end: booking.checkOut,
    });
  }

  // Group consecutive blocked dates into ranges
  const blockedBySource = new Map<string, string[]>();
  for (const b of blocked) {
    // Skip dates from the requesting platform to avoid circular sync
    if (b.source === sync.platform) continue;
    const key = b.source || "manual";
    if (!blockedBySource.has(key)) blockedBySource.set(key, []);
    blockedBySource.get(key)!.push(b.date);
  }

  for (const [source, dates] of blockedBySource) {
    const sorted = dates.sort();
    let rangeStart = sorted[0];
    let prev = sorted[0];

    for (let i = 1; i <= sorted.length; i++) {
      const current = sorted[i];
      const prevDate = new Date(prev);
      prevDate.setDate(prevDate.getDate() + 1);
      const nextDay = prevDate.toISOString().split("T")[0];

      if (current !== nextDay || i === sorted.length) {
        // End of range — end date is exclusive (day after last blocked date)
        const endDate = new Date(prev);
        endDate.setDate(endDate.getDate() + 1);
        events.push({
          uid: `blocked-${source}-${rangeStart}@jzvacationstays.com`,
          summary: "Blocked",
          start: rangeStart,
          end: endDate.toISOString().split("T")[0],
        });
        rangeStart = current;
      }
      prev = current;
    }
  }

  const icsContent = generateIcalFeed(property.name, events);

  return new Response(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${property.slug}.ics"`,
    },
  });
});
