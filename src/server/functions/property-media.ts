import { createServerFn } from "@tanstack/react-start";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import sharp from "sharp";
import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import { db } from "../../db";
import { propertyMedia, roomTypes, roomMedia } from "../../db/schema";
import { getS3Client } from "../../lib/s3";
import { deleteObject } from "../../lib/s3";
import { requireAdmin } from "../middleware/admin";

// Get all media for a property
export const getPropertyMedia = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      propertyId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const media = await db
      .select()
      .from(propertyMedia)
      .where(eq(propertyMedia.propertyId, data.propertyId))
      .orderBy(propertyMedia.sortOrder, propertyMedia.createdAt);

    return { media };
  });

// Upload property media
export const uploadPropertyMedia = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      propertyId: z.string().uuid(),
      file: z.string(), // Base64 encoded
      contentType: z.string(),
      fileName: z.string(),
      fileSize: z.number(),
      caption: z.string().optional(),
      category: z.enum(["hero", "gallery", "exterior", "amenity"]).default("gallery"),
    })
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    // Convert base64 to buffer
    let buffer = Buffer.from(data.file.split(',')[1] || data.file, 'base64');
    let contentType = data.contentType;
    let ext = data.fileName.split(".").pop()?.toLowerCase() || "bin";

    // Convert HEIC/HEIF images to JPEG
    const isHeicFile = contentType === 'image/heic' || contentType === 'image/heif' || ext === 'heic' || ext === 'heif';
    if (isHeicFile) {
      try {
        console.log('Converting HEIC/HEIF image to JPEG...');
        buffer = await sharp(buffer)
          .jpeg({ quality: 90 })
          .toBuffer();
        contentType = 'image/jpeg';
        ext = 'jpg';
      } catch (error) {
        console.error('Failed to convert HEIC/HEIF:', error);
      }
    }

    // Resize image for optimization (max 2000px width, maintain aspect ratio)
    try {
      buffer = await sharp(buffer)
        .resize(2000, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
      contentType = 'image/jpeg';
      if (ext !== 'jpg' && ext !== 'jpeg') {
        ext = 'jpg';
      }
    } catch (error) {
      console.error('Failed to optimize image:', error);
    }

    const fileName = `${randomUUID()}.${ext}`;
    const key = `properties/${data.propertyId}/${data.category}/${fileName}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET || "jzvacationstays",
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await getS3Client().send(command);

    const publicUrl = `${process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`}/${key}`;

    // Save to database
    const [media] = await db
      .insert(propertyMedia)
      .values({
        propertyId: data.propertyId,
        url: publicUrl,
        caption: data.caption,
        type: "image",
        category: data.category,
        sortOrder: 0,
      })
      .returning();

    return { media };
  });

// Delete property media
export const deletePropertyMedia = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      mediaId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    const [media] = await db
      .select()
      .from(propertyMedia)
      .where(eq(propertyMedia.id, data.mediaId));

    if (!media) {
      throw new Error("Media not found");
    }

    // Delete from S3
    await deleteObject(media.url);

    // Delete from database
    await db.delete(propertyMedia).where(eq(propertyMedia.id, data.mediaId));

    return { success: true };
  });

// Update media order
export const updateMediaOrder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      updates: z.array(
        z.object({
          id: z.string().uuid(),
          sortOrder: z.number(),
        })
      ),
    })
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    // Update each media item's sort order
    for (const update of data.updates) {
      await db
        .update(propertyMedia)
        .set({ sortOrder: update.sortOrder })
        .where(eq(propertyMedia.id, update.id));
    }

    return { success: true };
  });

// Room type management
export const getRoomTypes = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      propertyId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const rooms = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.propertyId, data.propertyId))
      .orderBy(roomTypes.sortOrder, roomTypes.createdAt);

    // Get media for each room
    const roomsWithMedia = await Promise.all(
      rooms.map(async (room) => {
        const media = await db
          .select()
          .from(roomMedia)
          .where(eq(roomMedia.roomTypeId, room.id))
          .orderBy(roomMedia.sortOrder, roomMedia.createdAt);

        return { ...room, media };
      })
    );

    return { rooms: roomsWithMedia };
  });

// Create room type
export const createRoomType = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      propertyId: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().optional(),
      beds: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    const [room] = await db
      .insert(roomTypes)
      .values({
        propertyId: data.propertyId,
        name: data.name,
        description: data.description,
        beds: data.beds,
        sortOrder: 0,
      })
      .returning();

    return { room };
  });

// Update room type
export const updateRoomType = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      roomId: z.string().uuid(),
      name: z.string().min(1),
      description: z.string().optional().nullable(),
      beds: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    const [room] = await db
      .update(roomTypes)
      .set({
        name: data.name,
        description: data.description,
        beds: data.beds,
        updatedAt: new Date(),
      })
      .where(eq(roomTypes.id, data.roomId))
      .returning();

    return { room };
  });

// Delete room type
export const deleteRoomType = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      roomId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    // Get all media for this room to delete from S3
    const media = await db
      .select()
      .from(roomMedia)
      .where(eq(roomMedia.roomTypeId, data.roomId));

    // Delete all media from S3
    for (const item of media) {
      await deleteObject(item.url);
    }

    // Delete room (cascade will delete media)
    await db.delete(roomTypes).where(eq(roomTypes.id, data.roomId));

    return { success: true };
  });

// Upload room media
export const uploadRoomMedia = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      roomTypeId: z.string().uuid(),
      file: z.string(), // Base64 encoded
      contentType: z.string(),
      fileName: z.string(),
      fileSize: z.number(),
      caption: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    // Get room to get property ID
    const [room] = await db
      .select()
      .from(roomTypes)
      .where(eq(roomTypes.id, data.roomTypeId));

    if (!room) {
      throw new Error("Room type not found");
    }

    // Convert base64 to buffer
    let buffer = Buffer.from(data.file.split(',')[1] || data.file, 'base64');
    let contentType = data.contentType;
    let ext = data.fileName.split(".").pop()?.toLowerCase() || "bin";

    // Convert HEIC/HEIF images to JPEG
    const isHeicFile = contentType === 'image/heic' || contentType === 'image/heif' || ext === 'heic' || ext === 'heif';
    if (isHeicFile) {
      try {
        buffer = await sharp(buffer)
          .jpeg({ quality: 90 })
          .toBuffer();
        contentType = 'image/jpeg';
        ext = 'jpg';
      } catch (error) {
        console.error('Failed to convert HEIC/HEIF:', error);
      }
    }

    // Resize image for optimization
    try {
      buffer = await sharp(buffer)
        .resize(1600, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ quality: 85, progressive: true })
        .toBuffer();
      contentType = 'image/jpeg';
      if (ext !== 'jpg' && ext !== 'jpeg') {
        ext = 'jpg';
      }
    } catch (error) {
      console.error('Failed to optimize image:', error);
    }

    const fileName = `${randomUUID()}.${ext}`;
    const roomSlug = room.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const key = `properties/${room.propertyId}/rooms/${roomSlug}/${fileName}`;

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET || "jzvacationstays",
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await getS3Client().send(command);

    const publicUrl = `${process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`}/${key}`;

    // Save to database
    const [media] = await db
      .insert(roomMedia)
      .values({
        roomTypeId: data.roomTypeId,
        url: publicUrl,
        caption: data.caption,
        type: "image",
        sortOrder: 0,
      })
      .returning();

    return { media };
  });

// Delete room media
export const deleteRoomMedia = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      mediaId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    await requireAdmin();

    const [media] = await db
      .select()
      .from(roomMedia)
      .where(eq(roomMedia.id, data.mediaId));

    if (!media) {
      throw new Error("Media not found");
    }

    // Delete from S3
    await deleteObject(media.url);

    // Delete from database
    await db.delete(roomMedia).where(eq(roomMedia.id, data.mediaId));

    return { success: true };
  });