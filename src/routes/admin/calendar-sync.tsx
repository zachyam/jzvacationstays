import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { getProperties } from "../../server/functions/properties";
import {
  getCalendarSyncs,
  addCalendarSync,
  removeCalendarSync,
  syncCalendar,
} from "../../server/functions/calendar-sync";

export const Route = createFileRoute("/admin/calendar-sync")({
  loader: async () => {
    try {
      const properties = await getProperties();
      const syncs: Record<string, Awaited<ReturnType<typeof getCalendarSyncs>>> = {};

      for (const prop of properties) {
        syncs[prop.id] = await getCalendarSyncs({ data: { propertyId: prop.id } });
      }

      return { properties, syncs };
    } catch {
      return { properties: [], syncs: {} };
    }
  },
  component: CalendarSyncPage,
});

const PLATFORMS = ["airbnb", "vrbo", "hospitable", "other"];

function CalendarSyncPage() {
  const { properties, syncs } = Route.useLoaderData();
  const [adding, setAdding] = useState<string | null>(null);
  const [platform, setPlatform] = useState("airbnb");
  const [url, setUrl] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);

  async function handleAdd(propertyId: string) {
    if (!url) return;
    await addCalendarSync({ data: { propertyId, platform, icalImportUrl: url } });
    setAdding(null);
    setUrl("");
    window.location.reload();
  }

  async function handleSync(syncId: string) {
    setSyncing(syncId);
    const result = await syncCalendar({ data: { syncId } });
    setSyncing(null);
    if (result.success) {
      alert(`Synced: ${result.eventsFound} events, ${result.datesBlocked} dates blocked`);
    } else {
      alert(`Sync failed: ${result.error}`);
    }
  }

  async function handleRemove(syncId: string) {
    if (!confirm("Remove this calendar sync?")) return;
    await removeCalendarSync({ data: { syncId } });
    window.location.reload();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium text-stone-900">Calendar Sync</h1>
        <p className="text-stone-500 text-sm mt-1">
          Manage iCal feeds for Airbnb, VRBO, and Hospitable.
        </p>
      </div>

      {properties.map((property) => (
        <div
          key={property.id}
          className="bg-white border border-stone-200 rounded-xl p-5 space-y-4"
        >
          <h3 className="font-medium text-stone-900">{property.name}</h3>

          {/* Existing syncs */}
          {(syncs[property.id] || []).length > 0 ? (
            <div className="space-y-2">
              {(syncs[property.id] || []).map((sync) => (
                <div
                  key={sync.id}
                  className="flex items-center justify-between bg-stone-50 rounded-lg px-4 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium text-stone-900 capitalize">
                      {sync.platform}
                    </span>
                    {sync.lastSyncedAt && (
                      <span className="text-stone-400 ml-2">
                        Last synced:{" "}
                        {new Date(sync.lastSyncedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSync(sync.id)}
                      disabled={syncing === sync.id}
                      className="px-3 py-1 bg-sky-100 text-sky-700 rounded-lg text-xs font-medium hover:bg-sky-200 disabled:opacity-50"
                    >
                      {syncing === sync.id ? "Syncing..." : "Sync now"}
                    </button>
                    <button
                      onClick={() => handleRemove(sync.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-400">No syncs configured.</p>
          )}

          {/* Add new sync */}
          {adding === property.id ? (
            <div className="space-y-3 border-t border-stone-100 pt-4">
              <div className="flex gap-3">
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.airbnb.com/calendar/ical/..."
                  className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAdd(property.id)}
                  disabled={!url}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
                >
                  Add feed
                </button>
                <button
                  onClick={() => setAdding(null)}
                  className="px-4 py-2 border border-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(property.id)}
              className="text-sm text-sky-600 hover:text-sky-700 font-medium"
            >
              + Add calendar feed
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
