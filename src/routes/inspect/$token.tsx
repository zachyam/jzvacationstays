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

  if (!data.inspection) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center max-w-sm">
          <iconify-icon
            icon="solar:clipboard-remove-linear"
            width="48"
            height="48"
            class="text-stone-300"
          />
          <h1 className="text-lg font-medium text-stone-900 mt-4">
            Inspection Not Found
          </h1>
          <p className="text-sm text-stone-400 mt-2">
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

        // Upload directly to S3
        await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        // Record in database
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

        // Update local state
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
      await deleteInspectionMedia({
        data: { token, mediaId },
      });

      // Update local state to remove the deleted media
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
    // Redirect to summary page
    window.location.href = `/inspect/complete/${token}`;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-lg font-medium text-stone-900">
            {data.checklistTitle}
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {data.propertyName || "Property Inspection"}
          </p>
          {/* Progress */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1 bg-stone-100 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{
                  width: `${items.length > 0 ? (completedCount / items.length) * 100 : 0}%`,
                }}
              />
            </div>
            <span className="text-xs text-stone-400 tabular-nums">
              {completedCount}/{items.length}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Start button */}
        {status === "pending" && (
          <button
            onClick={handleStart}
            className="w-full py-3 bg-sky-600 text-white rounded-xl text-sm font-medium hover:bg-sky-700"
          >
            Start Inspection
          </button>
        )}

        {isCompleted && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <iconify-icon
              icon="solar:check-circle-linear"
              width="32"
              height="32"
              class="text-emerald-500"
            />
            <p className="text-sm font-medium text-emerald-700 mt-2">
              Inspection Complete
            </p>
            {data.inspection.notes && (
              <p className="text-xs text-emerald-600 mt-1">
                {data.inspection.notes}
              </p>
            )}
          </div>
        )}

        {/* Items by room */}
        {Array.from(rooms.entries()).map(([room, roomItems]) => (
          <div key={room}>
            <h2 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2 px-1">
              {room}
            </h2>
            <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
              {roomItems.map((item) => (
                <InspectionItemRow
                  key={item.id}
                  item={item}
                  media={media[item.id] || []}
                  disabled={isCompleted}
                  uploading={uploading === item.id}
                  onToggle={handleToggle}
                  onStatus={handleStatus}
                  onComment={handleComment}
                  onUpload={handleFileUpload}
                  onDeleteMedia={handleDeleteMedia}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Complete button */}
        {status === "in_progress" && !showCompleteForm && (
          <button
            onClick={() => setShowCompleteForm(true)}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700"
          >
            Complete Inspection
          </button>
        )}

        {showCompleteForm && (
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-stone-900">
              Complete Inspection
            </p>
            <textarea
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              placeholder="Any overall notes? (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleComplete}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                Confirm Complete
              </button>
              <button
                onClick={() => setShowCompleteForm(false)}
                className="px-4 py-2.5 border border-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InspectionItemRow({
  item,
  media,
  disabled,
  uploading,
  onToggle,
  onStatus,
  onComment,
  onUpload,
  onDeleteMedia,
}: {
  item: {
    id: string;
    title: string;
    description: string | null;
    isCompleted: boolean;
    status: string | null;
    comment: string | null;
  };
  media: { id: string; url: string; fileType: string; fileName: string | null }[];
  disabled: boolean;
  uploading: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onStatus: (id: string, status: string) => void;
  onComment: (id: string, comment: string) => void;
  onUpload: (id: string, files: FileList) => void;
  onDeleteMedia: (mediaId: string, itemId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comment, setComment] = useState(item.comment || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="px-4 py-3">
      {/* Main row */}
      <div className="flex items-start gap-3">
        <button
          disabled={disabled}
          onClick={() => onToggle(item.id, !item.isCompleted)}
          className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
            item.isCompleted
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-stone-300 hover:border-stone-400"
          } ${disabled ? "opacity-50" : ""}`}
        >
          {item.isCompleted && (
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={3}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-left w-full"
          >
            <span
              className={`text-sm ${
                item.isCompleted
                  ? "text-stone-400 line-through"
                  : "text-stone-900"
              }`}
            >
              {item.title}
            </span>
            {item.description && (
              <p className="text-xs text-stone-400 mt-0.5">
                {item.description}
              </p>
            )}
          </button>
        </div>
        <div className="flex items-center gap-1">
          {item.status && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                item.status === "pass"
                  ? "bg-emerald-100 text-emerald-700"
                  : item.status === "fail"
                    ? "bg-red-100 text-red-700"
                    : "bg-stone-100 text-stone-500"
              }`}
            >
              {item.status.toUpperCase()}
            </span>
          )}
          {media.length > 0 && (
            <span className="text-[10px] text-stone-300">
              {media.length} file{media.length !== 1 ? "s" : ""}
            </span>
          )}
          <iconify-icon
            icon={expanded ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
            width="16"
            height="16"
            class="text-stone-300"
          />
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="mt-3 ml-9 space-y-3">
          {/* Pass/Fail/NA */}
          {!disabled && (
            <div className="flex gap-1.5">
              {["pass", "fail", "na"].map((s) => (
                <button
                  key={s}
                  onClick={() => onStatus(item.id, s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    item.status === s
                      ? s === "pass"
                        ? "bg-emerald-500 text-white"
                        : s === "fail"
                          ? "bg-red-500 text-white"
                          : "bg-stone-500 text-white"
                      : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                  }`}
                >
                  {s === "na" ? "N/A" : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          )}

          {/* Comment */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={() => {
              if (comment !== (item.comment || "")) {
                onComment(item.id, comment);
              }
            }}
            disabled={disabled}
            placeholder="Add a comment..."
            rows={2}
            className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm resize-none disabled:bg-stone-50"
          />

          {/* Media thumbnails */}
          {media.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {media.map((m) => (
                <div key={m.id} className="relative group">
                  {m.fileType === "image" ? (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={m.url}
                        alt={m.fileName || "Photo"}
                        className="w-16 h-16 rounded-lg object-cover border border-stone-200"
                      />
                    </a>
                  ) : (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-16 h-16 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center"
                    >
                      <iconify-icon
                        icon="solar:videocamera-record-linear"
                        width="20"
                        height="20"
                        class="text-stone-400"
                      />
                    </a>
                  )}
                  {/* Delete button - only show when not disabled */}
                  {!disabled && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        onDeleteMedia(m.id, item.id);
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                      title="Delete file"
                    >
                      <iconify-icon icon="solar:close-circle-bold" width="12" height="12" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {!disabled && (
            <>
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
                className="flex items-center gap-1.5 px-3 py-1.5 border border-stone-200 rounded-lg text-xs text-stone-500 hover:bg-stone-50 disabled:opacity-50"
              >
                {uploading ? (
                  "Uploading..."
                ) : (
                  <>
                    <iconify-icon
                      icon="solar:camera-add-linear"
                      width="14"
                      height="14"
                    />
                    Add Photo / Video
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
