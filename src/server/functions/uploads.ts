import { createServerFn } from "@tanstack/react-start";
import { randomUUID } from "crypto";

import { getPresignedUploadUrl } from "../../lib/s3";

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

    const ext = data.fileName.split(".").pop() || "bin";
    const key = `inspections/${data.inspectionId}/${data.itemId}/${randomUUID()}.${ext}`;

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
