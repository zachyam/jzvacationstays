import { createServerFn } from "@tanstack/react-start";
import { eq, and, gte } from "drizzle-orm";
import crypto from "crypto";

import { db } from "../../db";
import {
  calendarSync,
  blockedDates,
  bookings,
  properties,
} from "../../db/schema";
import { requireAdmin } from "../middleware/admin";
import { parseIcalFeed, expandDateRange } from "../services/ical";

/**
 * Get all calendar sync configs for a property.
 */
export const getCalendarSyncs = createServerFn({ method: "GET" })
  .inputValidator((data: { propertyId: string }) => {
    if (!data.propertyId) throw new Error("Property ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();

    const syncs = await db
      .select()
      .from(calendarSync)
      .where(eq(calendarSync.propertyId, data.propertyId));

    return syncs;
  });

/**
 * Add a new calendar sync (iCal import URL from a platform).
 */
export const addCalendarSync = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      propertyId: string;
      platform: string;
      icalImportUrl: string;
    }) => {
      if (!data.propertyId || !data.platform || !data.icalImportUrl) {
        throw new Error("Property ID, platform, and URL are required");
      }
      return data;
    },
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    const exportToken = crypto.randomBytes(16).toString("hex");

    const [sync] = await db
      .insert(calendarSync)
      .values({
        propertyId: data.propertyId,
        platform: data.platform,
        icalImportUrl: data.icalImportUrl,
        icalExportToken: exportToken,
      })
      .returning();

    return { success: true, sync };
  });

/**
 * Remove a calendar sync config.
 */
export const removeCalendarSync = createServerFn({ method: "POST" })
  .inputValidator((data: { syncId: string }) => {
    if (!data.syncId) throw new Error("Sync ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();

    await db.delete(calendarSync).where(eq(calendarSync.id, data.syncId));

    return { success: true };
  });

/**
 * Sync a single calendar feed: fetch iCal URL, parse events, upsert blocked dates.
 */
export const syncCalendar = createServerFn({ method: "POST" })
  .inputValidator((data: { syncId: string }) => {
    if (!data.syncId) throw new Error("Sync ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();

    const [sync] = await db
      .select()
      .from(calendarSync)
      .where(eq(calendarSync.id, data.syncId))
      .limit(1);

    if (!sync || !sync.icalImportUrl) {
      return { success: false, error: "Sync config not found or missing URL" };
    }

    try {
      const events = await parseIcalFeed(sync.icalImportUrl);

      // Remove old blocked dates from this source
      await db
        .delete(blockedDates)
        .where(
          and(
            eq(blockedDates.propertyId, sync.propertyId),
            eq(blockedDates.source, sync.platform),
          ),
        );

      // Insert new blocked dates
      const today = new Date().toISOString().split("T")[0];
      const datesToInsert: Array<{
        propertyId: string;
        date: string;
        reason: string;
        source: string;
      }> = [];

      for (const event of events) {
        const dates = expandDateRange(event.start, event.end);
        for (const date of dates) {
          if (date >= today) {
            datesToInsert.push({
              propertyId: sync.propertyId,
              date,
              reason: "booked",
              source: sync.platform,
            });
          }
        }
      }

      if (datesToInsert.length > 0) {
        await db
          .insert(blockedDates)
          .values(datesToInsert)
          .onConflictDoNothing();
      }

      // Update last synced timestamp
      await db
        .update(calendarSync)
        .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
        .where(eq(calendarSync.id, sync.id));

      return {
        success: true,
        eventsFound: events.length,
        datesBlocked: datesToInsert.length,
      };
    } catch (err: any) {
      return { success: false, error: err.message || "Sync failed" };
    }
  });

/**
 * Get availability (blocked dates) for a property.
 * Public — used by the availability calendar.
 */
export const getAvailability = createServerFn({ method: "GET" })
  .inputValidator((data: { propertySlug: string }) => {
    if (!data.propertySlug) throw new Error("Property slug is required");
    return data;
  })
  .handler(async ({ data }) => {
    const [property] = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.slug, data.propertySlug))
      .limit(1);

    if (!property) return { blockedDates: [] };

    const today = new Date().toISOString().split("T")[0];

    // Get blocked dates from external syncs
    const externalBlocked = await db
      .select({ date: blockedDates.date })
      .from(blockedDates)
      .where(
        and(
          eq(blockedDates.propertyId, property.id),
          gte(blockedDates.date, today),
        ),
      );

    // Get dates from confirmed bookings
    const confirmedBookings = await db
      .select({ checkIn: bookings.checkIn, checkOut: bookings.checkOut })
      .from(bookings)
      .where(
        and(
          eq(bookings.propertyId, property.id),
          eq(bookings.status, "confirmed"),
          gte(bookings.checkOut, today),
        ),
      );

    const allBlockedDates = new Set(externalBlocked.map((b) => b.date));

    for (const booking of confirmedBookings) {
      const dates = expandDateRange(booking.checkIn, booking.checkOut);
      dates.forEach((d) => allBlockedDates.add(d));
    }

    return { blockedDates: Array.from(allBlockedDates).sort() };
  });
