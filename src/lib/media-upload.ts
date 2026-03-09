import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = "public/uploads/checklist-media";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/mov",
  "video/avi",
];

export async function saveUploadedFile(
  file: File,
  subfolder: "admin" | "handyman"
): Promise<{ fileName: string; filePath: string; fileSize: number }> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed. Allowed types: ${ALLOWED_TYPES.join(", ")}`);
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Generate unique filename
  const fileExtension = file.name.split('.').pop() || '';
  const fileName = `${randomUUID()}.${fileExtension}`;

  // Create upload directory structure
  const uploadPath = join(process.cwd(), UPLOAD_DIR, subfolder);
  await mkdir(uploadPath, { recursive: true });

  // Save file
  const filePath = join(uploadPath, fileName);
  const arrayBuffer = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(arrayBuffer));

  // Return relative path for storage in database
  const relativePath = `/uploads/checklist-media/${subfolder}/${fileName}`;

  return {
    fileName,
    filePath: relativePath,
    fileSize: file.size,
  };
}

export function getFileUrl(filePath: string): string {
  // Ensure the path starts with /
  if (!filePath.startsWith('/')) {
    return `/${filePath}`;
  }
  return filePath;
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}