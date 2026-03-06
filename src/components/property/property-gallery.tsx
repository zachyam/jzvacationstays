import { useState } from "react";

type Photo = {
  id: string;
  url: string;
  alt: string | null;
};

export function PropertyGallery({ photos }: { photos: Photo[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="w-full h-80 bg-stone-200 rounded-2xl flex items-center justify-center text-stone-400">
        No photos available
      </div>
    );
  }

  const selected = photos[selectedIndex];

  return (
    <div className="space-y-4">
      <div className="w-full h-80 md:h-[28rem] rounded-2xl overflow-hidden">
        <img
          src={selected.url}
          alt={selected.alt || "Property photo"}
          className="w-full h-full object-cover"
        />
      </div>
      {photos.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {photos.map((photo, i) => (
            <button
              key={photo.id}
              onClick={() => setSelectedIndex(i)}
              className={`w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                i === selectedIndex
                  ? "border-sky-500 shadow-lg"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={photo.url}
                alt={photo.alt || ""}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
