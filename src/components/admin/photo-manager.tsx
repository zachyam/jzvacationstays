import { useState } from "react";
import { cn } from "../../lib/utils";

type Photo = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  isCover: boolean;
};

type PhotoManagerProps = {
  photos: Photo[];
  onAdd: (url: string, alt: string) => Promise<void>;
  onDelete: (photoId: string) => Promise<void>;
  onReorder: (
    photos: { id: string; sortOrder: number; isCover: boolean }[],
  ) => Promise<void>;
};

export function PhotoManager({
  photos,
  onAdd,
  onDelete,
  onReorder,
}: PhotoManagerProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newAlt, setNewAlt] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!newUrl.trim()) return;
    setAdding(true);
    await onAdd(newUrl.trim(), newAlt.trim());
    setNewUrl("");
    setNewAlt("");
    setShowAdd(false);
    setAdding(false);
  }

  async function handleSetCover(photoId: string) {
    const reordered = photos.map((p) => ({
      id: p.id,
      sortOrder: p.sortOrder,
      isCover: p.id === photoId,
    }));
    await onReorder(reordered);
  }

  async function handleMoveUp(index: number) {
    if (index === 0) return;
    const reordered = [...photos];
    [reordered[index - 1], reordered[index]] = [
      reordered[index],
      reordered[index - 1],
    ];
    await onReorder(
      reordered.map((p, i) => ({
        id: p.id,
        sortOrder: i,
        isCover: p.isCover,
      })),
    );
  }

  async function handleMoveDown(index: number) {
    if (index === photos.length - 1) return;
    const reordered = [...photos];
    [reordered[index], reordered[index + 1]] = [
      reordered[index + 1],
      reordered[index],
    ];
    await onReorder(
      reordered.map((p, i) => ({
        id: p.id,
        sortOrder: i,
        isCover: p.isCover,
      })),
    );
  }

  return (
    <section className="bg-white border border-stone-200 rounded-xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-stone-900">Photos</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Manage property images. The cover photo is shown as the hero image.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Add Photo
        </button>
      </div>

      {/* Add Photo Form */}
      {showAdd && (
        <div className="border border-stone-200 rounded-lg p-4 space-y-3 bg-stone-50">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Image URL
            </label>
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-4 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Alt Text
            </label>
            <input
              type="text"
              value={newAlt}
              onChange={(e) => setNewAlt(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-4 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              placeholder="Describe the image"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg text-sm font-medium hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newUrl.trim() || adding}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add Photo"}
            </button>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      {photos.length === 0 ? (
        <div className="text-center py-8 text-stone-400">
          <iconify-icon
            icon="solar:gallery-linear"
            width="40"
            height="40"
            class="mb-2"
          />
          <p className="text-sm">No photos yet. Add your first photo above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className={cn(
                "relative group rounded-xl overflow-hidden border-2 transition-colors",
                photo.isCover ? "border-sky-400" : "border-transparent",
              )}
            >
              <img
                src={photo.url}
                alt={photo.alt || "Property photo"}
                className="w-full aspect-[4/3] object-cover"
              />

              {/* Cover Badge */}
              {photo.isCover && (
                <span className="absolute top-2 left-2 bg-sky-500 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                  Cover
                </span>
              )}

              {/* Sort Order Badge */}
              <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                #{index + 1}
              </span>

              {/* Actions Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {!photo.isCover && (
                  <button
                    type="button"
                    onClick={() => handleSetCover(photo.id)}
                    className="bg-white text-stone-900 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
                  >
                    Set Cover
                  </button>
                )}
                {index > 0 && (
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    className="bg-white/90 text-stone-900 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white transition-colors"
                  >
                    <iconify-icon icon="solar:arrow-up-linear" width="16" height="16" />
                  </button>
                )}
                {index < photos.length - 1 && (
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    className="bg-white/90 text-stone-900 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white transition-colors"
                  >
                    <iconify-icon icon="solar:arrow-down-linear" width="16" height="16" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(photo.id)}
                  className="bg-red-500 text-white w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <iconify-icon icon="solar:trash-bin-minimalistic-linear" width="16" height="16" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
