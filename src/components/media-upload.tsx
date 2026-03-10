import { useState, useRef } from "react";
import { Icon } from "@iconify/react";
import { cn } from "../lib/utils";

interface MediaUploadProps {
  checklistId: string;
  itemId: string;
  onUploadComplete: (media: {
    fileName: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    filePath: string;
  }) => void;
  onError?: (error: string) => void;
  className?: string;
  maxSize?: number; // in MB
}

export function MediaUpload({
  checklistId,
  itemId,
  onUploadComplete,
  onError,
  className,
  maxSize = 100,
}: MediaUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "video/mp4",
    "video/quicktime",
    "video/webm",
  ];

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      onError?.(`Invalid file type. Allowed: JPEG, PNG, WebP, HEIC, MP4, MOV, WebM`);
      return;
    }

    // Validate file size
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      onError?.(`File too large. Maximum size is ${maxSize}MB`);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Step 1: Get presigned upload URL from server
      const { getChecklistUploadUrl } = await import("../server/functions/uploads");
      const { uploadUrl, publicUrl, fileType } = await getChecklistUploadUrl({
        checklistId,
        itemId,
        contentType: file.type,
        fileName: file.name,
        fileSize: file.size,
      });

      // Step 2: Upload file directly to R2
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 204) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      // Step 3: Notify parent component
      const fileName = publicUrl.split("/").pop() || file.name;
      onUploadComplete({
        fileName,
        originalName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        filePath: publicUrl,
      });

      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      console.error("Upload error:", error);
      onError?.(error instanceof Error ? error.message : "Upload failed");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          dragActive ? "border-sky-500 bg-sky-50" : "border-stone-300 hover:border-stone-400",
          isUploading && "pointer-events-none opacity-75"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={ALLOWED_TYPES.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="space-y-3">
            <Icon icon="solar:upload-linear" className="w-8 h-8 mx-auto text-sky-500" />
            <div className="text-sm text-stone-600">Uploading...</div>
            <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-sky-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="text-xs text-stone-500">{uploadProgress}%</div>
          </div>
        ) : (
          <div className="space-y-2">
            <Icon icon="solar:camera-add-linear" className="w-8 h-8 mx-auto text-stone-400" />
            <p className="text-sm text-stone-600">
              Click or drag to upload photo/video
            </p>
            <p className="text-xs text-stone-500">
              JPEG, PNG, WebP, HEIC, MP4, MOV, WebM • Max {maxSize}MB
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface MediaGalleryProps {
  media: Array<{
    id: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    filePath: string;
    description?: string | null;
    createdAt: Date;
  }>;
  onDelete?: (mediaId: string) => void;
  canDelete?: boolean;
}

export function MediaGallery({ media, onDelete, canDelete = false }: MediaGalleryProps) {
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (mediaId: string) => {
    if (!onDelete || !canDelete) return;

    setDeletingId(mediaId);
    try {
      await onDelete(mediaId);
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeletingId(null);
    }
  };

  if (media.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {media.map((item) => {
          const isImage = item.mimeType.startsWith("image/");
          const isVideo = item.mimeType.startsWith("video/");

          return (
            <div
              key={item.id}
              className="relative group rounded-lg overflow-hidden bg-stone-100 aspect-square cursor-pointer"
              onClick={() => setSelectedMedia(item.filePath)}
            >
              {isImage && (
                <img
                  src={item.filePath}
                  alt={item.originalName}
                  className="w-full h-full object-cover"
                />
              )}
              {isVideo && (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon icon="solar:play-circle-bold" className="w-12 h-12 text-stone-600" />
                  <video
                    src={item.filePath}
                    className="absolute inset-0 w-full h-full object-cover -z-10"
                    muted
                  />
                </div>
              )}

              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id);
                  }}
                  disabled={deletingId === item.id}
                  className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {deletingId === item.id ? (
                    <Icon icon="solar:spinner-linear" className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon icon="solar:trash-bin-2-linear" className="w-4 h-4" />
                  )}
                </button>
              )}

              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
                <p className="text-xs text-white truncate">{item.originalName}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <button
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
            onClick={() => setSelectedMedia(null)}
          >
            <Icon icon="solar:close-circle-linear" className="w-8 h-8" />
          </button>

          <div className="max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            {selectedMedia.match(/\.(jpg|jpeg|png|webp|heic|heif|gif)$/i) ? (
              <img
                src={selectedMedia}
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <video
                src={selectedMedia}
                controls
                className="max-w-full max-h-full"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}