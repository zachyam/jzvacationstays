import { createFileRoute, Link } from "@tanstack/react-router";
import { getInspectionDetails } from "../../../server/functions/inspections";

export const Route = createFileRoute("/admin/inspections/$inspectionId")({
  loader: async ({ params }) => {
    try {
      return await getInspectionDetails({ data: { inspectionId: params.inspectionId } });
    } catch {
      return null;
    }
  },
  component: InspectionDetailPage,
});

function InspectionDetailPage() {
  const data = Route.useLoaderData();

  if (!data) {
    return (
      <div className="text-center py-12">
        <iconify-icon icon="solar:close-circle-broken" class="w-16 h-16 text-red-500 mx-auto mb-4" />
        <p className="text-stone-400 text-lg">Inspection not found.</p>
        <Link
          to="/admin/inspections"
          className="text-sky-600 hover:text-sky-700 font-medium text-sm mt-2 inline-block"
        >
          ← Back to inspections
        </Link>
      </div>
    );
  }

  const { inspection, items, mediaByItem } = data;
  const completedCount = items.filter(i => i.isCompleted).length;
  const completionRate = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const totalMedia = Object.values(mediaByItem).reduce((sum, media) => sum + media.length, 0);

  function getStatusBadge(status: string) {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
            <iconify-icon icon="solar:check-circle-bold" class="w-4 h-4" />
            Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-sky-100 text-sky-700">
            <iconify-icon icon="solar:play-circle-bold" class="w-4 h-4" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-stone-100 text-stone-600">
            <iconify-icon icon="solar:hourglass-line-linear" class="w-4 h-4" />
            Pending
          </span>
        );
    }
  }

  // Group items by room
  const itemsByRoom = items.reduce((acc, item) => {
    const room = item.room || 'General';
    if (!acc[room]) acc[room] = [];
    acc[room].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-stone-500 mb-2">
            <Link to="/admin/inspections" className="hover:text-stone-700">
              Inspections
            </Link>
            <iconify-icon icon="solar:alt-arrow-right-linear" class="w-3 h-3" />
            <span className="text-stone-900">{inspection.checklistTitle}</span>
          </div>
          <h1 className="text-2xl font-semibold text-stone-900">Inspection Report</h1>
        </div>
        {inspection.status !== 'completed' && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/inspect/${inspection.token}`
              );
              alert('Inspection link copied to clipboard!');
            }}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 flex items-center gap-2"
          >
            <iconify-icon icon="solar:link-linear" class="w-4 h-4" />
            Copy Link
          </button>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-stone-700 mb-3">Details</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Status</span>
              <span>{getStatusBadge(inspection.status)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Property</span>
              <span className="font-medium text-stone-900">{inspection.propertyName || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Checklist</span>
              <span className="font-medium text-stone-900">{inspection.checklistTitle}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Created</span>
              <span className="text-stone-700">
                {new Date(inspection.createdAt).toLocaleDateString()}
              </span>
            </div>
            {inspection.completedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Completed</span>
                <span className="text-stone-700">
                  {new Date(inspection.completedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-stone-700 mb-3">Statistics</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-stone-900">{completedCount}</div>
              <div className="text-xs text-stone-500 mt-1">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{completionRate}%</div>
              <div className="text-xs text-stone-500 mt-1">Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-stone-900">{totalMedia}</div>
              <div className="text-xs text-stone-500 mt-1">Media</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-stone-500 mb-1">
              <span>Progress</span>
              <span>{completedCount} of {items.length}</span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
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
          </div>
        </div>
      </div>

      {/* Notes */}
      {inspection.notes && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-amber-900 mb-2 flex items-center gap-2">
            <iconify-icon icon="solar:notes-linear" class="w-4 h-4" />
            Notes from Inspector
          </h3>
          <p className="text-sm text-amber-800 whitespace-pre-wrap">{inspection.notes}</p>
        </div>
      )}

      {/* Checklist Items */}
      <div className="bg-white border border-stone-200 rounded-xl">
        <div className="p-4 border-b border-stone-200">
          <h3 className="text-lg font-medium text-stone-900">Checklist Items</h3>
        </div>
        <div className="divide-y divide-stone-100">
          {Object.entries(itemsByRoom).map(([room, roomItems]) => (
            <div key={room} className="p-4">
              <h4 className="text-sm font-medium text-stone-700 mb-3">{room}</h4>
              <div className="space-y-2">
                {roomItems.map((item) => {
                  const media = mediaByItem[item.id] || [];

                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        item.isCompleted ? 'bg-emerald-50' : 'bg-stone-50'
                      }`}
                    >
                      <div className="pt-0.5">
                        {item.isCompleted ? (
                          <iconify-icon icon="solar:check-circle-bold" class="w-5 h-5 text-emerald-500" />
                        ) : (
                          <iconify-icon icon="solar:close-circle-linear" class="w-5 h-5 text-stone-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <span className={`text-sm ${
                              item.isCompleted ? 'text-stone-700' : 'text-stone-500'
                            }`}>
                              {item.title}
                            </span>
                            {item.description && (
                              <p className="text-xs text-stone-500 mt-1">{item.description}</p>
                            )}
                            {item.completedAt && (
                              <p className="text-xs text-stone-500 mt-1">
                                Completed: {new Date(item.completedAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                          {media.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-stone-500 ml-4">
                              <iconify-icon icon="solar:camera-linear" class="w-3 h-3" />
                              {media.length}
                            </span>
                          )}
                        </div>

                        {/* Media Preview */}
                        {media.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {media.map((m) => (
                              <div key={m.id} className="relative group">
                                {m.mimeType.startsWith('image/') ? (
                                  <img
                                    src={m.filePath}
                                    alt={m.originalName}
                                    className="w-20 h-20 object-cover rounded border border-stone-200"
                                  />
                                ) : (
                                  <div className="w-20 h-20 bg-stone-100 rounded border border-stone-200 flex items-center justify-center">
                                    <iconify-icon icon="solar:video-library-linear" class="w-6 h-6 text-stone-400" />
                                  </div>
                                )}
                                {m.uploaderType === 'handyman' && (
                                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" title="Handyman upload" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}