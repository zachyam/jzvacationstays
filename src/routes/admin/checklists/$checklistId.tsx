import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import {
  getChecklistById,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklist,
} from "../../../server/functions/admin-checklists";

export const Route = createFileRoute("/admin/checklists/$checklistId")({
  loader: async ({ params }) => {
    try {
      return await getChecklistById({ data: { checklistId: params.checklistId } });
    } catch {
      return { checklist: null, items: [] };
    }
  },
  component: ChecklistDetailPage,
});

function ChecklistDetailPage() {
  const { checklist, items } = Route.useLoaderData();
  const [newItem, setNewItem] = useState("");

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

  async function handleAddItem() {
    if (!newItem || !checklist) return;
    await addChecklistItem({
      data: {
        checklistId: checklist.id,
        title: newItem,
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
    if (!checklist || !confirm("Delete this checklist and all its items?")) return;
    await deleteChecklist({ data: { checklistId: checklist.id } });
    window.location.href = "/checklists";
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
        <button
          onClick={handleDelete}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200"
        >
          Delete
        </button>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="w-full bg-stone-100 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${(completedCount / items.length) * 100}%` }}
          />
        </div>
      )}

      {/* Items */}
      <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
        {items.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-sm">
            No items yet. Add one below.
          </div>
        ) : (
          items.map((item) => (
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
            </div>
          ))
        )}
      </div>

      {/* Add item */}
      <div className="flex gap-2">
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
