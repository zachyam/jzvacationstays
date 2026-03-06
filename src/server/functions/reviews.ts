import { createServerFn } from "@tanstack/react-start";
import { eq, and, desc } from "drizzle-orm";

import { db } from "../../db";
import { reviews } from "../../db/schema";

export const getReviewsByProperty = createServerFn({ method: "GET" })
  .inputValidator((data: { propertyId: string }) => {
    if (!data.propertyId) throw new Error("Property ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    const result = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.propertyId, data.propertyId),
          eq(reviews.isVisible, true),
        ),
      )
      .orderBy(desc(reviews.createdAt));

    return result;
  });
