import { createServerFn } from "@tanstack/react-start";
import { saveUploadedFile } from "../../lib/media-upload";
import { requireAdmin } from "../middleware/admin";

export const uploadFileForAdmin = createServerFn({ method: "POST" })
  .handler(async ({ request }) => {
    await requireAdmin();

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw new Error("No file provided");
    }

    try {
      const { fileName, filePath, fileSize } = await saveUploadedFile(file, "admin");

      return {
        success: true,
        fileName,
        originalName: file.name,
        mimeType: file.type,
        fileSize,
        filePath,
      };
    } catch (error) {
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  });

export const uploadFileForHandyman = createServerFn({ method: "POST" })
  .handler(async ({ request }) => {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw new Error("No file provided");
    }

    try {
      const { fileName, filePath, fileSize } = await saveUploadedFile(file, "handyman");

      return {
        success: true,
        fileName,
        originalName: file.name,
        mimeType: file.type,
        fileSize,
        filePath,
      };
    } catch (error) {
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  });