import { createServerFn } from "@tanstack/react-start";
import { eq, asc } from "drizzle-orm";
import { getCookie } from "@tanstack/react-start/server";

import { db } from "../../db";
import { checklists, checklistItems, checklistItemMedia, inspections } from "../../db/schema";
import { deleteObject } from "../../lib/s3";

// For public handyman access, we need to validate via inspection token
async function validateHandymanAccess(checklistId: string) {
  const token = getCookie("inspection_token");
  if (!token) {
    throw new Error("Access denied - invalid token");
  }

  // Check if there's an active inspection for this checklist with the given token
  const [inspection] = await db
    .select()
    .from(inspections)
    .where(eq(inspections.token, token))
    .limit(1);

  if (!inspection || inspection.checklistId !== checklistId) {
    throw new Error("Access denied - invalid token for this checklist");
  }

  return inspection;
}

export const getChecklistForHandyman = createServerFn({ method: "GET" })
  .inputValidator((data: { checklistId: string }) => {
    if (!data.checklistId) throw new Error("Checklist ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    await validateHandymanAccess(data.checklistId);

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

export const uploadHandymanMedia = createServerFn({ method: "POST" })
  .inputValidator((data: {
    checklistId: string;
    checklistItemId: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    filePath: string;
    description?: string;
  }) => {
    if (!data.checklistId || !data.checklistItemId || !data.fileName) {
      throw new Error("Checklist ID, item ID, and file name are required");
    }
    return data;
  })
  .handler(async ({ data }) => {
    const inspection = await validateHandymanAccess(data.checklistId);

    const [media] = await db
      .insert(checklistItemMedia)
      .values({
        checklistItemId: data.checklistItemId,
        fileName: data.fileName,
        originalName: data.originalName,
        mimeType: data.mimeType,
        fileSize: data.fileSize,
        filePath: data.filePath,
        uploadedBy: inspection.id, // Use inspection ID as uploader
        uploaderType: "handyman",
        description: data.description || null,
      })
      .returning();

    return { success: true, media };
  });

export const toggleChecklistItemForHandyman = createServerFn({ method: "POST" })
  .inputValidator((data: {
    checklistId: string;
    itemId: string;
    isCompleted: boolean
  }) => {
    if (!data.checklistId || !data.itemId) throw new Error("Checklist ID and item ID are required");
    return data;
  })
  .handler(async ({ data }) => {
    const inspection = await validateHandymanAccess(data.checklistId);

    await db
      .update(checklistItems)
      .set({
        isCompleted: data.isCompleted,
        completedAt: data.isCompleted ? new Date() : null,
        completedBy: data.isCompleted ? inspection.id : null, // Use inspection ID
      })
      .where(eq(checklistItems.id, data.itemId));

    return { success: true };
  });

export const deleteHandymanMedia = createServerFn({ method: "POST" })
  .inputValidator((data: {
    checklistId: string;
    mediaId: string;
  }) => {
    if (!data.checklistId || !data.mediaId) throw new Error("Checklist ID and media ID are required");
    return data;
  })
  .handler(async ({ data }) => {
    // Validate access
    await validateHandymanAccess(data.checklistId);

    // Get the media record to get the file path
    const [media] = await db
      .select()
      .from(checklistItemMedia)
      .where(eq(checklistItemMedia.id, data.mediaId))
      .limit(1);

    if (media && media.uploaderType === "handyman") {
      // Delete from R2
      await deleteObject(media.filePath);

      // Delete from database
      await db.delete(checklistItemMedia).where(eq(checklistItemMedia.id, data.mediaId));
    }

    return { success: true };
  });