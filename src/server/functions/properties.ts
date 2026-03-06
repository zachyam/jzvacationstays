import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

import { db } from "../../db";
import { properties, propertyPhotos } from "../../db/schema";

export const getProperties = createServerFn({ method: "GET" }).handler(
  async () => {
    const result = await db
      .select()
      .from(properties)
      .where(eq(properties.isActive, true));

    return result;
  },
);

export const getPropertyBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => {
    if (!data.slug) throw new Error("Slug is required");
    return data;
  })
  .handler(async ({ data }) => {
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.slug, data.slug))
      .limit(1);

    if (!property) return { property: null, photos: [] };

    const photos = await db
      .select()
      .from(propertyPhotos)
      .where(eq(propertyPhotos.propertyId, property.id))
      .orderBy(propertyPhotos.sortOrder);

    return { property, photos };
  });
