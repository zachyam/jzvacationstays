import { createFileRoute, Link } from "@tanstack/react-router";
import { Icon } from "@iconify/react";

export const Route = createFileRoute("/inspect/complete/$token")({
  loader: async ({ params }) => {
    // Get inspection summary data
    const { getInspectionSummary } = await import("../../server/functions/inspections");
    try {
      return await getInspectionSummary({ data: { token: params.token } });
    } catch {
      return null;
    }
  },
  component: InspectionCompletePage,
});

function InspectionCompletePage() {
  const summary = Route.useLoaderData();

  if (!summary) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Icon icon="solar:close-circle-broken" className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-medium text-stone-900 mb-2">Inspection Not Found</h1>
          <p className="text-stone-600">This inspection may have been deleted or the link is invalid.</p>
        </div>
      </div>
    );
  }

  const completedCount = summary.items.filter(i => i.isCompleted).length;
  const totalCount = summary.items.length;
  const completionRate = Math.round((completedCount / totalCount) * 100);
  const mediaCount = summary.totalMedia || 0;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Success Header */}
      <div className="bg-emerald-500 text-white">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <Icon icon="solar:check-circle-bold" className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Inspection Complete!</h1>
          <p className="opacity-90">Thank you for completing the inspection</p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Inspection Summary</h2>

            {/* Property Info */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Property</span>
                <span className="font-medium text-stone-900">{summary.propertyName || "N/A"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Checklist</span>
                <span className="font-medium text-stone-900">{summary.checklistTitle}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Date</span>
                <span className="font-medium text-stone-900">
                  {new Date(summary.completedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Time</span>
                <span className="font-medium text-stone-900">
                  {new Date(summary.completedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 py-4 border-t border-b border-stone-100">
              <div className="text-center">
                <div className="text-2xl font-bold text-stone-900">{completedCount}</div>
                <div className="text-xs text-stone-600 mt-1">Items Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{completionRate}%</div>
                <div className="text-xs text-stone-600 mt-1">Completion Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-stone-900">{mediaCount}</div>
                <div className="text-xs text-stone-600 mt-1">Photos/Videos</div>
              </div>
            </div>

            {/* Completed Items */}
            {completedCount > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-stone-700 mb-3">Completed Items</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {summary.items
                    .filter(item => item.isCompleted)
                    .map(item => (
                      <div key={item.id} className="flex items-start gap-2 text-sm">
                        <Icon icon="solar:check-circle-linear" className="w-4 h-4 text-emerald-500 mt-0.5" />
                        <div className="flex-1">
                          <span className="text-stone-700">{item.title}</span>
                          {item.room && (
                            <span className="text-stone-500 text-xs ml-2">({item.room})</span>
                          )}
                          {item.mediaCount > 0 && (
                            <span className="inline-flex items-center gap-1 ml-2 text-xs text-stone-500">
                              <Icon icon="solar:camera-linear" className="w-3 h-3" />
                              {item.mediaCount}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Incomplete Items */}
            {completedCount < totalCount && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-stone-700 mb-3">Not Completed</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {summary.items
                    .filter(item => !item.isCompleted)
                    .map(item => (
                      <div key={item.id} className="flex items-start gap-2 text-sm">
                        <Icon icon="solar:close-circle-linear" className="w-4 h-4 text-stone-400 mt-0.5" />
                        <div className="flex-1">
                          <span className="text-stone-500">{item.title}</span>
                          {item.room && (
                            <span className="text-stone-400 text-xs ml-2">({item.room})</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {summary.notes && (
              <div className="mt-6 p-4 bg-stone-50 rounded-lg">
                <h3 className="text-sm font-medium text-stone-700 mb-2">Notes</h3>
                <p className="text-sm text-stone-600 whitespace-pre-wrap">{summary.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Message */}
        <div className="text-center py-6">
          <Icon icon="solar:shield-check-linear" className="w-12 h-12 text-stone-400 mx-auto mb-3" />
          <p className="text-sm text-stone-600">
            This inspection has been saved and sent to the property manager.
          </p>
          <p className="text-xs text-stone-500 mt-2">
            You can close this window or bookmark it for your records.
          </p>
        </div>
      </div>
    </div>
  );
}