import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import {
  getChecklistById,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklist,
} from "../../../server/functions/admin-checklists";
import { createInspection } from "../../../server/functions/inspections";
import { getProperties } from "../../../server/functions/properties";

export const Route = createFileRoute("/admin/checklists/$checklistId")({
  loader: async ({ params }) => {
    try {
      const [checklistData, properties] = await Promise.all([
        getChecklistById({ data: { checklistId: params.checklistId } }),
        getProperties(),
      ]);
      return { ...checklistData, properties };
    } catch {
      return { checklist: null, items: [], properties: [] };
    }
  },
  component: ChecklistDetailPage,
});

function ChecklistDetailPage() {
  const { checklist, items, properties } = Route.useLoaderData();
  const [newItem, setNewItem] = useState("");
  const [newRoom, setNewRoom] = useState("");
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [inspectionPropertyId, setInspectionPropertyId] = useState(
    checklist?.propertyId || "",
  );
  const [inspectionLink, setInspectionLink] = useState("");

  if (!checklist) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-400 text-lg">Checklist not found.</p>
        <Link
          to="/checklists"
          className="text-sky-600 hover:text-sky-700 font-medium text-sm mt-2 inline-block"
        >
          Back to checklists
        </Link>
      </div>
    );
  }

  // Group items by room
  const rooms = new Map<string, typeof items>();
  for (const item of items) {
    const room = item.room || "General";
    if (!rooms.has(room)) rooms.set(room, []);
    rooms.get(room)!.push(item);
  }

  // Unique room names for autocomplete
  const existingRooms = [
    ...new Set(items.map((i) => i.room).filter(Boolean)),
  ] as string[];

  async function handleAddItem() {
    if (!newItem || !checklist) return;
    await addChecklistItem({
      data: {
        checklistId: checklist.id,
        title: newItem,
        room: newRoom || undefined,
        sortOrder: items.length,
      },
    });
    setNewItem("");
    window.location.reload();
  }

  async function handleToggle(itemId: string, isCompleted: boolean) {
    await toggleChecklistItem({ data: { itemId, isCompleted } });
    window.location.reload();
  }

  async function handleDelete() {
    if (!checklist || !confirm("Delete this checklist and all its items?"))
      return;
    await deleteChecklist({ data: { checklistId: checklist.id } });
    window.location.href = "/checklists";
  }

  async function handleCreateInspection() {
    if (!checklist) return;
    const result = await createInspection({
      data: {
        checklistId: checklist.id,
        propertyId: inspectionPropertyId || undefined,
      },
    });
    const url = `${window.location.origin}/inspect/${result.token}`;
    setInspectionLink(url);
  }

  const completedCount = items.filter((i) => i.isCompleted).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/checklists"
            className="text-sm text-stone-400 hover:text-stone-600 mb-1 inline-block"
          >
            &larr; Checklists
          </Link>
          <h1 className="text-2xl font-medium text-stone-900">
            {checklist.title}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {checklist.type} &bull; {completedCount}/{items.length} completed
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInspectionForm(!showInspectionForm)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            Create Inspection
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Create Inspection Form */}
      {showInspectionForm && (
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
          {!inspectionLink ? (
            <>
              <p className="text-sm text-stone-600">
                Create a new inspection from this checklist. A shareable link
                will be generated for the handyman.
              </p>
              <div className="max-w-xs">
                <label className="block text-sm text-stone-500 mb-1">
                  Property
                </label>
                <select
                  value={inspectionPropertyId}
                  onChange={(e) => setInspectionPropertyId(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
                >
                  <option value="">Select property</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleCreateInspection}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                Generate Link
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-emerald-700 font-medium">
                Inspection created! Share this link with the handyman:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inspectionLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-stone-200 rounded-lg text-sm bg-stone-50 font-mono text-xs"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(inspectionLink)}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="w-full bg-stone-100 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${(completedCount / items.length) * 100}%` }}
          />
        </div>
      )}

      {/* Items grouped by room */}
      {items.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-stone-400 text-sm">
          No items yet. Add one below.
        </div>
      ) : (
        Array.from(rooms.entries()).map(([room, roomItems]) => (
          <div key={room}>
            <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2 px-1">
              {room}
            </h3>
            <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
              {roomItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <button
                    onClick={() => handleToggle(item.id, !item.isCompleted)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      item.isCompleted
                        ? "bg-green-500 border-green-500 text-white"
                        : "border-stone-300 hover:border-stone-400"
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
                  </button>
                  <span
                    className={`flex-1 text-sm ${
                      item.isCompleted
                        ? "text-stone-400 line-through"
                        : "text-stone-900"
                    }`}
                  >
                    {item.title}
                  </span>
                  {item.description && (
                    <span className="text-xs text-stone-400">
                      {item.description}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add item */}
      <div className="flex gap-2">
        <div className="relative">
          <input
            type="text"
            value={newRoom}
            onChange={(e) => setNewRoom(e.target.value)}
            list="room-list"
            placeholder="Room/Area"
            className="w-40 px-3 py-2.5 border border-stone-200 rounded-lg text-sm"
          />
          <datalist id="room-list">
            {existingRooms.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </div>
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
          placeholder="Add a new item..."
          className="flex-1 px-4 py-2.5 border border-stone-200 rounded-lg text-sm"
        />
        <button
          onClick={handleAddItem}
          disabled={!newItem}
          className="px-4 py-2.5 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}
