import { createServerFn } from "@tanstack/react-start";
import { eq, and } from "drizzle-orm";

import { db } from "../../db";
import { properties, propertyPhotos, propertyMedia } from "../../db/schema";

export const getProperties = createServerFn({ method: "GET" }).handler(
  async () => {
    const result = await db
      .select()
      .from(properties)
      .where(eq(properties.isActive, true));

    // Get thumbnail media for each property
    const propertiesWithMedia = await Promise.all(
      result.map(async (property) => {
        const thumbnailMedia = await db
          .select()
          .from(propertyMedia)
          .where(
            and(
              eq(propertyMedia.propertyId, property.id),
              eq(propertyMedia.category, 'thumbnail')
            )
          )
          .limit(1);

        const heroMedia = await db
          .select()
          .from(propertyMedia)
          .where(
            and(
              eq(propertyMedia.propertyId, property.id),
              eq(propertyMedia.category, 'hero')
            )
          )
          .limit(1);

        return {
          ...property,
          thumbnailUrl: thumbnailMedia[0]?.url || heroMedia[0]?.url || null,
        };
      })
    );

    return propertiesWithMedia;
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
