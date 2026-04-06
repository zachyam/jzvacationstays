import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  getInspectionRoomData,
  updateInspectionItem,
  addInspectionMedia,
  deleteInspectionMedia,
} from "../../../server/functions/inspections";
import { uploadInspectionFile } from "../../../server/functions/uploads";
import { InspectionImage } from "../../../components/inspection-image";

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
  allRooms: string[];
};

export const Route = createFileRoute("/inspect/$token/$room")({
  loader: async ({ params }): Promise<LoaderData> => {
    try {
      // Use the optimized room-specific data fetching
      const data = await getInspectionRoomData({
        data: {
          token: params.token,
          room: params.room
        }
      }) as LoaderData;

      return data;
    } catch {
      return {
        inspection: null,
        checklistTitle: null,
        propertyName: null,
        items: [],
        media: {},
        allRooms: [],
      };
    }
  },
  component: RoomInspectionPage,
});

function RoomInspectionPage() {
  const { token, room } = Route.useParams();
  const data = Route.useLoaderData() as LoaderData;
  const [items, setItems] = useState<InspectionItem[]>(data.items);
  const [media, setMedia] = useState<MediaMap>(data.media);
  const [uploading, setUploading] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Update state when room changes
  useEffect(() => {
    setItems(data.items);
    setMedia(data.media);
    setExpandedItem(null); // Reset expanded item when changing rooms
  }, [room, data.items, data.media]);

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

  const isPending = data.inspection.status === "pending";
  const isCompleted = data.inspection.status === "completed";
  const canEdit = !isPending && !isCompleted;

  // Find current room index and navigation
  const currentRoomIndex = data.allRooms.indexOf(room);
  const previousRoom = currentRoomIndex > 0 ? data.allRooms[currentRoomIndex - 1] : null;
  const nextRoom = currentRoomIndex < data.allRooms.length - 1 ? data.allRooms[currentRoomIndex + 1] : null;

  const completedCount = items.filter((i) => i.isCompleted).length;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const remainingCount = items.length - completedCount;

  async function handleToggle(itemId: string, isCompleted: boolean) {
    if (!canEdit) return;

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
    if (!canEdit) return;

    const currentItem = items.find((i: InspectionItem) => i.id === itemId);
    const newStatus = currentItem?.status === itemStatus ? null : itemStatus;

    // Update both status and completion state
    setItems((prev: InspectionItem[]) =>
      prev.map((i: InspectionItem) =>
        i.id === itemId
          ? {
              ...i,
              status: newStatus,
              // Auto-check the item when Pass or Fail is selected
              isCompleted: newStatus !== null ? true : i.isCompleted,
              completedAt: newStatus !== null ? new Date().toISOString() : i.completedAt
            }
          : i
      ),
    );

    // Update both status and completion in the database
    await updateInspectionItem({
      data: {
        token,
        itemId,
        status: newStatus || "",
        isCompleted: newStatus !== null ? true : currentItem?.isCompleted || false
      },
    });
  }

  async function handleComment(itemId: string, comment: string) {
    if (!canEdit) return;
    await updateInspectionItem({ data: { token, itemId, comment } });
  }

  async function handleFileUpload(
    itemId: string,
    files: FileList,
  ) {
    if (!canEdit) return;

    setUploading(itemId);
    try {
      for (const file of Array.from(files)) {
        console.log('Uploading file:', file.name, file.type, file.size);

        // Convert file to base64
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Upload through server to avoid CORS issues
        const { publicUrl, fileType } = await uploadInspectionFile({
          data: {
            inspectionId: data.inspection!.id,
            itemId,
            file: fileData,
            contentType: file.type,
            fileName: file.name,
            fileSize: file.size,
          },
        });

        console.log('File uploaded successfully, saving to database...');
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
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(null);
    }
  }

  async function handleDeleteMedia(mediaId: string, itemId: string) {
    if (!canEdit) return;
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

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-24 relative">
      {/* Header & Progress */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm shadow-stone-200/50">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-8 pt-5 pb-4">
          {/* Top Nav with Back Button */}
          <div className="relative flex items-center justify-center mb-4">
            <Link
              to="/inspect/$token/"
              params={{ token }}
              className="absolute left-0 w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors"
            >
              <iconify-icon icon="solar:arrow-left-linear" class="text-lg text-stone-600" />
            </Link>
            <div className="text-center">
              <h1 className="text-xl font-medium tracking-tight text-stone-900">
                {room}
              </h1>
              <p className="text-sm text-stone-500">{data.propertyName}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-widest shrink-0">
              {completedCount} of {items.length}
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

      <main className="max-w-3xl mx-auto w-full p-4 sm:p-8 space-y-6">
        {/* Lock Message if Pending */}
        {isPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-[1.5rem] p-6 text-center">
            <iconify-icon icon="solar:lock-linear" class="text-4xl text-amber-500 mb-2" />
            <p className="text-base font-medium text-amber-700">
              Inspection Not Started
            </p>
            <p className="text-sm text-amber-600 mt-1">
              Return to the overview page to start the inspection.
            </p>
            <Link
              to="/inspect/$token/"
              params={{ token }}
              className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-amber-700 hover:text-amber-800 transition-colors"
            >
              <iconify-icon icon="solar:arrow-left-linear" class="text-sm" />
              Back to Overview
            </Link>
          </div>
        )}

        {/* Completed Message */}
        {isCompleted && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-[1.5rem] p-6 text-center">
            <iconify-icon icon="solar:check-circle-bold" class="text-4xl text-emerald-500 mb-2" />
            <p className="text-base font-medium text-emerald-700">
              Inspection Complete
            </p>
            <p className="text-sm text-emerald-600 mt-1">
              This inspection has been finalized and cannot be edited.
            </p>
          </div>
        )}

        {/* Room Navigation */}
        {canEdit && (
          <div className="relative flex items-center justify-center py-1">
            <div className="absolute left-0">
              {previousRoom ? (
                <Link
                  to="/inspect/$token/$room"
                  params={{ token, room: previousRoom }}
                  className="flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
                >
                  <iconify-icon icon="solar:arrow-left-linear" class="text-base" />
                  <span className="max-w-[8rem] truncate">{previousRoom}</span>
                </Link>
              ) : null}
            </div>

            <div className="absolute right-0">
              {nextRoom ? (
                <Link
                  to="/inspect/$token/$room"
                  params={{ token, room: nextRoom }}
                  className="flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
                >
                  <span className="max-w-[8rem] truncate">{nextRoom}</span>
                  <iconify-icon icon="solar:arrow-right-linear" class="text-base" />
                </Link>
              ) : null}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="space-y-4">
          {items.map((item) => (
            <InspectionItemCard
              key={item.id}
              item={item}
              media={media[item.id] || []}
              disabled={!canEdit}
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

        {/* Room Complete - Navigate to Next */}
        {canEdit && progressPercent === 100 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-[1.5rem] p-6 text-center">
            <iconify-icon icon="solar:check-circle-bold" class="text-4xl text-emerald-500 mb-2" />
            <p className="text-base font-medium text-emerald-700 mb-4">
              Room Complete!
            </p>
            <div className="flex gap-3 justify-center">
              {nextRoom ? (
                <Link
                  to="/inspect/$token/$room"
                  params={{ token, room: nextRoom }}
                  className="bg-emerald-500 text-white font-medium px-6 py-3 rounded-xl shadow-sm hover:bg-emerald-400 transition-colors flex items-center gap-2"
                >
                  Next Room
                  <iconify-icon icon="solar:arrow-right-linear" class="text-lg" />
                </Link>
              ) : (
                <Link
                  to="/inspect/$token/"
                  params={{ token }}
                  className="bg-emerald-500 text-white font-medium px-6 py-3 rounded-xl shadow-sm hover:bg-emerald-400 transition-colors flex items-center gap-2"
                >
                  Complete Inspection
                  <iconify-icon icon="solar:check-circle-linear" class="text-lg" />
                </Link>
              )}
              <Link
                to="/inspect/$token/"
                params={{ token }}
                className="bg-white border border-stone-200 text-stone-700 font-medium px-6 py-3 rounded-xl hover:bg-stone-50 transition-colors"
              >
                Back to Overview
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Bottom Bar */}
      {canEdit && progressPercent < 100 && (
        <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-md border-t border-stone-200 px-4 py-4 z-50">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-stone-900">
                {remainingCount > 0 ? `${remainingCount} Remaining` : "All Done!"}
              </p>
              <p className="text-xs text-stone-500">
                Complete all items in this room
              </p>
            </div>
            <div className="flex gap-2 flex-1 sm:flex-none">
              {nextRoom ? (
                <Link
                  to="/inspect/$token/$room"
                  params={{ token, room: nextRoom }}
                  className="flex-1 sm:flex-none bg-stone-900 text-white font-medium px-6 py-3 rounded-xl hover:bg-stone-800 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  Next Room
                  <iconify-icon icon="solar:arrow-right-linear" class="text-lg" />
                </Link>
              ) : (
                <Link
                  to="/inspect/$token/"
                  params={{ token }}
                  className="flex-1 sm:flex-none bg-sky-500 text-white font-medium px-6 py-3 rounded-xl hover:bg-sky-400 transition-colors text-sm flex items-center justify-center gap-2"
                >
                  Back to Overview
                </Link>
              )}
            </div>
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
            : disabled
              ? "border-stone-200 shadow-sm opacity-75"
              : "border-stone-200 shadow-sm hover:border-stone-300 hover:shadow-md"
      }`}
    >
      <div
        className={`flex gap-4 ${!disabled && !item.isCompleted ? "cursor-pointer" : ""}`}
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
                : disabled
                  ? "border-stone-300 text-transparent cursor-not-allowed"
                  : "border-stone-300 hover:border-sky-500 text-transparent hover:text-sky-200"
            }`}
          >
            <iconify-icon icon="solar:check-read-linear" class="text-xl" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
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
            </div>

            {/* Expand/Collapse indicator */}
            {!disabled && !item.isCompleted && (
              <div className={`shrink-0 pt-1 transition-transform ${expanded ? "rotate-180" : ""}`}>
                <iconify-icon
                  icon="solar:alt-arrow-down-linear"
                  class="text-xl text-stone-400"
                />
              </div>
            )}
          </div>

          {/* Action buttons preview when collapsed */}
          {!expanded && !item.isCompleted && !disabled && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-50 text-stone-600 rounded-lg text-xs font-medium border border-stone-200">
                <iconify-icon icon="solar:hand-stars-linear" class="text-sm" />
                Tap to inspect
              </span>

              {!item.status && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs">
                  <iconify-icon icon="solar:danger-circle-linear" class="text-sm" />
                  Needs review
                </span>
              )}

              {item.status && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                  item.status === "pass"
                    ? "bg-emerald-50 text-emerald-700"
                    : item.status === "fail"
                      ? "bg-red-50 text-red-700"
                      : "bg-stone-100 text-stone-600"
                }`}>
                  <iconify-icon
                    icon={item.status === "pass" ? "solar:check-circle-linear" : "solar:close-circle-linear"}
                    class="text-sm"
                  />
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </span>
              )}

              {media.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-50 text-sky-700 rounded-lg text-xs">
                  <iconify-icon icon="solar:camera-linear" class="text-sm" />
                  {media.length}
                </span>
              )}
            </div>
          )}

          {/* Completed state */}
          {item.isCompleted && (
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium">
                <iconify-icon icon="solar:check-circle-bold" class="text-sm" />
                Completed
              </span>
              {item.status && (
                <span className={`text-xs text-stone-500`}>
                  • {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </span>
              )}
              {media.length > 0 && (
                <span className="text-xs text-stone-500">
                  • {media.length} photo{media.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded section */}
      {isActive && (
        <div className="mt-5 ml-11 space-y-5">
          <div className="h-px w-full bg-stone-100" />

          {/* Pass/Fail buttons */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-widest">
              Inspection Status
            </h4>
            <div className="flex gap-2">
              {(["pass", "fail"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onStatus(item.id, s)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    item.status === s
                      ? s === "pass"
                        ? "bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-500/20"
                        : "bg-red-500 text-white shadow-sm ring-2 ring-red-500/20"
                      : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:border-stone-300"
                  }`}
                >
                  <iconify-icon
                    icon={s === "pass" ? "solar:check-circle-linear" : "solar:close-circle-linear"}
                    class="text-base"
                  />
                  {s === "pass" ? "Pass" : "Fail"}
                </button>
              ))}
            </div>
          </div>

          {/* Photo Upload Area */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-widest">
              Photos & Videos
            </h4>

            {/* Existing media */}
            {media.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {media.map((m) => (
                  <div key={m.id} className="relative group">
                    {m.fileType === "image" ? (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-20 h-20"
                      >
                        <InspectionImage
                          src={m.url}
                          alt={m.fileName || "Photo"}
                          className="w-full h-full rounded-xl object-cover border border-stone-200"
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
              disabled={uploading || disabled}
              className="w-full border-2 border-dashed border-sky-300 bg-gradient-to-b from-sky-50 to-sky-100/50 rounded-[1rem] p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-sky-400 hover:from-sky-100 hover:to-sky-100 transition-all group disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <div className="w-14 h-14 bg-white shadow-md rounded-full flex items-center justify-center mb-3 text-sky-600 group-hover:scale-110 group-hover:shadow-lg transition-all">
                {uploading ? (
                  <iconify-icon icon="solar:refresh-linear" class="text-2xl animate-spin" />
                ) : (
                  <iconify-icon icon="solar:camera-add-bold" class="text-2xl" />
                )}
              </div>
              <span className="text-base font-semibold text-sky-900 block mb-1">
                {uploading ? "Uploading..." : "📸 Add Photos/Videos"}
              </span>
              <span className="text-xs text-sky-700 font-medium">
                Tap here to document issues or condition
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
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all text-sm text-stone-900 font-medium placeholder-stone-400 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Add notes about this task..."
            />
          </div>
        </div>
      )}

      {/* Collapsed completed state with media preview */}
      {item.isCompleted && media.length > 0 && !expanded && (
        <div className="mt-3 ml-11 flex flex-wrap gap-2">
          {media.slice(0, 4).map((m) => (
            <div key={m.id} className="w-12 h-12 rounded-lg overflow-hidden border border-stone-200">
              {m.fileType === "image" ? (
                <InspectionImage
                  src={m.url}
                  alt={m.fileName || "Photo"}
                  className="w-full h-full object-cover"
                />
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