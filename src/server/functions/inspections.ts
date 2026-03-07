import { createServerFn } from "@tanstack/react-start";
import { eq, asc, desc } from "drizzle-orm";
import { randomBytes } from "crypto";

import { db } from "../../db";
import {
  inspections,
  inspectionItems,
  inspectionMedia,
  checklists,
  checklistItems,
  properties,
} from "../../db/schema";
import { requireAdmin } from "../middleware/admin";

// --- Admin functions ---

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
