import { createServerFn } from "@tanstack/react-start";
import { eq, asc, desc, sql } from "drizzle-orm";
import { randomBytes } from "crypto";

import { db } from "../../db";
import {
  inspections,
  inspectionItems,
  inspectionMedia,
  checklists,
  checklistItems,
  properties,
  checklistItemMedia,
} from "../../db/schema";
import { requireAdmin } from "../middleware/admin";
import { deleteObject } from "../../lib/s3";

// --- Admin functions ---

export const getInspectionDetails = createServerFn({ method: "GET" })
  .inputValidator((data: { inspectionId: string }) => {
    if (!data.inspectionId) throw new Error("Inspection ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();

    // Get inspection details
    const [inspection] = await db
      .select({
        id: inspections.id,
        token: inspections.token,
        status: inspections.status,
        notes: inspections.notes,
        startedAt: inspections.startedAt,
        completedAt: inspections.completedAt,
        createdAt: inspections.createdAt,
        checklistId: inspections.checklistId,
        checklistTitle: checklists.title,
        checklistType: checklists.type,
        propertyName: properties.name,
      })
      .from(inspections)
      .leftJoin(checklists, eq(inspections.checklistId, checklists.id))
      .leftJoin(properties, eq(inspections.propertyId, properties.id))
      .where(eq(inspections.id, data.inspectionId))
      .limit(1);

    if (!inspection) throw new Error("Inspection not found");

    // Get inspection items (not checklist template items)
    const items = await db
      .select()
      .from(inspectionItems)
      .where(eq(inspectionItems.inspectionId, inspection.id))
      .orderBy(asc(inspectionItems.sortOrder));

    // Get media for all inspection items (batch fetch to avoid N+1)
    const itemIds = items.map(item => item.id);
    const allMedia = itemIds.length > 0
      ? await db
          .select()
          .from(inspectionMedia)
          .where(sql`${inspectionMedia.inspectionItemId} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`)
          .orderBy(asc(inspectionMedia.createdAt))
      : [];

    // Group media by item ID
    const mediaByItem: Record<string, typeof allMedia> = {};
    for (const media of allMedia) {
      if (!mediaByItem[media.inspectionItemId]) {
        mediaByItem[media.inspectionItemId] = [];
      }
      mediaByItem[media.inspectionItemId].push(media);
    }

    return { inspection, items, mediaByItem };
  });

export const getAllInspections = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdmin();

    const result = await db
      .select({
        id: inspections.id,
        token: inspections.token,
        status: inspections.status,
        notes: inspections.notes,
        startedAt: inspections.startedAt,
        completedAt: inspections.completedAt,
        createdAt: inspections.createdAt,
        checklistTitle: checklists.title,
        checklistType: checklists.type,
        propertyName: properties.name,
      })
      .from(inspections)
      .leftJoin(checklists, eq(inspections.checklistId, checklists.id))
      .leftJoin(properties, eq(inspections.propertyId, properties.id))
      .orderBy(desc(inspections.createdAt));

    // Get item counts and media counts for each inspection
    const inspectionsWithCounts = await Promise.all(
      result.map(async (inspection) => {
        // Get checklist items count
        const items = await db
          .select({
            total: sql<number>`count(*)`,
            completed: sql<number>`count(case when ${checklistItems.isCompleted} then 1 end)`,
          })
          .from(checklistItems)
          .leftJoin(checklists, eq(checklistItems.checklistId, checklists.id))
          .leftJoin(inspections, eq(inspections.checklistId, checklists.id))
          .where(eq(inspections.id, inspection.id));

        // Get media count
        const mediaCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(checklistItemMedia)
          .innerJoin(checklistItems, eq(checklistItemMedia.checklistItemId, checklistItems.id))
          .innerJoin(checklists, eq(checklistItems.checklistId, checklists.id))
          .innerJoin(inspections, eq(inspections.checklistId, checklists.id))
          .where(eq(inspections.id, inspection.id));

        return {
          ...inspection,
          totalItems: Number(items[0]?.total || 0),
          completedItems: Number(items[0]?.completed || 0),
          mediaCount: Number(mediaCount[0]?.count || 0),
        };
      })
    );

    return inspectionsWithCounts;
  },
);

export const createInspection = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { checklistId: string; propertyId?: string }) => {
      if (!data.checklistId) throw new Error("Checklist ID is required");
      return data;
    },
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    const token = randomBytes(32).toString("hex");

    const [inspection] = await db
      .insert(inspections)
      .values({
        checklistId: data.checklistId,
        propertyId: data.propertyId || null,
        token,
        status: "pending",
      })
      .returning();

    // Copy checklist items into inspection items
    const items = await db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.checklistId, data.checklistId))
      .orderBy(asc(checklistItems.sortOrder));

    if (items.length > 0) {
      await db.insert(inspectionItems).values(
        items.map((item) => ({
          inspectionId: inspection.id,
          checklistItemId: item.id,
          room: item.room,
          title: item.title,
          description: item.description,
          sortOrder: item.sortOrder,
        })),
      );
    }

    return { inspection, token };
  });

export const getInspections = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdmin();

    const result = await db
      .select({
        inspection: inspections,
        checklistTitle: checklists.title,
        propertyName: properties.name,
      })
      .from(inspections)
      .leftJoin(checklists, eq(inspections.checklistId, checklists.id))
      .leftJoin(properties, eq(inspections.propertyId, properties.id))
      .orderBy(desc(inspections.createdAt));

    // Get completion counts for each inspection
    const withCounts = await Promise.all(
      result.map(async (r) => {
        const items = await db
          .select()
          .from(inspectionItems)
          .where(eq(inspectionItems.inspectionId, r.inspection.id));

        return {
          ...r,
          totalItems: items.length,
          completedItems: items.filter((i) => i.isCompleted).length,
        };
      }),
    );

    return withCounts;
  },
);

export const getInspectionReport = createServerFn({ method: "GET" })
  .inputValidator((data: { inspectionId: string }) => {
    if (!data.inspectionId) throw new Error("Inspection ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();

    const [row] = await db
      .select({
        inspection: inspections,
        checklistTitle: checklists.title,
        propertyName: properties.name,
      })
      .from(inspections)
      .leftJoin(checklists, eq(inspections.checklistId, checklists.id))
      .leftJoin(properties, eq(inspections.propertyId, properties.id))
      .where(eq(inspections.id, data.inspectionId))
      .limit(1);

    if (!row) return { inspection: null, items: [], media: {} };

    const items = await db
      .select()
      .from(inspectionItems)
      .where(eq(inspectionItems.inspectionId, data.inspectionId))
      .orderBy(asc(inspectionItems.sortOrder));

    // Fetch media for all items
    const mediaMap: Record<string, (typeof inspectionMedia.$inferSelect)[]> = {};
    for (const item of items) {
      const itemMedia = await db
        .select()
        .from(inspectionMedia)
        .where(eq(inspectionMedia.inspectionItemId, item.id))
        .orderBy(asc(inspectionMedia.createdAt));
      if (itemMedia.length > 0) {
        mediaMap[item.id] = itemMedia;
      }
    }

    return {
      inspection: row.inspection,
      checklistTitle: row.checklistTitle,
      propertyName: row.propertyName,
      items,
      media: mediaMap,
    };
  });

export const deleteInspection = createServerFn({ method: "POST" })
  .inputValidator((data: { inspectionId: string }) => {
    if (!data.inspectionId) throw new Error("Inspection ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    await db
      .delete(inspections)
      .where(eq(inspections.id, data.inspectionId));
    return { success: true };
  });

// --- Public functions (token-based access) ---

export const getInspectionRoomData = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string; room: string }) => {
    if (!data.token) throw new Error("Token is required");
    if (!data.room) throw new Error("Room is required");
    return data;
  })
  .handler(async ({ data }) => {
    const [row] = await db
      .select({
        inspection: inspections,
        checklistTitle: checklists.title,
        propertyName: properties.name,
      })
      .from(inspections)
      .leftJoin(checklists, eq(inspections.checklistId, checklists.id))
      .leftJoin(properties, eq(inspections.propertyId, properties.id))
      .where(eq(inspections.token, data.token))
      .limit(1);

    if (!row) return { inspection: null, items: [], media: {}, allRooms: [] };

    // Get ALL rooms ordered by the minimum sortOrder of their items
    // This ensures the handyman navigates rooms in the same sequence as the admin checklist page
    const allItems = await db
      .select({
        room: sql<string>`COALESCE(${inspectionItems.room}, 'General')`.as("room"),
        minSort: sql<number>`MIN(${inspectionItems.sortOrder})`.as("min_sort"),
      })
      .from(inspectionItems)
      .where(eq(inspectionItems.inspectionId, row.inspection.id))
      .groupBy(sql`COALESCE(${inspectionItems.room}, 'General')`)
      .orderBy(sql`MIN(${inspectionItems.sortOrder})`);

    const allRooms = allItems.map(item => item.room);

    // Get only items for the specified room
    const roomItems = await db
      .select()
      .from(inspectionItems)
      .where(
        sql`${inspectionItems.inspectionId} = ${row.inspection.id} AND
            COALESCE(${inspectionItems.room}, 'General') = ${data.room}`
      )
      .orderBy(asc(inspectionItems.sortOrder));

    // Fetch media only for items in this room
    const itemIds = roomItems.map(item => item.id);
    const allMedia = itemIds.length > 0
      ? await db
          .select()
          .from(inspectionMedia)
          .where(sql`${inspectionMedia.inspectionItemId} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`)
          .orderBy(asc(inspectionMedia.createdAt))
      : [];

    // Group media by item ID
    const mediaMap: Record<string, (typeof inspectionMedia.$inferSelect)[]> = {};
    for (const media of allMedia) {
      if (!mediaMap[media.inspectionItemId]) {
        mediaMap[media.inspectionItemId] = [];
      }
      mediaMap[media.inspectionItemId].push(media);
    }

    return {
      inspection: row.inspection,
      checklistTitle: row.checklistTitle,
      propertyName: row.propertyName,
      items: roomItems,
      media: mediaMap,
      allRooms,
    };
  });

export const getInspectionByToken = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => {
    if (!data.token) throw new Error("Token is required");
    return data;
  })
  .handler(async ({ data }) => {
    const [row] = await db
      .select({
        inspection: inspections,
        checklistTitle: checklists.title,
        propertyName: properties.name,
      })
      .from(inspections)
      .leftJoin(checklists, eq(inspections.checklistId, checklists.id))
      .leftJoin(properties, eq(inspections.propertyId, properties.id))
      .where(eq(inspections.token, data.token))
      .limit(1);

    if (!row) return { inspection: null, items: [], media: {} };

    const items = await db
      .select()
      .from(inspectionItems)
      .where(eq(inspectionItems.inspectionId, row.inspection.id))
      .orderBy(asc(inspectionItems.sortOrder));

    // Fetch all media for all items in a single query
    const itemIds = items.map(item => item.id);
    const allMedia = itemIds.length > 0
      ? await db
          .select()
          .from(inspectionMedia)
          .where(sql`${inspectionMedia.inspectionItemId} IN (${sql.join(itemIds.map(id => sql`${id}`), sql`, `)})`)
          .orderBy(asc(inspectionMedia.createdAt))
      : [];

    // Group media by item ID
    const mediaMap: Record<string, (typeof inspectionMedia.$inferSelect)[]> = {};
    for (const media of allMedia) {
      if (!mediaMap[media.inspectionItemId]) {
        mediaMap[media.inspectionItemId] = [];
      }
      mediaMap[media.inspectionItemId].push(media);
    }

    return {
      inspection: row.inspection,
      checklistTitle: row.checklistTitle,
      propertyName: row.propertyName,
      items,
      media: mediaMap,
    };
  });

export const startInspection = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => {
    if (!data.token) throw new Error("Token is required");
    return data;
  })
  .handler(async ({ data }) => {
    const [inspection] = await db
      .select()
      .from(inspections)
      .where(eq(inspections.token, data.token))
      .limit(1);

    if (!inspection) throw new Error("Inspection not found");
    if (inspection.status === "completed")
      throw new Error("Inspection already completed");

    await db
      .update(inspections)
      .set({
        status: "in_progress",
        startedAt: inspection.startedAt || new Date(),
      })
      .where(eq(inspections.id, inspection.id));

    return { success: true };
  });

export const updateInspectionItem = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      token: string;
      itemId: string;
      isCompleted?: boolean;
      status?: string;
      comment?: string;
    }) => {
      if (!data.token || !data.itemId) {
        throw new Error("Token and item ID are required");
      }
      return data;
    },
  )
  .handler(async ({ data }) => {
    // Verify token
    const [inspection] = await db
      .select()
      .from(inspections)
      .where(eq(inspections.token, data.token))
      .limit(1);

    if (!inspection) throw new Error("Inspection not found");
    if (inspection.status === "completed")
      throw new Error("Inspection already completed");

    // Verify item belongs to this inspection
    const [item] = await db
      .select()
      .from(inspectionItems)
      .where(eq(inspectionItems.id, data.itemId))
      .limit(1);

    if (!item || item.inspectionId !== inspection.id) {
      throw new Error("Item not found");
    }

    const updates: Record<string, unknown> = {};
    if (data.isCompleted !== undefined) {
      updates.isCompleted = data.isCompleted;
      updates.completedAt = data.isCompleted ? new Date() : null;
    }
    if (data.status !== undefined) updates.status = data.status;
    if (data.comment !== undefined) updates.comment = data.comment;

    await db
      .update(inspectionItems)
      .set(updates)
      .where(eq(inspectionItems.id, data.itemId));

    return { success: true };
  });

export const addInspectionMedia = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      token: string;
      itemId: string;
      url: string;
      fileType: string;
      fileName?: string;
      fileSize?: number;
    }) => {
      if (!data.token || !data.itemId || !data.url) {
        throw new Error("Token, item ID, and URL are required");
      }
      return data;
    },
  )
  .handler(async ({ data }) => {
    // Verify token
    const [inspection] = await db
      .select()
      .from(inspections)
      .where(eq(inspections.token, data.token))
      .limit(1);

    if (!inspection) throw new Error("Inspection not found");

    // Verify item belongs to this inspection
    const [item] = await db
      .select()
      .from(inspectionItems)
      .where(eq(inspectionItems.id, data.itemId))
      .limit(1);

    if (!item || item.inspectionId !== inspection.id) {
      throw new Error("Item not found");
    }

    const [media] = await db
      .insert(inspectionMedia)
      .values({
        inspectionItemId: data.itemId,
        url: data.url,
        fileType: data.fileType,
        fileName: data.fileName || null,
        fileSize: data.fileSize || null,
      })
      .returning();

    return { success: true, media };
  });

export const deleteInspectionMedia = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      token: string;
      mediaId: string;
    }) => {
      if (!data.token || !data.mediaId) {
        throw new Error("Token and media ID are required");
      }
      return data;
    },
  )
  .handler(async ({ data }) => {
    // Verify token
    const [inspection] = await db
      .select()
      .from(inspections)
      .where(eq(inspections.token, data.token))
      .limit(1);

    if (!inspection) throw new Error("Inspection not found");

    // Get media info and verify it belongs to this inspection
    const [media] = await db
      .select({
        media: inspectionMedia,
        item: inspectionItems,
      })
      .from(inspectionMedia)
      .leftJoin(inspectionItems, eq(inspectionMedia.inspectionItemId, inspectionItems.id))
      .where(eq(inspectionMedia.id, data.mediaId))
      .limit(1);

    if (!media || media.item?.inspectionId !== inspection.id) {
      throw new Error("Media not found or access denied");
    }

    // Delete from R2
    try {
      await deleteObject(media.media.url);
    } catch (error) {
      console.error("Failed to delete file from R2:", error);
      // Continue with database deletion even if R2 fails
    }

    // Delete from database
    await db.delete(inspectionMedia).where(eq(inspectionMedia.id, data.mediaId));

    return { success: true };
  });

export const completeInspection = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string; notes?: string }) => {
    if (!data.token) throw new Error("Token is required");
    return data;
  })
  .handler(async ({ data }) => {
    const [inspection] = await db
      .select()
      .from(inspections)
      .where(eq(inspections.token, data.token))
      .limit(1);

    if (!inspection) throw new Error("Inspection not found");
    if (inspection.status === "completed")
      throw new Error("Inspection already completed");

    await db
      .update(inspections)
      .set({
        status: "completed",
        completedAt: new Date(),
        notes: data.notes || null,
      })
      .where(eq(inspections.id, inspection.id));

    return { success: true };
  });

export const getInspectionSummary = createServerFn({ method: "GET" })
  .inputValidator((data: { token: string }) => {
    if (!data.token) throw new Error("Token is required");
    return data;
  })
  .handler(async ({ data }) => {
    // Get inspection with checklist and property info
    const [inspection] = await db
      .select({
        id: inspections.id,
        status: inspections.status,
        notes: inspections.notes,
        completedAt: inspections.completedAt,
        checklistTitle: checklists.title,
        propertyName: properties.name,
      })
      .from(inspections)
      .leftJoin(checklists, eq(inspections.checklistId, checklists.id))
      .leftJoin(properties, eq(inspections.propertyId, properties.id))
      .where(eq(inspections.token, data.token))
      .limit(1);

    if (!inspection) throw new Error("Inspection not found");

    // Get all items with media count
    const items = await db
      .select({
        id: checklistItems.id,
        title: checklistItems.title,
        room: checklistItems.room,
        isCompleted: checklistItems.isCompleted,
      })
      .from(checklistItems)
      .leftJoin(inspections, eq(inspections.token, data.token))
      .where(eq(checklistItems.checklistId, inspections.checklistId))
      .orderBy(asc(checklistItems.sortOrder));

    // Get media count for each item
    const itemsWithMedia = await Promise.all(
      items.map(async (item) => {
        const mediaCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(checklistItemMedia)
          .where(eq(checklistItemMedia.checklistItemId, item.id));

        return {
          ...item,
          mediaCount: Number(mediaCount[0]?.count || 0),
        };
      })
    );

    // Calculate total media
    const totalMedia = itemsWithMedia.reduce((sum, item) => sum + item.mediaCount, 0);

    return {
      ...inspection,
      items: itemsWithMedia,
      totalMedia,
    };
  });
