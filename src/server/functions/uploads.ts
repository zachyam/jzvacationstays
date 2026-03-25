import { createServerFn } from "@tanstack/react-start";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

import { getPresignedUploadUrl } from "../../lib/s3";
import { db } from "../../db";
import { inspections, inspectionItems, properties } from "../../db/schema";

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

function getS3Client() {
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
}

export const getUploadUrl = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      inspectionId: string;
      itemId: string;
      contentType: string;
      fileName: string;
      fileSize: number;
    }) => {
      if (!data.inspectionId || !data.itemId || !data.contentType) {
        throw new Error("Missing required fields");
      }
      return data;
    },
  )
  .handler(async ({ data }) => {
    const isImage = ALLOWED_IMAGE_TYPES.includes(data.contentType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(data.contentType);

    if (!isImage && !isVideo) {
      throw new Error(
        "Unsupported file type. Use JPEG, PNG, WebP, HEIC, MP4, MOV, or WebM.",
      );
    }

    if (data.fileSize > MAX_FILE_SIZE) {
      throw new Error("File too large. Maximum size is 100MB.");
    }

    // Get inspection and property information for organized file paths
    const [inspectionInfo] = await db
      .select({
        inspectionId: inspections.id,
        propertyName: properties.name,
      })
      .from(inspections)
      .leftJoin(properties, eq(inspections.propertyId, properties.id))
      .where(eq(inspections.id, data.inspectionId))
      .limit(1);

    if (!inspectionInfo) {
      throw new Error("Inspection not found");
    }

    // Get inspection item for room information
    const [itemInfo] = await db
      .select({
        room: inspectionItems.room,
      })
      .from(inspectionItems)
      .where(eq(inspectionItems.id, data.itemId))
      .limit(1);

    // Create descriptive path with datetime, property, and room
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const datetime = `${date}_${time}`;
    const sanitize = (str: string) => str?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'unknown';

    const propertyName = sanitize(inspectionInfo.propertyName || 'property');
    const roomName = sanitize(itemInfo?.room || 'general');
    const ext = data.fileName.split(".").pop() || "bin";
    const fileName = `${randomUUID()}.${ext}`;

    const key = `inspections/${propertyName}/${datetime}/${data.inspectionId}/${roomName}/${fileName}`;

    const { uploadUrl, publicUrl } = await getPresignedUploadUrl(
      key,
      data.contentType,
    );

    return {
      uploadUrl,
      publicUrl,
      fileType: isImage ? "image" : "video",
    };
  });

// Server-side upload function that handles the file upload to avoid CORS issues
export const uploadInspectionFile = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      inspectionId: string;
      itemId: string;
      file: string; // Base64 encoded file
      contentType: string;
      fileName: string;
      fileSize: number;
    }) => {
      if (!data.inspectionId || !data.itemId || !data.file || !data.contentType) {
        throw new Error("Missing required fields");
      }
      return data;
    },
  )
  .handler(async ({ data }) => {
    const isImage = ALLOWED_IMAGE_TYPES.includes(data.contentType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(data.contentType);

    if (!isImage && !isVideo) {
      throw new Error(
        "Unsupported file type. Use JPEG, PNG, WebP, HEIC, MP4, MOV, or WebM.",
      );
    }

    if (data.fileSize > MAX_FILE_SIZE) {
      throw new Error("File too large. Maximum size is 100MB.");
    }

    // Get inspection and property information for organized file paths
    const [inspectionInfo] = await db
      .select({
        inspectionId: inspections.id,
        propertyName: properties.name,
      })
      .from(inspections)
      .leftJoin(properties, eq(inspections.propertyId, properties.id))
      .where(eq(inspections.id, data.inspectionId))
      .limit(1);

    if (!inspectionInfo) {
      throw new Error("Inspection not found");
    }

    // Get inspection item for room information
    const [itemInfo] = await db
      .select({
        room: inspectionItems.room,
      })
      .from(inspectionItems)
      .where(eq(inspectionItems.id, data.itemId))
      .limit(1);

    // Create descriptive path with datetime, property, and room
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const datetime = `${date}_${time}`;
    const sanitize = (str: string) => str?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'unknown';

    const propertyName = sanitize(inspectionInfo.propertyName || 'property');
    const roomName = sanitize(itemInfo?.room || 'general');
    const ext = data.fileName.split(".").pop() || "bin";
    const fileName = `${randomUUID()}.${ext}`;

    const key = `inspections/${propertyName}/${datetime}/${data.inspectionId}/${roomName}/${fileName}`;

    // Convert base64 to buffer
    const buffer = Buffer.from(data.file.split(',')[1] || data.file, 'base64');

    // Upload directly to S3 from server
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET || "jzvacationstays",
      Key: key,
      Body: buffer,
      ContentType: data.contentType,
    });

    await getS3Client().send(command);

    const publicUrl = `${process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}`}/${key}`;

    return {
      publicUrl,
      fileType: isImage ? "image" : "video",
    };
  });

export const getChecklistUploadUrl = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      checklistId: string;
      itemId: string;
      contentType: string;
      fileName: string;
      fileSize: number;
      propertyName?: string;
      roomName?: string;
      temporary?: boolean; // New flag for temporary uploads
    }) => {
      if (!data.checklistId || !data.itemId || !data.contentType) {
        throw new Error("Missing required fields");
      }
      return data;
    },
  )
  .handler(async ({ data }) => {
    console.log("getChecklistUploadUrl called with:", data);

    // Check environment variables
    if (!process.env.S3_ENDPOINT || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
      console.error("Missing S3 environment variables");
      throw new Error("Storage service not configured. Please check environment variables.");
    }

    const isImage = ALLOWED_IMAGE_TYPES.includes(data.contentType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(data.contentType);

    if (!isImage && !isVideo) {
      console.error("Invalid file type:", data.contentType);
      throw new Error(
        "Unsupported file type. Use JPEG, PNG, WebP, HEIC, MP4, MOV, or WebM.",
      );
    }

    if (data.fileSize > MAX_FILE_SIZE) {
      console.error("File too large:", data.fileSize);
      throw new Error("File too large. Maximum size is 100MB.");
    }

    try {
      const ext = data.fileName.split(".").pop() || "bin";

      // Create organized directory structure with datetime, property, and room
      const now = new Date();
      const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const datetime = `${date}_${time}`;
      const sanitize = (str: string) => str?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'unknown';

      const propertyName = sanitize(data.propertyName || 'property');
      const roomName = sanitize(data.roomName || 'general');

      // Add a short random suffix to ensure uniqueness
      const shortId = randomUUID().split('-')[0];
      const descriptiveName = `${shortId}.${ext}`;

      // Use temporary prefix for admin uploads (they save explicitly)
      const prefix = data.temporary ? 'temp' : 'checklists';
      const key = `${prefix}/${propertyName}/${datetime}/${data.checklistId}/${roomName}/${descriptiveName}`;

      console.log("Generating presigned URL for key:", key);
      const { uploadUrl, publicUrl } = await getPresignedUploadUrl(
        key,
        data.contentType,
      );

      console.log("Generated URLs:", { uploadUrl: uploadUrl.substring(0, 50) + "...", publicUrl });

      return {
        uploadUrl,
        publicUrl,
        fileType: isImage ? "image" : "video",
        key, // Return the key so we can move it later
      };
    } catch (error) {
      console.error("Failed to generate upload URL:", error);
      throw new Error(`Failed to generate upload URL: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  });
