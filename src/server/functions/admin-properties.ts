import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

import { db } from "../../db";
import { properties, propertyPhotos } from "../../db/schema";
import { requireAdmin } from "../middleware/admin";
import { propertySchema } from "../../lib/validators";

export const getAdminProperties = createServerFn({ method: "GET" }).handler(
  async () => {
    await requireAdmin();

    const result = await db
      .select()
      .from(properties)
      .orderBy(properties.name);

    return result;
  },
);

export const getAdminPropertyBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => {
    if (!data.slug) throw new Error("Slug is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();

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

export const createProperty = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    return propertySchema.parse(data);
  })
  .handler(async ({ data }) => {
    await requireAdmin();

    const [existing] = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.slug, data.slug))
      .limit(1);

    if (existing) {
      throw new Error("A property with this slug already exists");
    }

    const [property] = await db
      .insert(properties)
      .values({
        slug: data.slug,
        name: data.name,
        tagline: data.tagline || null,
        description: data.description || null,
        moreDetails: data.moreDetails || null,
        maxGuests: data.maxGuests,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        beds: data.beds,
        cleaningFee: data.cleaningFee,
        nightlyRate: data.nightlyRate,
        petFee: data.petFee,
        maxPets: data.maxPets,
        minStay: data.minStay,
        checkInTime: data.checkInTime || "16:00",
        checkOutTime: data.checkOutTime || "11:00",
        houseRules: data.houseRules || null,
        address: data.address || null,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        amenities: data.amenities,
        highlight: data.highlight || null,
        isActive: data.isActive,
      })
      .returning();

    return { success: true, property };
  });

export const updateProperty = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string; updates: unknown }) => {
    const validatedUpdates = propertySchema.partial().parse(data.updates);
    return { slug: data.slug, updates: validatedUpdates };
  })
  .handler(async ({ data }) => {
    await requireAdmin();

    const [existing] = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.slug, data.slug))
      .limit(1);

    if (!existing) throw new Error("Property not found");

    // If slug is being changed, check for conflicts
    if (data.updates.slug && data.updates.slug !== data.slug) {
      const [conflict] = await db
        .select({ id: properties.id })
        .from(properties)
        .where(eq(properties.slug, data.updates.slug))
        .limit(1);

      if (conflict) throw new Error("A property with this slug already exists");
    }

    const updateValues: Record<string, unknown> = { updatedAt: new Date() };

    if (data.updates.slug !== undefined) updateValues.slug = data.updates.slug;
    if (data.updates.name !== undefined) updateValues.name = data.updates.name;
    if (data.updates.tagline !== undefined)
      updateValues.tagline = data.updates.tagline || null;
    if (data.updates.description !== undefined)
      updateValues.description = data.updates.description || null;
    if (data.updates.moreDetails !== undefined)
      updateValues.moreDetails = data.updates.moreDetails || null;
    if (data.updates.maxGuests !== undefined)
      updateValues.maxGuests = data.updates.maxGuests;
    if (data.updates.bedrooms !== undefined)
      updateValues.bedrooms = data.updates.bedrooms;
    if (data.updates.bathrooms !== undefined)
      updateValues.bathrooms = data.updates.bathrooms;
    if (data.updates.beds !== undefined) updateValues.beds = data.updates.beds;
    if (data.updates.cleaningFee !== undefined)
      updateValues.cleaningFee = data.updates.cleaningFee;
    if (data.updates.nightlyRate !== undefined)
      updateValues.nightlyRate = data.updates.nightlyRate;
    if (data.updates.petFee !== undefined)
      updateValues.petFee = data.updates.petFee;
    if (data.updates.maxPets !== undefined)
      updateValues.maxPets = data.updates.maxPets;
    if (data.updates.minStay !== undefined)
      updateValues.minStay = data.updates.minStay;
    if (data.updates.checkInTime !== undefined)
      updateValues.checkInTime = data.updates.checkInTime || "16:00";
    if (data.updates.checkOutTime !== undefined)
      updateValues.checkOutTime = data.updates.checkOutTime || "11:00";
    if (data.updates.houseRules !== undefined)
      updateValues.houseRules = data.updates.houseRules || null;
    if (data.updates.address !== undefined)
      updateValues.address = data.updates.address || null;
    if (data.updates.latitude !== undefined)
      updateValues.latitude = data.updates.latitude ? parseFloat(data.updates.latitude) : null;
    if (data.updates.longitude !== undefined)
      updateValues.longitude = data.updates.longitude ? parseFloat(data.updates.longitude) : null;
    if (data.updates.amenities !== undefined)
      updateValues.amenities = data.updates.amenities;
    if (data.updates.highlight !== undefined)
      updateValues.highlight = data.updates.highlight || null;
    if (data.updates.isActive !== undefined)
      updateValues.isActive = data.updates.isActive;

    const [property] = await db
      .update(properties)
      .set(updateValues)
      .where(eq(properties.slug, data.slug))
      .returning();

    return { success: true, property };
  });

export const deleteProperty = createServerFn({ method: "POST" })
  .inputValidator((data: { slug: string }) => {
    if (!data.slug) throw new Error("Slug is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();

    const [property] = await db
      .delete(properties)
      .where(eq(properties.slug, data.slug))
      .returning({ id: properties.id });

    if (!property) throw new Error("Property not found");

    return { success: true };
  });

export const addPropertyPhoto = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      propertyId: string;
      url: string;
      alt?: string;
      sortOrder?: number;
      isCover?: boolean;
    }) => {
      if (!data.propertyId || !data.url) throw new Error("Missing required fields");
      return data;
    },
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    // If setting as cover, unset other covers first
    if (data.isCover) {
      await db
        .update(propertyPhotos)
        .set({ isCover: false })
        .where(eq(propertyPhotos.propertyId, data.propertyId));
    }

    const [photo] = await db
      .insert(propertyPhotos)
      .values({
        propertyId: data.propertyId,
        url: data.url,
        alt: data.alt || null,
        sortOrder: data.sortOrder ?? 0,
        isCover: data.isCover ?? false,
      })
      .returning();

    return { success: true, photo };
  });

export const updatePropertyPhoto = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      photoId: string;
      propertyId: string;
      url?: string;
      alt?: string;
      sortOrder?: number;
      isCover?: boolean;
    }) => {
      if (!data.photoId || !data.propertyId) throw new Error("Missing required fields");
      return data;
    },
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    // If setting as cover, unset other covers first
    if (data.isCover) {
      await db
        .update(propertyPhotos)
        .set({ isCover: false })
        .where(eq(propertyPhotos.propertyId, data.propertyId));
    }

    const updateValues: Record<string, unknown> = {};
    if (data.url !== undefined) updateValues.url = data.url;
    if (data.alt !== undefined) updateValues.alt = data.alt;
    if (data.sortOrder !== undefined) updateValues.sortOrder = data.sortOrder;
    if (data.isCover !== undefined) updateValues.isCover = data.isCover;

    const [photo] = await db
      .update(propertyPhotos)
      .set(updateValues)
      .where(eq(propertyPhotos.id, data.photoId))
      .returning();

    return { success: true, photo };
  });

export const deletePropertyPhoto = createServerFn({ method: "POST" })
  .inputValidator((data: { photoId: string }) => {
    if (!data.photoId) throw new Error("Photo ID is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();

    await db
      .delete(propertyPhotos)
      .where(eq(propertyPhotos.id, data.photoId));

    return { success: true };
  });

export const reorderPropertyPhotos = createServerFn({ method: "POST" })
  .inputValidator((data: { photos: { id: string; sortOrder: number; isCover: boolean }[] }) => {
    if (!data.photos?.length) throw new Error("Photos array is required");
    return data;
  })
  .handler(async ({ data }) => {
    await requireAdmin();

    for (const photo of data.photos) {
      await db
        .update(propertyPhotos)
        .set({ sortOrder: photo.sortOrder, isCover: photo.isCover })
        .where(eq(propertyPhotos.id, photo.id));
    }

    return { success: true };
  });
