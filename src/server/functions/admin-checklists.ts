import { createServerFn } from "@tanstack/react-start";
import { eq, asc } from "drizzle-orm";

import { db } from "../../db";
import { checklists, checklistItems, properties } from "../../db/schema";
import { requireAdmin } from "../middleware/admin";

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

    return { checklist, items };
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
    (data: { checklistId: string; title: string; sortOrder?: number }) => {
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
        sortOrder: data.sortOrder ?? 0,
      })
      .returning();

    return { success: true, item };
  });

export const toggleChecklistItem = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { itemId: string; isCompleted: boolean }) => {
      if (!data.itemId) throw new Error("Item ID is required");
      return data;
    },
  )
  .handler(async ({ data }) => {
    const admin = await requireAdmin();

    await db
      .update(checklistItems)
      .set({
        isCompleted: data.isCompleted,
        completedAt: data.isCompleted ? new Date() : null,
        completedBy: data.isCompleted ? admin.id : null,
      })
      .where(eq(checklistItems.id, data.itemId));

    return { success: true };
  });

export const deleteChecklist = createServerFn({ method: "POST" })
  .inputValidator((data: { checklistId: string }) => {
    if (!data.checklistId) throw new Error("Checklist ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    await db.delete(checklists).where(eq(checklists.id, data.checklistId));
    return { success: true };
  });
