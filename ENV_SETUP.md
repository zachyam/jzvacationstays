# Environment Variables Setup

## Required Environment Variables

The following environment variables must be configured in your production environment (Railway) for the application to work properly:

### S3/R2 Storage (Required for file uploads)
```
S3_ACCESS_KEY_ID=your_cloudflare_r2_access_key
S3_SECRET_ACCESS_KEY=your_cloudflare_r2_secret_key
S3_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
S3_BUCKET=jzvacationstays
S3_REGION=auto
S3_PUBLIC_URL=https://your-public-r2-url.r2.dev
```

### Database (Required)
```
DATABASE_URL=postgresql://user:password@host:port/database
```

### Email Service (Required for OTP login)
```
RESEND_API_KEY=re_your_resend_api_key
```

## Setting Environment Variables in Railway

1. Go to your Railway project dashboard
2. Select your service
3. Click on the "Variables" tab
4. Add each environment variable with its value
5. Railway will automatically restart your service

## Troubleshooting Upload Issues

If you see "Upload service not configured" error:

1. Visit `/admin/env-check` (admin only) to verify which variables are missing
2. Ensure all S3_* variables are set in Railway
3. Check that the values don't have extra spaces or quotes
4. Verify your Cloudflare R2 credentials are correct

## Security Notes

- Never commit `.env` files to git
- Keep production credentials separate from development
- Use Railway's environment variables feature for production
- The `/admin/env-check` endpoint only shows if variables exist, not their values

## Getting Cloudflare R2 Credentials

1. Log in to Cloudflare dashboard
2. Go to R2 Storage
3. Create a bucket named "jzvacationstays"
4. Go to Manage R2 API Tokens
5. Create a new API token with Object Read & Write permissions
6. Copy the Access Key ID and Secret Access Key
7. Get your account ID from the R2 overview page
8. Set up a public bucket URL for the S3_PUBLIC_URL variable