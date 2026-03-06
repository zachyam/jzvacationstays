import { createServerFn } from "@tanstack/react-start";
import { eq, desc } from "drizzle-orm";

import { db } from "../../db";
import { reviews, properties } from "../../db/schema";
import { requireAdmin } from "../middleware/admin";

export const getAdminReviews = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdmin();

    const result = await db
      .select({
        review: reviews,
        propertyName: properties.name,
      })
      .from(reviews)
      .innerJoin(properties, eq(reviews.propertyId, properties.id))
      .orderBy(desc(reviews.createdAt));

    return result;
  },
);

export const toggleReviewVisibility = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { reviewId: string; isVisible: boolean }) => {
      if (!data.reviewId) throw new Error("Review ID is required");
      return data;
    },
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    await db
      .update(reviews)
      .set({ isVisible: data.isVisible })
      .where(eq(reviews.id, data.reviewId));

    return { success: true };
  });
