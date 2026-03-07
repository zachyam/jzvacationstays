import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import {
  getInspectionReport,
  deleteInspection,
} from "../../../server/functions/inspections";

export const Route = createFileRoute("/_admin/inspections/$inspectionId")({
  loader: async ({ params }) => {
    try {
      return await getInspectionReport({
        data: { inspectionId: params.inspectionId },
      });
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
  component: InspectionReportPage,
});

const STATUS_COLORS: Record<string, string> = {
  pass: "bg-emerald-100 text-emerald-700",
  fail: "bg-red-100 text-red-700",
  na: "bg-stone-100 text-stone-500",
};

function InspectionReportPage() {
  const { inspection, checklistTitle, propertyName, items, media } =
    Route.useLoaderData();
  const [expandedMedia, setExpandedMedia] = useState<string | null>(null);

  if (!inspection) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-400 text-lg">Inspection not found.</p>
        <Link
          to="/inspections"
          className="text-sky-600 hover:text-sky-700 font-medium text-sm mt-2 inline-block"
        >
          Back to inspections
        </Link>
      </div>
    );
  }

  // Group items by room
  const rooms = new Map<
    string,
    typeof items
  >();
  for (const item of items) {
    const room = item.room || "General";
    if (!rooms.has(room)) rooms.set(room, []);
    rooms.get(room)!.push(item);
  }

  const completedCount = items.filter((i) => i.isCompleted).length;
  const passCount = items.filter((i) => i.status === "pass").length;
  const failCount = items.filter((i) => i.status === "fail").length;

  const inspectionLink = `${typeof window !== "undefined" ? window.location.origin : ""}/inspect/${inspection.token}`;

  async function handleDelete() {
    if (!inspection || !confirm("Delete this inspection?")) return;
    await deleteInspection({ data: { inspectionId: inspection.id } });
    window.location.href = "/inspections";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/inspections"
            className="text-sm text-stone-400 hover:text-stone-600 mb-1 inline-block"
          >
            &larr; Inspections
          </Link>
          <h1 className="text-2xl font-medium text-stone-900">
            {checklistTitle}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {propertyName || "No property"} &bull;{" "}
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                inspection.status === "completed"
                  ? "bg-emerald-100 text-emerald-700"
                  : inspection.status === "in_progress"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-stone-100 text-stone-600"
              }`}
            >
              {inspection.status === "in_progress"
                ? "In Progress"
                : inspection.status.charAt(0).toUpperCase() +
                  inspection.status.slice(1)}
            </span>
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
        >
          Delete
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-medium text-stone-900">
            {completedCount}/{items.length}
          </p>
          <p className="text-xs text-stone-400 mt-1">Completed</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-medium text-emerald-600">{passCount}</p>
          <p className="text-xs text-stone-400 mt-1">Passed</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-medium text-red-600">{failCount}</p>
          <p className="text-xs text-stone-400 mt-1">Failed</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-medium text-stone-900">
            {inspection.completedAt
              ? new Date(inspection.completedAt).toLocaleDateString()
              : "—"}
          </p>
          <p className="text-xs text-stone-400 mt-1">Completed Date</p>
        </div>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="w-full bg-stone-100 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all"
            style={{ width: `${(completedCount / items.length) * 100}%` }}
          />
        </div>
      )}

      {/* Shareable link */}
      <div className="bg-white border border-stone-200 rounded-xl p-4">
        <p className="text-xs text-stone-400 mb-2">Inspection Link</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={inspectionLink}
            readOnly
            className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-xs bg-stone-50 font-mono"
          />
          <button
            onClick={() => navigator.clipboard.writeText(inspectionLink)}
            className="px-3 py-2 bg-sky-600 text-white rounded-lg text-xs font-medium hover:bg-sky-700"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Inspector notes */}
      {inspection.notes && (
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-stone-400 mb-2">Inspector Notes</p>
          <p className="text-sm text-stone-700 whitespace-pre-wrap">
            {inspection.notes}
          </p>
        </div>
      )}

      {/* Items grouped by room */}
      {Array.from(rooms.entries()).map(([room, roomItems]) => (
        <div key={room}>
          <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2 px-1">
            {room}
          </h3>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {roomItems.map((item) => {
              const itemMedia = media[item.id] || [];
              return (
                <div key={item.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        item.isCompleted
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-stone-200"
                      }`}
                    >
                      {item.isCompleted && (
                        <svg
                          className="w-3 h-3"
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
                    </div>
                    <span
                      className={`flex-1 text-sm ${
                        item.isCompleted
                          ? "text-stone-400 line-through"
                          : "text-stone-900"
                      }`}
                    >
                      {item.title}
                    </span>
                    {item.status && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status] || ""}`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Comment */}
                  {item.comment && (
                    <div className="ml-8 text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2">
                      {item.comment}
                    </div>
                  )}

                  {/* Media */}
                  {itemMedia.length > 0 && (
                    <div className="ml-8 flex flex-wrap gap-2">
                      {itemMedia.map((m) => (
                        <button
                          key={m.id}
                          onClick={() =>
                            setExpandedMedia(
                              expandedMedia === m.id ? null : m.id,
                            )
                          }
                          className="relative"
                        >
                          {m.fileType === "image" ? (
                            <img
                              src={m.url}
                              alt={m.fileName || "Inspection photo"}
                              className={`rounded-lg object-cover border border-stone-200 transition-all ${
                                expandedMedia === m.id
                                  ? "w-80 h-auto"
                                  : "w-16 h-16"
                              }`}
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center">
                              <iconify-icon
                                icon="solar:videocamera-record-linear"
                                width="24"
                                height="24"
                                class="text-stone-400"
                              />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
