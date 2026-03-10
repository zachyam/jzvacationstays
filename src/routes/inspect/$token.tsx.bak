import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";

import {
  getInspectionByToken,
  startInspection,
  updateInspectionItem,
  addInspectionMedia,
  deleteInspectionMedia,
  completeInspection,
} from "../../server/functions/inspections";
import { getUploadUrl } from "../../server/functions/uploads";

type InspectionItem = {
  id: string;
  inspectionId: string;
  checklistItemId: string | null;
  room: string | null;
  title: string;
  description: string | null;
  isCompleted: boolean;
  status: string | null;
  comment: string | null;
  completedAt: Date | string | null;
  sortOrder: number;
  createdAt: Date | string;
};

type MediaItem = {
  id: string;
  inspectionItemId: string;
  url: string;
  fileType: string;
  fileName: string | null;
  fileSize: number | null;
  createdAt: Date | string;
};

type MediaMap = Record<string, MediaItem[]>;

type LoaderData = {
  inspection: {
    id: string;
    checklistId: string;
    propertyId: string | null;
    token: string;
    status: string;
    notes: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
  } | null;
  checklistTitle: string | null;
  propertyName: string | null;
  items: InspectionItem[];
  media: MediaMap;
};

export const Route = createFileRoute("/inspect/$token")({
  loader: async ({ params }): Promise<LoaderData> => {
    try {
      return await getInspectionByToken({ data: { token: params.token } }) as LoaderData;
    } catch {
      return {
        inspection: null,
        checklistTitle: null,
        propertyName: null,
        items: [],
        media: {},
      };
    }
  },
  component: InspectionPage,
});

function InspectionPage() {
  const { token } = Route.useParams();
  const data = Route.useLoaderData() as LoaderData;
  const [items, setItems] = useState<InspectionItem[]>(data.items);
  const [media, setMedia] = useState<MediaMap>(data.media);
  const [status, setStatus] = useState(data.inspection?.status || "pending");
  const [completionNotes, setCompletionNotes] = useState("");
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  if (!data.inspection) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white border border-stone-200 rounded-[1.5rem] p-8 text-center max-w-sm shadow-sm">
          <iconify-icon
            icon="solar:clipboard-remove-linear"
            width="48"
            height="48"
            class="text-stone-300"
          />
          <h1 className="text-lg font-medium text-stone-900 mt-4">
            Inspection Not Found
          </h1>
          <p className="text-sm text-stone-500 mt-2">
            This link may be invalid or expired.
          </p>
        </div>
      </div>
    );
  }

  const isCompleted = status === "completed";

  // Group items by room
  const rooms = new Map<string, typeof items>();
  for (const item of items) {
    const room = item.room || "General";
    if (!rooms.has(room)) rooms.set(room, []);
    rooms.get(room)!.push(item);
  }

  const completedCount = items.filter((i) => i.isCompleted).length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const remainingCount = items.length - completedCount;

  async function handleStart() {
    await startInspection({ data: { token } });
    setStatus("in_progress");
  }

  async function handleToggle(itemId: string, isCompleted: boolean) {
    setItems((prev: InspectionItem[]) =>
      prev.map((i: InspectionItem) =>
        i.id === itemId
          ? { ...i, isCompleted, completedAt: isCompleted ? new Date().toISOString() : null }
          : i,
      ),
    );
    await updateInspectionItem({ data: { token, itemId, isCompleted } });
  }

  async function handleStatus(itemId: string, itemStatus: string) {
    const newStatus = items.find((i: InspectionItem) => i.id === itemId)?.status === itemStatus ? null : itemStatus;
    setItems((prev: InspectionItem[]) =>
      prev.map((i: InspectionItem) => (i.id === itemId ? { ...i, status: newStatus } : i)),
    );
    await updateInspectionItem({
      data: { token, itemId, status: newStatus || "" },
    });
  }

  async function handleComment(itemId: string, comment: string) {
    await updateInspectionItem({ data: { token, itemId, comment } });
  }

  async function handleFileUpload(
    itemId: string,
    files: FileList,
  ) {
    setUploading(itemId);
    try {
      for (const file of Array.from(files)) {
        const { uploadUrl, publicUrl, fileType } = await getUploadUrl({
          data: {
            inspectionId: data.inspection!.id,
            itemId,
            contentType: file.type,
            fileName: file.name,
            fileSize: file.size,
          },
        });

        await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        const result = await addInspectionMedia({
          data: {
            token,
            itemId,
            url: publicUrl,
            fileType,
            fileName: file.name,
            fileSize: file.size,
          },
        });

        setMedia((prev: MediaMap) => ({
          ...prev,
          [itemId]: [
            ...(prev[itemId] || []),
            {
              id: result.media.id,
              inspectionItemId: itemId,
              url: publicUrl,
              fileType,
              fileName: file.name,
              fileSize: file.size,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
      }
    } catch {
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(null);
    }
  }

  async function handleDeleteMedia(mediaId: string, itemId: string) {
    if (!confirm("Delete this file? This action cannot be undone.")) return;
    try {
      await deleteInspectionMedia({ data: { token, mediaId } });
      setMedia((prev: MediaMap) => ({
        ...prev,
        [itemId]: (prev[itemId] || []).filter(m => m.id !== mediaId),
      }));
    } catch {
      alert("Failed to delete file. Please try again.");
    }
  }

  async function handleComplete() {
    await completeInspection({ data: { token, notes: completionNotes } });
    window.location.href = `/inspect/complete/${token}`;
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-24 relative">
      {/* Header & Progress */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm shadow-stone-200/50">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-8 pt-5 pb-4">
          {/* Top Nav */}
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10" /> {/* Spacer */}
            <div className="text-center">
              <h1 className="text-xl font-medium tracking-tight text-stone-900">
                {data.propertyName || "Property Inspection"}
              </h1>
              <p className="text-sm text-stone-500">{data.checklistTitle}</p>
            </div>
            <div className="w-10 h-10" /> {/* Spacer */}
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-widest shrink-0">
              {completedCount} of {items.length} Done
            </span>
            <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-sky-500 uppercase tracking-widest shrink-0">
              {progressPercent}%
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto w-full p-4 sm:p-8 space-y-10">
        {/* Start button */}
        {status === "pending" && (
          <div className="bg-white border border-sky-200 rounded-[1.5rem] p-8 text-center shadow-md shadow-sky-500/5 ring-4 ring-sky-500/5">
            <iconify-icon icon="solar:clipboard-check-linear" class="text-5xl text-sky-500 mb-4" />
            <h2 className="text-xl font-medium text-stone-900 mb-2">Ready to Begin</h2>
            <p className="text-sm text-stone-500 mb-6">
              Tap the button below to start the inspection. You can save your progress and return later.
            </p>
            <button
              onClick={handleStart}
              className="bg-sky-500 text-white font-medium px-8 py-3.5 rounded-xl shadow-md shadow-sky-500/20 hover:bg-sky-400 hover:shadow-lg hover:-translate-y-0.5 transition-all text-base"
            >
              Start Inspection
            </button>
          </div>
        )}

        {isCompleted && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-[1.5rem] p-6 text-center">
            <iconify-icon icon="solar:check-circle-bold" class="text-4xl text-emerald-500 mb-2" />
            <p className="text-base font-medium text-emerald-700">
              Inspection Complete
            </p>
            {data.inspection.notes && (
              <p className="text-sm text-emerald-600 mt-1">{data.inspection.notes}</p>
            )}
          </div>
        )}

        {/* Items by room */}
        {Array.from(rooms.entries()).map(([room, roomItems]) => (
          <section key={room} className="space-y-4">
            <h2 className="text-2xl font-medium tracking-tight text-stone-900 flex items-center gap-2 px-2">
              <iconify-icon icon="solar:map-point-linear" class="text-stone-400" />
              {room}
            </h2>

            <div className="space-y-4">
              {roomItems.map((item) => (
                <InspectionItemCard
                  key={item.id}
                  item={item}
                  media={media[item.id] || []}
                  disabled={isCompleted}
                  uploading={uploading === item.id}
                  expanded={expandedItem === item.id}
                  onExpand={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                  onToggle={handleToggle}
                  onStatus={handleStatus}
                  onComment={handleComment}
                  onUpload={handleFileUpload}
                  onDeleteMedia={handleDeleteMedia}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Complete button */}
        {status === "in_progress" && !showCompleteForm && (
          <div className="pt-4" />
        )}

        {showCompleteForm && (
          <div className="bg-white border border-emerald-200 rounded-[1.5rem] p-6 shadow-md shadow-emerald-500/5 ring-4 ring-emerald-500/5 space-y-4">
            <h3 className="text-lg font-medium text-stone-900">Complete Inspection</h3>
            <p className="text-sm text-stone-500">
              Add any overall notes before finishing.
            </p>
            <textarea
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Any overall notes? (optional)"
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all text-sm font-medium placeholder-stone-400 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={handleComplete}
                className="flex-1 bg-emerald-500 text-white font-medium py-3.5 rounded-xl shadow-md shadow-emerald-500/20 hover:bg-emerald-400 hover:shadow-lg transition-all text-sm"
              >
                Confirm Complete
              </button>
              <button
                onClick={() => setShowCompleteForm(false)}
                className="px-6 py-3.5 bg-white border border-stone-200 text-stone-700 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Bottom Bar */}
      {status === "in_progress" && !showCompleteForm && (
        <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-stone-200 px-4 py-4 z-50">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-stone-900">
                {remainingCount > 0 ? "Remaining Tasks" : "All Tasks Done!"}
              </p>
              <p className="text-xs text-stone-500">
                {remainingCount > 0
                  ? `${remainingCount} task${remainingCount !== 1 ? "s" : ""} need${remainingCount === 1 ? "s" : ""} your attention`
                  : "You can now complete the inspection"
                }
              </p>
            </div>
            <button
              onClick={() => setShowCompleteForm(true)}
              className={`w-full sm:w-auto flex-1 sm:flex-none flex items-center justify-center gap-2 font-medium px-8 py-3.5 rounded-xl transition-all text-base ${
                completedCount === items.length
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-400 hover:shadow-lg hover:-translate-y-0.5"
                  : "bg-stone-900 text-white shadow-sm hover:bg-stone-800"
              }`}
            >
              Complete Inspection
              <iconify-icon icon="solar:check-circle-linear" class="text-xl" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InspectionItemCard({
  item,
  media,
  disabled,
  uploading,
  expanded,
  onExpand,
  onToggle,
  onStatus,
  onComment,
  onUpload,
  onDeleteMedia,
}: {
  item: InspectionItem;
  media: { id: string; url: string; fileType: string; fileName: string | null }[];
  disabled: boolean;
  uploading: boolean;
  expanded: boolean;
  onExpand: () => void;
  onToggle: (id: string, completed: boolean) => void;
  onStatus: (id: string, status: string) => void;
  onComment: (id: string, comment: string) => void;
  onUpload: (id: string, files: FileList) => void;
  onDeleteMedia: (mediaId: string, itemId: string) => void;
}) {
  const [comment, setComment] = useState(item.comment || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isActive = expanded && !item.isCompleted && !disabled;

  return (
    <div
      className={`bg-white border rounded-[1.5rem] p-5 sm:p-6 transition-all ${
        isActive
          ? "border-sky-200 shadow-md shadow-sky-500/5 ring-4 ring-sky-500/5"
          : item.isCompleted
            ? "border-emerald-200 shadow-sm"
            : "border-stone-200 shadow-sm hover:border-stone-300"
      }`}
    >
      <div
        className="flex gap-4 cursor-pointer"
        onClick={() => {
          if (!disabled && !item.isCompleted) onExpand();
        }}
      >
        {/* Checkbox */}
        <div className="pt-0.5 shrink-0">
          <button
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(item.id, !item.isCompleted);
            }}
            className={`w-7 h-7 rounded-[0.5rem] border-2 flex items-center justify-center transition-colors ${
              item.isCompleted
                ? "bg-emerald-500 border-emerald-500 text-white"
                : "border-stone-300 hover:border-sky-500 text-transparent hover:text-sky-200"
            } ${disabled ? "opacity-50" : ""}`}
          >
            <iconify-icon icon="solar:check-read-linear" class="text-xl" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`font-medium text-lg mb-1 leading-snug ${
            item.isCompleted ? "text-stone-400 line-through" : "text-stone-900"
          }`}>
            {item.title}
          </h3>
          {item.description && (
            <p className="text-sm text-stone-500 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Status badge when collapsed */}
          {!expanded && item.status && (
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                item.status === "pass"
                  ? "bg-emerald-100 text-emerald-700"
                  : item.status === "fail"
                    ? "bg-red-100 text-red-700"
                    : "bg-stone-100 text-stone-600"
              }`}>
                {item.status === "na" ? "N/A" : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </span>
            </div>
          )}

          {/* Media count when collapsed */}
          {!expanded && media.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-stone-500">
              <iconify-icon icon="solar:camera-linear" class="text-sm" />
              {media.length} photo{media.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Expanded section */}
      {isActive && (
        <div className="mt-5 ml-11 space-y-5">
          <div className="h-px w-full bg-stone-100" />

          {/* Pass/Fail/NA buttons */}
          <div className="flex gap-2">
            {(["pass", "fail", "na"] as const).map((s) => (
              <button
                key={s}
                onClick={() => onStatus(item.id, s)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  item.status === s
                    ? s === "pass"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : s === "fail"
                        ? "bg-red-500 text-white shadow-sm"
                        : "bg-stone-600 text-white shadow-sm"
                    : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                }`}
              >
                {s === "na" ? "N/A" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Photo Upload Area */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-widest">
              Photos & Notes
            </h4>

            {/* Existing media */}
            {media.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {media.map((m) => (
                  <div key={m.id} className="relative group">
                    {m.fileType === "image" ? (
                      <a href={m.url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={m.url}
                          alt={m.fileName || "Photo"}
                          className="w-20 h-20 rounded-xl object-cover border border-stone-200"
                        />
                      </a>
                    ) : (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-20 h-20 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center"
                      >
                        <iconify-icon icon="solar:videocamera-record-linear" class="text-xl text-stone-400" />
                      </a>
                    )}
                    {!disabled && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          onDeleteMedia(m.id, item.id);
                        }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <iconify-icon icon="solar:close-circle-bold" class="text-xs" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload area */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  onUpload(item.id, e.target.files);
                  e.target.value = "";
                }
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-sky-200 bg-sky-50/50 rounded-[1rem] p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-sky-300 transition-colors group disabled:opacity-50"
            >
              <div className="w-12 h-12 bg-white border border-sky-100 rounded-full flex items-center justify-center mb-3 text-sky-500 group-hover:scale-110 group-hover:shadow-sm transition-all">
                {uploading ? (
                  <iconify-icon icon="solar:refresh-linear" class="text-2xl animate-spin" />
                ) : (
                  <iconify-icon icon="solar:camera-linear" class="text-2xl" />
                )}
              </div>
              <span className="text-sm font-medium text-sky-900 block mb-1">
                {uploading ? "Uploading..." : "Tap to take a photo"}
              </span>
              <span className="text-xs text-sky-600">
                Add photos or videos
              </span>
            </button>

            {/* Notes Input */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onBlur={() => {
                if (comment !== (item.comment || "")) {
                  onComment(item.id, comment);
                }
              }}
              disabled={disabled}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all text-sm text-stone-900 font-medium placeholder-stone-400 resize-none"
              placeholder="Add notes about this task..."
            />
          </div>
        </div>
      )}

      {/* Collapsed completed state with media preview */}
      {item.isCompleted && media.length > 0 && (
        <div className="mt-3 ml-11 flex flex-wrap gap-2">
          {media.slice(0, 4).map((m) => (
            <div key={m.id} className="w-12 h-12 rounded-lg overflow-hidden border border-stone-200">
              {m.fileType === "image" ? (
                <img src={m.url} alt={m.fileName || "Photo"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-stone-100 flex items-center justify-center">
                  <iconify-icon icon="solar:videocamera-record-linear" class="text-stone-400" />
                </div>
              )}
            </div>
          ))}
          {media.length > 4 && (
            <div className="w-12 h-12 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-xs font-medium text-stone-500">
              +{media.length - 4}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
