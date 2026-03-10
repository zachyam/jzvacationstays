# Cloudflare R2 Setup Guide

## 1. Create R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to R2 Object Storage
3. Click "Create bucket"
4. Name: `jzvacationstays` (or your preferred name)
5. Location: Automatic
6. Click "Create bucket"

## 2. Configure Public Access

1. In your bucket settings, go to "Settings" tab
2. Under "Public Access", click "Allow Access"
3. Add a custom domain (optional but recommended):
   - Example: `media.jzvacationstays.com`
   - This gives you a clean public URL for your files

## 3. Generate API Credentials

1. In R2 dashboard, click "Manage R2 API tokens"
2. Click "Create API token"
3. Token name: `jzvacationstays-uploads`
4. Permissions: Select "Object Read & Write"
5. Specify bucket: Select your bucket
6. TTL: Leave as default (forever)
7. Click "Create API Token"
8. **SAVE THESE CREDENTIALS SECURELY**:
   - Access Key ID
   - Secret Access Key
   - Endpoint (format: `https://<account_id>.r2.cloudflarestorage.com`)

## 4. Environment Variables

Add these to your Railway environment:

```env
# Cloudflare R2 Configuration
S3_ENDPOINT=https://<your_account_id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=<your_access_key_id>
S3_SECRET_ACCESS_KEY=<your_secret_access_key>
S3_BUCKET=jzvacationstays
S3_PUBLIC_URL=https://media.jzvacationstays.com  # Or https://pub-<hash>.r2.dev
```

## 5. CORS Configuration (if needed)

In bucket settings > CORS:

```json
[
  {
    "AllowedOrigins": ["https://jzvacationstays.com", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## 6. Test Upload

After deployment, test with a small image file to verify everything works.

## Cost Breakdown

- Storage: $0.015/GB/month (first 10GB free)
- Class A operations (writes): $4.50/million (first 1M free)
- Class B operations (reads): $0.36/million (first 10M free)
- **No egress fees!** (Unlike AWS S3)

## Migration from Local Storage

To migrate existing local files to R2, use the Cloudflare dashboard upload or rclone:

```bash
# Install rclone
brew install rclone

# Configure rclone for R2
rclone config

# Sync local uploads to R2
rclone sync ./public/uploads/checklist-media r2:jzvacationstays/checklist-media
```