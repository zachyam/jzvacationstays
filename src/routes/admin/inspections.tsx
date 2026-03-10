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

  function getStatusIcon(status: string) {
    switch (status) {
      case 'completed':
        return <iconify-icon icon="solar:check-circle-bold" class="w-5 h-5 text-emerald-500" />;
      case 'in_progress':
        return <iconify-icon icon="solar:play-circle-bold" class="w-5 h-5 text-sky-500" />;
      default:
        return <iconify-icon icon="solar:hourglass-line-linear" class="w-5 h-5 text-stone-400" />;
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-700">
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-stone-100 text-stone-600">
            Pending
          </span>
        );
    }
  }

  function formatDate(date: Date | string | null) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Group inspections by status
  const completedInspections = inspections.filter(i => i.status === 'completed');
  const inProgressInspections = inspections.filter(i => i.status === 'in_progress');
  const pendingInspections = inspections.filter(i => i.status === 'pending');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Inspections</h1>
        <p className="mt-1 text-sm text-stone-600">
          View and manage all inspection reports
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total</p>
              <p className="mt-1 text-2xl font-bold text-stone-900">{inspections.length}</p>
            </div>
            <iconify-icon icon="solar:clipboard-list-bold" class="w-8 h-8 text-stone-400" />
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Completed</p>
              <p className="mt-1 text-2xl font-bold text-stone-900">{completedInspections.length}</p>
            </div>
            <iconify-icon icon="solar:check-circle-bold" class="w-8 h-8 text-emerald-500" />
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-sky-600 uppercase tracking-wider">In Progress</p>
              <p className="mt-1 text-2xl font-bold text-stone-900">{inProgressInspections.length}</p>
            </div>
            <iconify-icon icon="solar:play-circle-bold" class="w-8 h-8 text-sky-500" />
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Pending</p>
              <p className="mt-1 text-2xl font-bold text-stone-900">{pendingInspections.length}</p>
            </div>
            <iconify-icon icon="solar:hourglass-line-linear" class="w-8 h-8 text-stone-400" />
          </div>
        </div>
      </div>

      {/* Inspections Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Checklist
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Media
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {inspections.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-stone-500">
                    No inspections created yet
                  </td>
                </tr>
              ) : (
                inspections.map((inspection) => {
                  const completionRate = inspection.totalItems > 0
                    ? Math.round((inspection.completedItems / inspection.totalItems) * 100)
                    : 0;

                  return (
                    <tr key={inspection.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3">
                        {getStatusBadge(inspection.status)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-stone-900">
                          {inspection.propertyName || 'No property'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-stone-900">{inspection.checklistTitle}</div>
                          {inspection.checklistType && (
                            <div className="text-xs text-stone-500">{inspection.checklistType}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-stone-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                completionRate === 100
                                  ? 'bg-emerald-500'
                                  : completionRate > 0
                                  ? 'bg-sky-500'
                                  : 'bg-stone-300'
                              }`}
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                          <span className="text-xs text-stone-600 whitespace-nowrap">
                            {inspection.completedItems}/{inspection.totalItems}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {inspection.mediaCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-sm text-stone-600">
                            <iconify-icon icon="solar:camera-linear" class="w-4 h-4" />
                            {inspection.mediaCount}
                          </span>
                        ) : (
                          <span className="text-sm text-stone-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-stone-600">
                          {formatDate(inspection.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-stone-600">
                          {formatDate(inspection.completedAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            to="/admin/inspections/$inspectionId"
                            params={{ inspectionId: inspection.id }}
                            className="p-1 hover:bg-stone-100 rounded text-stone-600 hover:text-stone-900 transition-colors"
                            title="View Details"
                          >
                            <iconify-icon icon="solar:eye-linear" class="w-4 h-4" />
                          </Link>
                          {inspection.status !== 'completed' && (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  `${window.location.origin}/inspect/${inspection.token}`
                                );
                                alert('Inspection link copied to clipboard!');
                              }}
                              className="p-1 hover:bg-stone-100 rounded text-stone-600 hover:text-stone-900 transition-colors"
                              title="Copy Link"
                            >
                              <iconify-icon icon="solar:link-linear" class="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-stone-500">
        <div className="flex items-center gap-2">
          <iconify-icon icon="solar:check-circle-bold" class="w-4 h-4 text-emerald-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <iconify-icon icon="solar:play-circle-bold" class="w-4 h-4 text-sky-500" />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <iconify-icon icon="solar:hourglass-line-linear" class="w-4 h-4 text-stone-400" />
          <span>Pending (not started)</span>
        </div>
      </div>
    </div>
  );
}