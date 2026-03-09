import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import {
  getChecklists,
  createChecklist,
} from "../../../server/functions/admin-checklists";
import { getProperties } from "../../../server/functions/properties";

export const Route = createFileRoute("/admin/checklists/")({
  loader: async () => {
    try {
      const [checklists, properties] = await Promise.all([
        getChecklists(),
        getProperties(),
      ]);
      return { checklists, properties };
    } catch (error) {
      console.error("Admin checklists loader error:", error);
      // If auth error, let it bubble up to trigger redirect
      if (error instanceof Error &&
          (error.message.includes("Authentication required") ||
           error.message.includes("Admin access required") ||
           error.message.includes("Session expired"))) {
        throw error;
      }
      return { checklists: [], properties: [] };
    }
  },
  component: ChecklistsPage,
});

const TYPES = ["turnover", "maintenance", "inspection"];

function ChecklistsPage() {
  const { checklists, properties } = Route.useLoaderData();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("maintenance");
  const [propertyId, setPropertyId] = useState("");

  async function handleCreate() {
    if (!title) return;
    await createChecklist({
      data: { title, type, propertyId: propertyId || undefined },
    });
    setShowForm(false);
    setTitle("");
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-stone-900">Checklists</h1>
          <p className="text-stone-500 text-sm mt-1">
            Manage turnover, maintenance, and inspection checklists.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700"
        >
          New checklist
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-stone-500 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Checklist title"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-500 mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-stone-500 mb-1">
                Property (optional)
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
              >
                <option value="">All properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!title}
              className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {checklists.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-stone-400">
            No checklists yet. Create one to get started.
          </div>
        ) : (
          checklists.map(({ checklist, propertyName }) => (
            <Link
              key={checklist.id}
              to="/admin/checklists/$checklistId"
              params={{ checklistId: checklist.id }}
              className="block bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-stone-900">
                    {checklist.title}
                  </h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {checklist.type} {propertyName ? `\u2022 ${propertyName}` : ""}
                  </p>
                </div>
                <span className="text-stone-300">&rarr;</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
