import { createFileRoute, Link } from "@tanstack/react-router";

import { getInspections } from "../../../server/functions/inspections";

export const Route = createFileRoute("/_admin/inspections/")({
  loader: async () => {
    try {
      return { inspections: await getInspections() };
    } catch {
      return { inspections: [] };
    }
  },
  component: InspectionsPage,
});

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-stone-100 text-stone-600",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

function InspectionsPage() {
  const { inspections } = Route.useLoaderData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-stone-900">Inspections</h1>
        <p className="text-stone-500 text-sm mt-1">
          View inspection reports and track progress.
        </p>
      </div>

      {inspections.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-stone-400">
          No inspections yet. Create one from a checklist.
        </div>
      ) : (
        <div className="space-y-3">
          {inspections.map(
            ({
              inspection,
              checklistTitle,
              propertyName,
              totalItems,
              completedItems,
            }) => (
              <Link
                key={inspection.id}
                to="/inspections/$inspectionId"
                params={{ inspectionId: inspection.id }}
                className="block bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-stone-900">
                        {checklistTitle}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inspection.status] || STATUS_STYLES.pending}`}
                      >
                        {STATUS_LABELS[inspection.status] || inspection.status}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400">
                      {propertyName || "No property"} &bull;{" "}
                      {completedItems}/{totalItems} items &bull;{" "}
                      {new Date(inspection.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {totalItems > 0 && (
                      <div className="w-24 bg-stone-100 rounded-full h-1.5">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all"
                          style={{
                            width: `${(completedItems / totalItems) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                    <span className="text-stone-300">&rarr;</span>
                  </div>
                </div>
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}
