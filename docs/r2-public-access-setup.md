# Setting Up R2 Public Access for Image Display

## Quick Steps

1. **Go to Cloudflare Dashboard**
   - Navigate to R2 → Your bucket (`jzvacationstays`)
   - Click on **Settings** tab

2. **Enable Public Access**
   - Under "Public Access", click **Allow Access**
   - You'll receive a public domain like: `https://pub-abc123def456.r2.dev`
   - Copy this URL

3. **Update Your .env File**
   ```env
   S3_PUBLIC_URL=https://pub-YOUR-UNIQUE-ID.r2.dev
   ```
   Replace `YOUR-UNIQUE-ID` with your actual public URL from Cloudflare.

4. **Restart Your Dev Server**
   ```bash
   # Stop the server (Ctrl+C) and restart
   pnpm dev
   ```

## Alternative: Custom Domain (Optional)

If you want a branded URL like `media.jzvacationstays.com`:

1. In R2 bucket settings, click **Connect Domain**
2. Enter your subdomain (e.g., `media.jzvacationstays.com`)
3. Add the CNAME record to your DNS
4. Update `.env`:
   ```env
   S3_PUBLIC_URL=https://media.jzvacationstays.com
   ```

## Troubleshooting

### Images Still Not Showing?
1. Check browser console for 403/404 errors
2. Verify the public URL is correct by visiting it directly:
   ```
   https://pub-YOUR-ID.r2.dev/checklists/[checklistId]/[itemId]/[filename]
   ```
3. Ensure public access is enabled (green "Allowed" badge in R2 settings)

### CORS Issues?
Add CORS rules in R2 bucket settings:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```