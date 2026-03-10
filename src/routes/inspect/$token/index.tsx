import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  getInspectionByToken,
  startInspection,
  completeInspection,
} from "../../../server/functions/inspections";

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

export const Route = createFileRoute("/inspect/$token/")({
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
  component: InspectionOverviewPage,
});

function InspectionOverviewPage() {
  const { token } = Route.useParams();
  const data = Route.useLoaderData() as LoaderData;
  const navigate = useNavigate();
  const [status, setStatus] = useState(data.inspection?.status || "pending");
  const [completionNotes, setCompletionNotes] = useState("");
  const [showCompleteForm, setShowCompleteForm] = useState(false);

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
  const isStarted = status === "in_progress" || status === "completed";

  // Group items by room
  const rooms = new Map<string, typeof data.items>();
  for (const item of data.items) {
    const room = item.room || "General";
    if (!rooms.has(room)) rooms.set(room, []);
    rooms.get(room)!.push(item);
  }

  const completedCount = data.items.filter((i) => i.isCompleted).length;
  const progressPercent = data.items.length > 0 ? Math.round((completedCount / data.items.length) * 100) : 0;

  async function handleStart() {
    await startInspection({ data: { token } });
    setStatus("in_progress");
    // Navigate to first room
    const firstRoom = Array.from(rooms.keys())[0];
    if (firstRoom) {
      await navigate({ to: `/inspect/${token}/${encodeURIComponent(firstRoom)}` });
    }
  }

  async function handleComplete() {
    await completeInspection({ data: { token, notes: completionNotes } });
    await navigate({ to: `/inspect/complete/${token}` });
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-24 relative">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm shadow-stone-200/50">
        <div className="max-w-3xl mx-auto w-full px-4 sm:px-8 py-5">
          <div className="text-center">
            <h1 className="text-xl font-medium tracking-tight text-stone-900">
              {data.propertyName || "Property Inspection"}
            </h1>
            <p className="text-sm text-stone-500">{data.checklistTitle}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto w-full p-4 sm:p-8 space-y-10">
        {/* Status Card */}
        {!isStarted && (
          <div className="bg-white border border-sky-200 rounded-[1.5rem] p-8 text-center shadow-md shadow-sky-500/5 ring-4 ring-sky-500/5">
            <iconify-icon icon="solar:clipboard-check-linear" class="text-5xl text-sky-500 mb-4" />
            <h2 className="text-xl font-medium text-stone-900 mb-2">Ready to Begin</h2>
            <p className="text-sm text-stone-500 mb-6">
              Tap the button below to start the inspection. You'll inspect each room individually.
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

        {/* Progress Overview */}
        {isStarted && (
          <div className="bg-white border border-stone-200 rounded-[1.5rem] p-6 shadow-sm">
            <h2 className="text-lg font-medium text-stone-900 mb-5">Overall Progress</h2>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-stone-500 uppercase tracking-widest shrink-0">
                {completedCount} of {data.items.length} Done
              </span>
              <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-sky-500 uppercase tracking-widest shrink-0">
                {progressPercent}%
              </span>
            </div>
          </div>
        )}

        {/* Room List */}
        <section className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight text-stone-900 px-2">
            Rooms to Inspect
          </h2>
          <div className="grid gap-4">
            {Array.from(rooms.entries()).map(([room, roomItems]) => {
              const roomCompleted = roomItems.filter(i => i.isCompleted).length;
              const roomProgress = Math.round((roomCompleted / roomItems.length) * 100);
              const isRoomComplete = roomCompleted === roomItems.length;
              const canAccess = isStarted && !isCompleted;

              return (
                <div
                  key={room}
                  className={`relative ${!canAccess ? 'opacity-50' : ''}`}
                >
                  {canAccess ? (
                    <Link
                      to={`/inspect/${token}/${encodeURIComponent(room)}`}
                      className={`block bg-white border rounded-[1.5rem] p-6 transition-all ${
                        isRoomComplete
                          ? 'border-emerald-200 shadow-sm'
                          : 'border-stone-200 shadow-sm hover:border-sky-200 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            isRoomComplete
                              ? 'bg-emerald-500 text-white'
                              : roomProgress > 0
                                ? 'bg-sky-100 text-sky-500'
                                : 'bg-stone-100 text-stone-400'
                          }`}>
                            <iconify-icon
                              icon={isRoomComplete ? "solar:check-circle-bold" : "solar:map-point-linear"}
                              class="text-2xl"
                            />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-stone-900">{room}</h3>
                            <p className="text-sm text-stone-500">
                              {roomCompleted} of {roomItems.length} items
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {roomProgress > 0 && (
                            <span className={`text-sm font-semibold ${
                              isRoomComplete ? 'text-emerald-600' : 'text-sky-600'
                            }`}>
                              {roomProgress}%
                            </span>
                          )}
                          <iconify-icon
                            icon="solar:arrow-right-linear"
                            class="text-lg text-stone-400"
                          />
                        </div>
                      </div>
                      {roomProgress > 0 && roomProgress < 100 && (
                        <div className="mt-4 w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full transition-all"
                            style={{ width: `${roomProgress}%` }}
                          />
                        </div>
                      )}
                    </Link>
                  ) : (
                    <div className={`bg-white border rounded-[1.5rem] p-6 ${
                      isCompleted ? 'border-emerald-200' : 'border-stone-200'
                    } shadow-sm`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            isRoomComplete && isCompleted
                              ? 'bg-emerald-500 text-white'
                              : 'bg-stone-100 text-stone-400'
                          }`}>
                            <iconify-icon
                              icon={isCompleted && isRoomComplete ? "solar:check-circle-bold" : "solar:lock-linear"}
                              class="text-2xl"
                            />
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-stone-900">{room}</h3>
                            <p className="text-sm text-stone-500">
                              {isCompleted
                                ? `${roomCompleted} of ${roomItems.length} items`
                                : "Start inspection to access"}
                            </p>
                          </div>
                        </div>
                        {isCompleted && roomProgress > 0 && (
                          <span className={`text-sm font-semibold ${
                            isRoomComplete ? 'text-emerald-600' : 'text-stone-600'
                          }`}>
                            {roomProgress}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  {!canAccess && !isCompleted && (
                    <div className="absolute inset-0 bg-white/50 rounded-[1.5rem] flex items-center justify-center">
                      <div className="bg-white border border-stone-200 rounded-xl px-4 py-2 shadow-sm flex items-center gap-2">
                        <iconify-icon icon="solar:lock-linear" class="text-stone-400" />
                        <span className="text-sm font-medium text-stone-600">Locked</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Complete button */}
        {status === "in_progress" && progressPercent === 100 && !showCompleteForm && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setShowCompleteForm(true)}
              className="bg-emerald-500 text-white font-medium px-8 py-3.5 rounded-xl shadow-md shadow-emerald-500/20 hover:bg-emerald-400 hover:shadow-lg hover:-translate-y-0.5 transition-all text-base flex items-center gap-2"
            >
              Complete Inspection
              <iconify-icon icon="solar:check-circle-linear" class="text-xl" />
            </button>
          </div>
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
    </div>
  );
}