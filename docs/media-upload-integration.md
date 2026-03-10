# Media Upload Integration Guide

## Example: Admin Checklist View

```tsx
import { MediaUpload, MediaGallery } from "../../../components/media-upload";
import { saveChecklistMedia, deleteChecklistMedia } from "../../../server/functions/admin-checklists";

function ChecklistItemCard({ item, checklistId }) {
  const [media, setMedia] = useState(item.media || []);
  const [showUpload, setShowUpload] = useState(false);

  const handleUploadComplete = async (uploadedFile) => {
    try {
      // Save to database
      const result = await saveChecklistMedia({
        checklistItemId: item.id,
        ...uploadedFile,
      });

      // Update local state
      setMedia([...media, result.media]);
      setShowUpload(false);
    } catch (error) {
      console.error("Failed to save media:", error);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    await deleteChecklistMedia({ mediaId });
    setMedia(media.filter(m => m.id !== mediaId));
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{item.title}</h3>
          {item.room && <p className="text-sm text-stone-600">{item.room}</p>}
          {item.description && <p className="text-sm text-stone-500">{item.description}</p>}
        </div>

        <button
          onClick={() => setShowUpload(!showUpload)}
          className="text-sky-600 hover:text-sky-700"
        >
          <Icon icon="solar:camera-add-linear" className="w-5 h-5" />
        </button>
      </div>

      {showUpload && (
        <MediaUpload
          checklistId={checklistId}
          itemId={item.id}
          onUploadComplete={handleUploadComplete}
          onError={(error) => toast.error(error)}
        />
      )}

      <MediaGallery
        media={media}
        onDelete={handleDeleteMedia}
        canDelete={true}
      />
    </div>
  );
}
```

## Example: Handyman Inspection View

```tsx
import { MediaUpload, MediaGallery } from "../../../components/media-upload";
import { uploadHandymanMedia } from "../../../server/functions/handyman-checklists";

function HandymanChecklistItem({ item, checklistId }) {
  const [media, setMedia] = useState(item.media || []);
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadComplete = async (uploadedFile) => {
    try {
      const result = await uploadHandymanMedia({
        checklistId,
        checklistItemId: item.id,
        ...uploadedFile,
        description: `Uploaded during inspection on ${new Date().toLocaleDateString()}`,
      });

      setMedia([...media, result.media]);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={item.isCompleted}
          onChange={(e) => handleToggleItem(item.id, e.target.checked)}
          className="mt-1"
        />
        <div className="flex-1">
          <div className="font-medium">{item.title}</div>
          {item.room && <div className="text-sm text-stone-600">{item.room}</div>}
        </div>
      </label>

      {/* Show upload area when item is being worked on */}
      {!item.isCompleted && (
        <MediaUpload
          checklistId={checklistId}
          itemId={item.id}
          onUploadComplete={handleUploadComplete}
          className="mt-3"
        />
      )}

      {/* Display uploaded media */}
      <MediaGallery media={media} canDelete={false} />
    </div>
  );
}
```

## Testing the Upload Flow

1. **Set up Cloudflare R2** (see `docs/cloudflare-r2-setup.md`)

2. **Add environment variables** to your `.env` file:
```env
S3_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=jzvacationstays
S3_PUBLIC_URL=https://media.jzvacationstays.com
```

3. **Test upload locally**:
```bash
pnpm dev
# Navigate to admin checklists
# Try uploading an image to a checklist item
```

4. **Verify in R2 dashboard**:
- Check that files appear in your R2 bucket
- Verify the folder structure: `checklists/{checklistId}/{itemId}/`

## Troubleshooting

### CORS Errors
If you get CORS errors when uploading:
1. Go to your R2 bucket settings
2. Add CORS configuration (see setup guide)
3. Include your local dev URL and production URL

### Upload Fails with 403
- Check your R2 access keys have write permissions
- Verify the bucket name matches your environment variable
- Ensure the endpoint URL is correct

### Files Not Displaying
- Check that public access is enabled on your R2 bucket
- Verify the `S3_PUBLIC_URL` is correct
- For custom domains, ensure DNS is properly configured