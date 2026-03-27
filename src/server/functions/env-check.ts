import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "../middleware/admin";

export const checkEnvironment = createServerFn({ method: "GET" })
  .handler(async () => {
    await requireAdmin();

    // Check S3 configuration
    const s3Config = {
      hasAccessKey: !!process.env.S3_ACCESS_KEY_ID,
      accessKeyLength: process.env.S3_ACCESS_KEY_ID?.length || 0,
      hasSecretKey: !!process.env.S3_SECRET_ACCESS_KEY,
      secretKeyLength: process.env.S3_SECRET_ACCESS_KEY?.length || 0,
      hasEndpoint: !!process.env.S3_ENDPOINT,
      endpoint: process.env.S3_ENDPOINT || "not set",
      hasBucket: !!process.env.S3_BUCKET,
      bucket: process.env.S3_BUCKET || "not set",
      hasPublicUrl: !!process.env.S3_PUBLIC_URL,
      publicUrl: process.env.S3_PUBLIC_URL || "not set",
      region: process.env.S3_REGION || "not set",
    };

    // Check other critical configs
    const otherConfig = {
      hasDatabase: !!process.env.DATABASE_URL,
      databaseLength: process.env.DATABASE_URL?.length || 0,
      hasResendKey: !!process.env.RESEND_API_KEY,
      resendKeyLength: process.env.RESEND_API_KEY?.length || 0,
      nodeEnv: process.env.NODE_ENV || "not set",
    };

    return {
      s3: s3Config,
      other: otherConfig,
      timestamp: new Date().toISOString(),
      message: "Environment check completed. Never expose actual keys!",
    };
  });