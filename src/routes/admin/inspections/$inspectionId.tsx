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
        <iconify-icon icon="solar:close-circle-broken" class="text-5xl text-red-500 mb-4" />
        <p className="text-stone-400 text-lg">Inspection not found.</p>
        <Link
          to="/admin/inspections"
          className="text-sky-600 hover:text-sky-700 font-medium text-sm mt-2 inline-block"
        >
          Back to inspections
        </Link>
      </div>
    );
  }

  const { inspection, items, mediaByItem } = data;
  const completedCount = items.filter(i => i.isCompleted).length;
  const completionRate = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const totalMedia = Object.values(mediaByItem).reduce((sum, media) => sum + media.length, 0);

  function getStatusConfig(status: string) {
    switch (status) {
      case 'completed':
        return {
          label: "Completed",
          icon: "solar:check-circle-bold",
          bg: "bg-emerald-50",
          border: "border-emerald-100",
          text: "text-emerald-700",
          iconColor: "text-emerald-500",
        };
      case 'in_progress':
        return {
          label: "In Progress",
          icon: "solar:play-circle-bold",
          bg: "bg-sky-50",
          border: "border-sky-100",
          text: "text-sky-700",
          iconColor: "text-sky-500",
        };
      default:
        return {
          label: "Pending",
          icon: "solar:hourglass-line-linear",
          bg: "bg-stone-50",
          border: "border-stone-200",
          text: "text-stone-600",
          iconColor: "text-stone-400",
        };
    }
  }

  const statusConfig = getStatusConfig(inspection.status);

  // Group items by room
  const itemsByRoom = items.reduce((acc, item) => {
    const room = item.room || 'General';
    if (!acc[room]) acc[room] = [];
    acc[room].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <Link
            to="/admin/inspections"
            className="text-sm text-stone-400 hover:text-stone-600 mb-2 inline-flex items-center gap-1 transition-colors"
          >
            <iconify-icon icon="solar:arrow-left-linear" class="text-sm" />
            Inspections
          </Link>
          <h1 className="text-4xl font-medium tracking-tight text-stone-900 mb-2">
            Inspection Report
          </h1>
          <p className="text-stone-500 text-lg">
            {inspection.propertyName || "No property"} &middot; {inspection.checklistTitle}
          </p>
        </div>
        {inspection.status !== 'completed' && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/inspect/${inspection.token}`
              );
              alert('Inspection link copied to clipboard!');
            }}
            className="flex items-center justify-center gap-2 bg-white border border-stone-200 text-stone-900 font-medium px-5 py-2.5 rounded-xl hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm shrink-0 text-sm"
          >
            <iconify-icon icon="solar:link-linear" class="text-lg text-stone-400" />
            Copy Link
          </button>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Details Card */}
        <div className="bg-white border border-stone-200 rounded-[1.5rem] p-6 shadow-sm">
          <h3 className="text-lg font-medium text-stone-900 mb-5">Details</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-500">Status</span>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} border ${statusConfig.border} ${statusConfig.text}`}>
                <iconify-icon icon={statusConfig.icon} class={`text-base ${statusConfig.iconColor}`} />
                {statusConfig.label}
              </span>
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
                {new Date(inspection.createdAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </span>
            </div>
            {inspection.completedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Completed</span>
                <span className="text-stone-700">
                  {new Date(inspection.completedAt).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Card */}
        <div className="bg-white border border-stone-200 rounded-[1.5rem] p-6 shadow-sm">
          <h3 className="text-lg font-medium text-stone-900 mb-5">Statistics</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-stone-50 rounded-xl">
              <div className="text-3xl font-medium text-stone-900">{completedCount}</div>
              <div className="text-xs text-stone-500 mt-1 font-medium">Completed</div>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-xl">
              <div className="text-3xl font-medium text-emerald-600">{completionRate}%</div>
              <div className="text-xs text-emerald-600 mt-1 font-medium">Progress</div>
            </div>
            <div className="text-center p-3 bg-sky-50 rounded-xl">
              <div className="text-3xl font-medium text-sky-600">{totalMedia}</div>
              <div className="text-xs text-sky-600 mt-1 font-medium">Media</div>
            </div>
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-xs text-stone-500 mb-2 font-medium">
              <span>Progress</span>
              <span>{completedCount} of {items.length}</span>
            </div>
            <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
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
        <div className="bg-amber-50 border border-amber-200 rounded-[1.5rem] p-6">
          <h3 className="text-base font-medium text-amber-900 mb-2 flex items-center gap-2">
            <iconify-icon icon="solar:notes-linear" class="text-lg" />
            Notes from Inspector
          </h3>
          <p className="text-sm text-amber-800 whitespace-pre-wrap leading-relaxed">{inspection.notes}</p>
        </div>
      )}

      {/* Checklist Items by Room */}
      {Object.entries(itemsByRoom).map(([room, roomItems]) => (
        <section key={room} className="space-y-4">
          <h2 className="text-2xl font-medium tracking-tight text-stone-900 flex items-center gap-2 px-2">
            <iconify-icon icon="solar:map-point-linear" class="text-stone-400" />
            {room}
          </h2>

          <div className="space-y-4">
            {roomItems.map((item) => {
              const itemMedia = mediaByItem[item.id] || [];

              return (
                <div
                  key={item.id}
                  className={`bg-white border rounded-[1.5rem] p-5 sm:p-6 shadow-sm ${
                    item.isCompleted ? "border-emerald-200" : "border-stone-200"
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Status icon */}
                    <div className="pt-0.5 shrink-0">
                      <div className={`w-7 h-7 rounded-[0.5rem] flex items-center justify-center ${
                        item.isCompleted
                          ? "bg-emerald-500 text-white"
                          : "bg-stone-100 text-stone-400"
                      }`}>
                        <iconify-icon
                          icon={item.isCompleted ? "solar:check-read-linear" : "solar:close-circle-linear"}
                          class="text-lg"
                        />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className={`font-medium text-lg mb-1 leading-snug ${
                            item.isCompleted ? "text-stone-900" : "text-stone-500"
                          }`}>
                            {item.title}
                          </h3>
                          {item.description && (
                            <p className="text-sm text-stone-500 leading-relaxed">{item.description}</p>
                          )}
                          {item.completedAt && (
                            <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                              <iconify-icon icon="solar:clock-circle-linear" class="text-sm" />
                              {new Date(item.completedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                        {itemMedia.length > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 border border-stone-200 text-xs font-medium text-stone-600 shrink-0">
                            <iconify-icon icon="solar:camera-linear" class="text-sm" />
                            {itemMedia.length}
                          </span>
                        )}
                      </div>

                      {/* Media Preview */}
                      {itemMedia.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {itemMedia.map((m) => (
                            <div key={m.id} className="relative group">
                              {m.mimeType.startsWith('image/') ? (
                                <a href={m.filePath} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={m.filePath}
                                    alt={m.originalName}
                                    className="w-20 h-20 object-cover rounded-xl border border-stone-200 hover:border-stone-300 transition-colors"
                                  />
                                </a>
                              ) : (
                                <a
                                  href={m.filePath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-20 h-20 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center hover:border-stone-300 transition-colors"
                                >
                                  <iconify-icon icon="solar:videocamera-record-linear" class="text-xl text-stone-400" />
                                </a>
                              )}
                              {m.uploaderType === 'handyman' && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center" title="Handyman upload">
                                  <iconify-icon icon="solar:user-circle-bold" class="text-[10px] text-white" />
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
