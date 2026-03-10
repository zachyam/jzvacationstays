import { createServerFn } from "@tanstack/react-start";
import { eq, asc } from "drizzle-orm";

import { db } from "../../db";
import { checklists, checklistItems, properties, checklistItemMedia } from "../../db/schema";
import { requireAdmin } from "../middleware/admin";
import { deleteObject, deleteObjects, moveObject } from "../../lib/s3";

export const getChecklists = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdmin();

    const result = await db
      .select({
        checklist: checklists,
        propertyName: properties.name,
      })
      .from(checklists)
      .leftJoin(properties, eq(checklists.propertyId, properties.id))
      .orderBy(asc(checklists.title));

    return result;
  },
);

export const getChecklistById = createServerFn({ method: "GET" })
  .inputValidator((data: { checklistId: string }) => {
    if (!data.checklistId) throw new Error("Checklist ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();

    const [checklist] = await db
      .select()
      .from(checklists)
      .where(eq(checklists.id, data.checklistId))
      .limit(1);

    if (!checklist) return { checklist: null, items: [] };

    const items = await db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.checklistId, data.checklistId))
      .orderBy(asc(checklistItems.sortOrder));

    // Get media for each item
    const itemsWithMedia = await Promise.all(
      items.map(async (item) => {
        const media = await db
          .select()
          .from(checklistItemMedia)
          .where(eq(checklistItemMedia.checklistItemId, item.id))
          .orderBy(asc(checklistItemMedia.createdAt));

        return { ...item, media };
      })
    );

    return { checklist, items: itemsWithMedia };
  });

export const createChecklist = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { title: string; type: string; propertyId?: string }) => {
      if (!data.title) throw new Error("Title is required");
      return data;
    },
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin();

    const [checklist] = await db
      .insert(checklists)
      .values({
        title: data.title,
        type: data.type || "maintenance",
        propertyId: data.propertyId,
        createdBy: admin.id,
      })
      .returning();

    return { success: true, checklist };
  });

export const addChecklistItem = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      checklistId: string;
      title: string;
      room?: string;
      description?: string;
      sortOrder?: number;
    }) => {
      if (!data.checklistId || !data.title) {
        throw new Error("Checklist ID and title are required");
      }
      return data;
    },
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    const [item] = await db
      .insert(checklistItems)
      .values({
        checklistId: data.checklistId,
        title: data.title,
        room: data.room || null,
        description: data.description || null,
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();

    return { success: true, item };
  });


export const deleteChecklist = createServerFn({ method: "POST" })
  .inputValidator((data: { checklistId: string }) => {
    if (!data.checklistId) throw new Error("Checklist ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();

    // Get all items for this checklist
    const items = await db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.checklistId, data.checklistId));

    // Get all media for all items
    if (items.length > 0) {
      const itemIds = items.map(i => i.id);
      const media = await db
        .select()
        .from(checklistItemMedia)
        .where(eq(checklistItemMedia.checklistItemId, itemIds[0])); // This needs fixing for multiple items

      // Actually, let's do it properly with a loop or join
      const allMedia = [];
      for (const item of items) {
        const itemMedia = await db
          .select()
          .from(checklistItemMedia)
          .where(eq(checklistItemMedia.checklistItemId, item.id));
        allMedia.push(...itemMedia);
      }

      if (allMedia.length > 0) {
        // Delete all media files from R2
        const filePaths = allMedia.map(m => m.filePath);
        await deleteObjects(filePaths);
      }
    }

    // Delete the checklist (cascade will delete items and media records from DB)
    await db.delete(checklists).where(eq(checklists.id, data.checklistId));
    return { success: true };
  });

export const saveChecklistMedia = createServerFn({ method: "POST" })
  .inputValidator((data: {
    checklistItemId: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    filePath: string;
    tempKey?: string; // For moving from temp to permanent location
    description?: string;
  }) => {
    if (!data.checklistItemId || !data.fileName || !data.filePath) {
      throw new Error("Item ID, file name, and file path are required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin();

    let finalFilePath = data.filePath;

    // If this is a temporary file, move it to permanent location
    if (data.tempKey && data.tempKey.startsWith('temp/')) {
      const permanentKey = data.tempKey.replace('temp/', 'checklists/');
      finalFilePath = await moveObject(data.tempKey, permanentKey);
    }

    const [media] = await db
      .insert(checklistItemMedia)
      .values({
        checklistItemId: data.checklistItemId,
        fileName: data.fileName,
        originalName: data.originalName,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        filePath: finalFilePath,
        uploadedBy: admin.id,
        uploaderType: "admin",
        description: data.description || null,
      })
      .returning();

    return { success: true, media };
  });

export const deleteChecklistMedia = createServerFn({ method: "POST" })
  .inputValidator((data: { mediaId: string }) => {
    if (!data.mediaId) throw new Error("Media ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();

    // First get the media record to get the file path
    const [media] = await db
      .select()
      .from(checklistItemMedia)
      .where(eq(checklistItemMedia.id, data.mediaId))
      .limit(1);

    if (media) {
      // Delete from R2
      await deleteObject(media.filePath);
    }

    // Delete from database
    await db.delete(checklistItemMedia).where(eq(checklistItemMedia.id, data.mediaId));
    return { success: true };
  });

export const deleteChecklistItem = createServerFn({ method: "POST" })
  .inputValidator((data: { itemId: string }) => {
    if (!data.itemId) throw new Error("Item ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();

    // Get all media for this item to delete from R2
    const media = await db
      .select()
      .from(checklistItemMedia)
      .where(eq(checklistItemMedia.checklistItemId, data.itemId));

    if (media.length > 0) {
      // Delete all media files from R2
      const filePaths = media.map(m => m.filePath);
      await deleteObjects(filePaths);
    }

    // Delete the item (cascade will delete media records from DB)
    await db.delete(checklistItems).where(eq(checklistItems.id, data.itemId));
    return { success: true };
  });

export const updateChecklistItem = createServerFn({ method: "POST" })
  .inputValidator((data: {
    itemId: string;
    title?: string;
    room?: string | null;
    description?: string | null;
  }) => {
    if (!data.itemId) throw new Error("Item ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.room !== undefined) updateData.room = data.room;
    if (data.description !== undefined) updateData.description = data.description;

    await db
      .update(checklistItems)
      .set(updateData)
      .where(eq(checklistItems.id, data.itemId));

    return { success: true };
  });

export const uploadChecklistItemMedia = createServerFn({ method: "POST" })
  .inputValidator((data: {
    checklistItemId: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    filePath: string;
    description?: string;
  }) => {
    if (!data.checklistItemId || !data.fileName) {
      throw new Error("Checklist item ID and file name are required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin();

    const [media] = await db
      .insert(checklistItemMedia)
      .values({
        checklistItemId: data.checklistItemId,
        fileName: data.fileName,
        originalName: data.originalName,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        filePath: data.filePath,
        uploadedBy: admin.id,
        uploaderType: "admin",
        description: data.description || null,
      })
      .returning();

    return { success: true, media };
  });

export const deleteChecklistItemMedia = createServerFn({ method: "POST" })
  .inputValidator((data: { mediaId: string }) => {
    if (!data.mediaId) throw new Error("Media ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    await db.delete(checklistItemMedia).where(eq(checklistItemMedia.id, data.mediaId));
    return { success: true };
  });

export const updateChecklistItemMedia = createServerFn({ method: "POST" })
  .inputValidator((data: {
    mediaId: string;
    description?: string;
  }) => {
    if (!data.mediaId) throw new Error("Media ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();

    await db
      .update(checklistItemMedia)
      .set({ description: data.description || null })
      .where(eq(checklistItemMedia.id, data.mediaId));

    return { success: true };
  });
