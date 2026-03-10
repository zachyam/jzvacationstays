import { S3Client, PutObjectCommand, DeleteObjectCommand, DeleteObjectsCommand, CopyObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | null = null;

function getS3Client() {
  if (!client) {
    client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });
  }
  return client;
}

const BUCKET = () => process.env.S3_BUCKET || "jzvacationstays";
const PUBLIC_URL_BASE = () =>
  process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${BUCKET()}`;

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
): Promise<{ uploadUrl: string; publicUrl: string }> {
  try {
    const bucket = BUCKET();
    const publicUrlBase = PUBLIC_URL_BASE();

    console.log("S3 Configuration:", {
      endpoint: process.env.S3_ENDPOINT,
      bucket,
      region: process.env.S3_REGION,
      hasAccessKey: !!process.env.S3_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.S3_SECRET_ACCESS_KEY,
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(getS3Client(), command, {
      expiresIn: 300,
    });

    const publicUrl = `${publicUrlBase}/${key}`;

    return { uploadUrl, publicUrl };
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    throw error;
  }
}

export async function deleteObject(filePath: string): Promise<void> {
  try {
    // Extract the key from the full URL
    const publicUrlBase = PUBLIC_URL_BASE();
    let key = filePath;

    // If it's a full URL, extract just the key portion
    if (filePath.startsWith('http')) {
      const url = new URL(filePath);
      key = url.pathname.substring(1); // Remove leading slash

      // If the path includes the bucket name, remove it
      const bucket = BUCKET();
      if (key.startsWith(bucket + '/')) {
        key = key.substring(bucket.length + 1);
      }
    }

    console.log("Deleting object from R2:", key);

    const command = new DeleteObjectCommand({
      Bucket: BUCKET(),
      Key: key,
    });

    await getS3Client().send(command);
    console.log("Successfully deleted from R2:", key);
  } catch (error) {
    console.error("Error deleting object from R2:", error);
    // Don't throw - we don't want to fail the whole operation if R2 delete fails
  }
}

export async function deleteObjects(filePaths: string[]): Promise<void> {
  if (filePaths.length === 0) return;

  try {
    const publicUrlBase = PUBLIC_URL_BASE();
    const bucket = BUCKET();

    // Extract keys from file paths
    const objects = filePaths.map(filePath => {
      let key = filePath;

      if (filePath.startsWith('http')) {
        const url = new URL(filePath);
        key = url.pathname.substring(1);

        if (key.startsWith(bucket + '/')) {
          key = key.substring(bucket.length + 1);
        }
      }

      return { Key: key };
    });

    console.log("Deleting multiple objects from R2:", objects);

    const command = new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: objects,
        Quiet: true,
      },
    });

    const result = await getS3Client().send(command);
    console.log("Successfully deleted from R2:", result.Deleted?.length || 0, "objects");
  } catch (error) {
    console.error("Error deleting objects from R2:", error);
  }
}

export async function moveObject(sourceKey: string, destinationKey: string): Promise<string> {
  try {
    const bucket = BUCKET();

    console.log("Moving object in R2:", { from: sourceKey, to: destinationKey });

    // Copy object to new location
    const copyCommand = new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${sourceKey}`,
      Key: destinationKey,
    });

    await getS3Client().send(copyCommand);

    // Delete original object
    const deleteCommand = new DeleteObjectCommand({
      Bucket: bucket,
      Key: sourceKey,
    });

    await getS3Client().send(deleteCommand);

    console.log("Successfully moved object in R2");

    // Return new public URL
    const publicUrlBase = PUBLIC_URL_BASE();
    return `${publicUrlBase}/${destinationKey}`;
  } catch (error) {
    console.error("Error moving object in R2:", error);
    throw error;
  }
}
