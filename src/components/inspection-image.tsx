import { useState } from "react";

interface InspectionImageProps {
  src: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
  loading?: "lazy" | "eager";
}

export function InspectionImage({
  src,
  alt = "Inspection image",
  className = "",
  onClick,
  loading = "lazy"
}: InspectionImageProps) {
  const [error, setError] = useState(false);
  const [isHeic, setIsHeic] = useState(false);

  // Try to display the image normally first, only show HEIC message if it fails to load
  // and has a HEIC extension
  const hasHeicExtension = src.toLowerCase().includes('.heic') ||
                           src.toLowerCase().includes('.heif');

  if (error && hasHeicExtension) {
    // This is an actual HEIC file that can't be displayed
    return (
      <div className={`${className} bg-amber-50 flex flex-col items-center justify-center p-2`}>
        <iconify-icon
          icon="solar:camera-minimalistic-linear"
          class="text-2xl text-amber-600 mb-1"
        />
        <span className="text-xs text-amber-700 font-medium text-center">
          HEIC format
        </span>
        <span className="text-xs text-amber-600 text-center">
          Re-upload for preview
        </span>
      </div>
    );
  }

  if (error && !hasHeicExtension) {
    // Regular error, not HEIC-related
    return (
      <div className={`${className} bg-stone-100 flex items-center justify-center`}>
        <iconify-icon
          icon="solar:gallery-broken"
          class="text-2xl text-stone-400"
        />
      </div>
    );
  }

  // Always try to display the image first
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onClick={onClick}
      loading={loading}
      onError={() => {
        console.error('Image failed to load:', src);
        setError(true);
      }}
    />
  );
}