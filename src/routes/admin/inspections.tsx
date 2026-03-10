import { createFileRoute, Link } from "@tanstack/react-router";
import { getAllInspections } from "../../server/functions/inspections";

export const Route = createFileRoute("/admin/inspections")({
  loader: async () => {
    try {
      return await getAllInspections();
    } catch {
      return [];
    }
  },
  component: InspectionsPage,
});

function InspectionsPage() {
  const inspections = Route.useLoaderData();

  function formatDate(date: Date | string | null) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Group inspections by status
  const needsReviewInspections = inspections.filter(i =>
    i.status === 'completed' || i.status === 'in_progress'
  );
  const pendingInspections = inspections.filter(i => i.status === 'pending');

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-medium tracking-tight text-stone-900 mb-2">
            Inspections
          </h1>
          <p className="text-stone-500 text-lg">
            Review and manage all inspection reports.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-[1.25rem] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total</p>
              <p className="mt-1 text-3xl font-medium text-stone-900">{inspections.length}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
              <iconify-icon icon="solar:clipboard-list-bold" class="text-xl text-stone-400" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-emerald-100 rounded-[1.25rem] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Completed</p>
              <p className="mt-1 text-3xl font-medium text-stone-900">
                {inspections.filter(i => i.status === 'completed').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <iconify-icon icon="solar:check-circle-bold" class="text-xl text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-sky-100 rounded-[1.25rem] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-sky-600 uppercase tracking-wider">In Progress</p>
              <p className="mt-1 text-3xl font-medium text-stone-900">
                {inspections.filter(i => i.status === 'in_progress').length}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center">
              <iconify-icon icon="solar:play-circle-bold" class="text-xl text-sky-500" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-[1.25rem] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Pending</p>
              <p className="mt-1 text-3xl font-medium text-stone-900">{pendingInspections.length}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center">
              <iconify-icon icon="solar:hourglass-line-linear" class="text-xl text-stone-400" />
            </div>
          </div>
        </div>
      </div>

      {inspections.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-[1.5rem] p-12 text-center shadow-sm">
          <iconify-icon icon="solar:clipboard-list-linear" class="text-5xl text-stone-300 mb-4" />
          <p className="text-stone-500 text-lg">No inspections created yet.</p>
          <p className="text-sm text-stone-400 mt-2">
            Create an inspection from a checklist to get started.
          </p>
        </div>
      ) : (
        <>
          {/* Active Inspections */}
          {needsReviewInspections.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-medium tracking-tight text-stone-900 flex items-center gap-2 px-2">
                <iconify-icon icon="solar:document-add-linear" class="text-stone-400" />
                Active Inspections
              </h2>

              <div className="space-y-4">
                {needsReviewInspections.map((inspection) => {
                  const completionRate = inspection.totalItems > 0
                    ? Math.round((inspection.completedItems / inspection.totalItems) * 100)
                    : 0;
                  const isCompleted = inspection.status === 'completed';
                  const needsReview = isCompleted && completionRate < 100;

                  return (
                    <Link
                      key={inspection.id}
                      to="/admin/inspections/$inspectionId"
                      params={{ inspectionId: inspection.id }}
                      className={`block bg-white border rounded-[1.5rem] p-5 sm:p-6 transition-all cursor-pointer group relative overflow-hidden ${
                        needsReview
                          ? "border-rose-200 shadow-md shadow-rose-500/5 ring-4 ring-rose-500/5"
                          : isCompleted
                            ? "border-emerald-200 shadow-sm hover:border-emerald-300"
                            : "border-stone-200 shadow-sm hover:border-stone-300"
                      }`}
                    >
                      {needsReview && (
                        <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-xl z-10">
                          Needs Review
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                        <div className="flex gap-4 items-center mt-2 sm:mt-0">
                          <div className={`w-12 h-12 rounded-full border flex items-center justify-center shrink-0 ${
                            needsReview
                              ? "bg-rose-50 border-rose-100 text-rose-500"
                              : isCompleted
                                ? "bg-emerald-50 border-emerald-100 text-emerald-500"
                                : "bg-sky-50 border-sky-100 text-sky-500"
                          }`}>
                            <iconify-icon
                              icon={
                                needsReview
                                  ? "solar:danger-triangle-bold"
                                  : isCompleted
                                    ? "solar:check-circle-bold"
                                    : "solar:play-circle-bold"
                              }
                              class="text-2xl"
                            />
                          </div>
                          <div>
                            <h3 className="font-medium text-stone-900 text-lg mb-0.5 leading-snug group-hover:text-sky-600 transition-colors">
                              {inspection.propertyName || 'No property'}
                            </h3>
                            <p className="text-sm text-stone-500 flex items-center gap-2">
                              <iconify-icon icon="solar:calendar-linear" />
                              {formatDate(inspection.createdAt)}
                              <span className="w-1 h-1 rounded-full bg-stone-300" />
                              {inspection.checklistTitle}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 border-t sm:border-t-0 border-stone-100 pt-4 sm:pt-0">
                          {/* Progress */}
                          <div className="flex items-center gap-2 text-sm text-stone-600 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200">
                            <iconify-icon icon="solar:chart-2-linear" class="text-stone-400" />
                            {inspection.completedItems}/{inspection.totalItems}
                          </div>
                          {inspection.mediaCount > 0 && (
                            <div className="flex items-center gap-1.5 text-sm text-stone-600 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200">
                              <iconify-icon icon="solar:camera-linear" class="text-stone-400" />
                              {inspection.mediaCount}
                            </div>
                          )}
                          <div className={`w-10 h-10 bg-white border rounded-xl flex items-center justify-center transition-colors z-10 relative ${
                            needsReview
                              ? "border-rose-200 text-rose-500 group-hover:bg-rose-50 group-hover:border-rose-300"
                              : "border-stone-200 text-stone-500 group-hover:bg-sky-50 group-hover:text-sky-600 group-hover:border-sky-200"
                          }`}>
                            <iconify-icon icon="solar:alt-arrow-right-linear" class="text-xl" />
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-4 flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isCompleted ? 'bg-emerald-500' : 'bg-sky-500'
                            }`}
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-stone-500">{completionRate}%</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Pending Inspections */}
          {pendingInspections.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-medium tracking-tight text-stone-900 flex items-center gap-2 px-2">
                <iconify-icon icon="solar:clock-circle-linear" class="text-stone-400" />
                Pending Inspections
              </h2>

              <div className="space-y-4">
                {pendingInspections.map((inspection) => (
                  <div
                    key={inspection.id}
                    className="bg-white border border-stone-200 rounded-[1.5rem] p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row gap-4 sm:items-center justify-between"
                  >
                    <div className="flex gap-4 items-center">
                      <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 shrink-0">
                        <iconify-icon icon="solar:clock-circle-bold" class="text-2xl" />
                      </div>
                      <div>
                        <h3 className="font-medium text-stone-900 text-lg mb-0.5 leading-snug">
                          {inspection.propertyName || 'No property'}
                        </h3>
                        <p className="text-sm text-stone-500 flex items-center gap-2">
                          <iconify-icon icon="solar:calendar-linear" />
                          {formatDate(inspection.createdAt)}
                          <span className="w-1 h-1 rounded-full bg-stone-300" />
                          {inspection.checklistTitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 border-t sm:border-t-0 border-stone-100 pt-4 sm:pt-0">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/inspect/${inspection.token}`
                          );
                          alert('Inspection link copied to clipboard!');
                        }}
                        className="flex items-center gap-2 text-sm font-medium text-stone-600 bg-stone-50 px-4 py-2 rounded-xl border border-stone-200 hover:bg-stone-100 transition-colors"
                      >
                        <iconify-icon icon="solar:link-linear" class="text-stone-400" />
                        Copy Link
                      </button>
                      <Link
                        to="/admin/inspections/$inspectionId"
                        params={{ inspectionId: inspection.id }}
                        className="w-10 h-10 bg-white border border-stone-200 rounded-xl flex items-center justify-center text-stone-500 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 transition-colors"
                      >
                        <iconify-icon icon="solar:alt-arrow-right-linear" class="text-xl" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
