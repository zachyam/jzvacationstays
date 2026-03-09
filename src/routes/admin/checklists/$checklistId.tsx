import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import {
  getChecklistById,
  addChecklistItem,
  toggleChecklistItem,
  deleteChecklist,
  deleteChecklistItem,
  updateChecklistItem,
  uploadChecklistItemMedia,
  deleteChecklistItemMedia,
  updateChecklistItemMedia,
} from "../../../server/functions/admin-checklists";
import { uploadFileForAdmin } from "../../../server/functions/file-upload";
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
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editRoom, setEditRoom] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCustomEditRoom, setShowCustomEditRoom] = useState(false);
  const [customEditRoom, setCustomEditRoom] = useState("");
  const [showCustomNewRoom, setShowCustomNewRoom] = useState(false);
  const [customNewRoom, setCustomNewRoom] = useState("");

  if (!checklist) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-400 text-lg">Checklist not found.</p>
        <Link
          to="/admin/checklists"
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

  // Comprehensive room list - common room types + existing rooms
  const commonRooms = [
    "Living Room",
    "Kitchen",
    "Master Bedroom",
    "Bedroom 2",
    "Bedroom 3",
    "Master Bathroom",
    "Guest Bathroom",
    "Bathroom 2",
    "Dining Room",
    "Laundry Room",
    "Garage",
    "Patio/Deck",
    "Pool Area",
    "Entrance/Foyer",
    "Hallway",
    "Closets",
    "Exterior",
    "General"
  ];

  // Combine existing rooms from items with common rooms, remove duplicates
  const existingRooms = [...new Set(items.map((i) => i.room).filter(Boolean))] as string[];
  const allRooms = [...new Set([...commonRooms, ...existingRooms])].sort();

  async function handleAddItem() {
    if (!newItem || !checklist) return;

    // Determine the actual room value
    let roomValue = newRoom;
    if (newRoom === "__CUSTOM__" && customNewRoom.trim()) {
      roomValue = customNewRoom.trim();
    } else if (newRoom === "__CUSTOM__" || !newRoom) {
      roomValue = undefined;
    }

    await addChecklistItem({
      data: {
        checklistId: checklist.id,
        title: newItem,
        room: roomValue,
        description: newDescription || undefined,
        sortOrder: items.length,
      },
    });
    setNewItem("");
    setNewRoom("");
    setNewDescription("");
    setShowAddForm(false);
    setShowCustomNewRoom(false);
    setCustomNewRoom("");
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
    window.location.href = "/admin/checklists";
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

  function startEditing(item: typeof items[0]) {
    setEditingItem(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description || "");

    // Check if the current room is in our predefined list
    const currentRoom = item.room || "";
    if (currentRoom && !allRooms.includes(currentRoom)) {
      // It's a custom room not in our list
      setEditRoom("__CUSTOM__");
      setShowCustomEditRoom(true);
      setCustomEditRoom(currentRoom);
    } else {
      setEditRoom(currentRoom);
      setShowCustomEditRoom(false);
      setCustomEditRoom("");
    }
  }

  function cancelEditing() {
    setEditingItem(null);
    setEditTitle("");
    setEditRoom("");
    setEditDescription("");
    setShowCustomEditRoom(false);
    setCustomEditRoom("");
  }

  async function saveEdit() {
    if (!editingItem) return;

    // Determine the actual room value
    let roomValue = editRoom;
    if (editRoom === "__CUSTOM__" && customEditRoom.trim()) {
      roomValue = customEditRoom.trim();
    } else if (editRoom === "__CUSTOM__" || !editRoom) {
      roomValue = null;
    }

    await updateChecklistItem({
      data: {
        itemId: editingItem,
        title: editTitle,
        room: roomValue,
        description: editDescription || null,
      },
    });
    cancelEditing();
    window.location.reload();
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm("Delete this item?")) return;
    await deleteChecklistItem({ data: { itemId } });
    window.location.reload();
  }

  async function handleFileUpload(itemId: string, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFiles(prev => ({ ...prev, [itemId]: true }));

    try {
      // First upload the file
      const formData = new FormData();
      formData.append("file", file);

      const uploadResult = await fetch("/_server/uploadFileForAdmin", {
        method: "POST",
        body: formData,
      }).then(res => res.json());

      if (!uploadResult.success) {
        throw new Error(uploadResult.message || "Upload failed");
      }

      // Then save to database
      await uploadChecklistItemMedia({
        data: {
          checklistItemId: itemId,
          fileName: uploadResult.fileName,
          originalName: uploadResult.originalName,
          mimeType: uploadResult.mimeType,
          fileSize: uploadResult.fileSize,
          filePath: uploadResult.filePath,
        },
      });

      window.location.reload();
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploadingFiles(prev => ({ ...prev, [itemId]: false }));
      event.target.value = ""; // Reset input
    }
  }

  async function handleDeleteMedia(mediaId: string) {
    if (!confirm("Delete this media file?")) return;
    await deleteChecklistItemMedia({ data: { mediaId } });
    window.location.reload();
  }

  const completedCount = items.filter((i) => i.isCompleted).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/admin/checklists"
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
                <div key={item.id}>
                  {editingItem === item.id ? (
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">Title</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">Room</label>
                          <select
                            value={editRoom}
                            onChange={(e) => {
                              setEditRoom(e.target.value);
                              setShowCustomEditRoom(e.target.value === "__CUSTOM__");
                              if (e.target.value !== "__CUSTOM__") {
                                setCustomEditRoom("");
                              }
                            }}
                            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg bg-white"
                          >
                            <option value="">Select room...</option>
                            {allRooms.map((room) => (
                              <option key={room} value={room}>
                                {room}
                              </option>
                            ))}
                            <option value="__CUSTOM__">+ Add New Room Type</option>
                          </select>
                          {showCustomEditRoom && (
                            <input
                              type="text"
                              value={customEditRoom}
                              onChange={(e) => setCustomEditRoom(e.target.value)}
                              placeholder="Enter new room name..."
                              className="w-full px-3 py-2 text-sm border border-sky-200 rounded-lg mt-1 bg-sky-50 focus:bg-white focus:border-sky-400"
                              autoFocus
                            />
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">Description (optional)</label>
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg"
                        />
                      </div>

                      {/* Media Management in Edit Form */}
                      <div className="border-t pt-3">
                        <label className="block text-xs text-stone-500 mb-2">Attached Media</label>

                        {/* Existing Media */}
                        {item.media?.length > 0 && (
                          <div className="mb-3">
                            <div className="grid grid-cols-3 gap-2">
                              {item.media.map((media: any) => (
                                <div key={media.id} className="relative group">
                                  {media.mimeType.startsWith('image/') ? (
                                    <img
                                      src={media.filePath}
                                      alt={media.originalName}
                                      className="w-full h-16 object-cover rounded border"
                                    />
                                  ) : media.mimeType.startsWith('video/') ? (
                                    <video
                                      src={media.filePath}
                                      className="w-full h-16 object-cover rounded border"
                                      preload="metadata"
                                    />
                                  ) : (
                                    <div className="w-full h-16 bg-stone-100 rounded border flex items-center justify-center">
                                      <iconify-icon icon="solar:document-linear" width="20" height="20" />
                                    </div>
                                  )}
                                  <button
                                    onClick={() => handleDeleteMedia(media.id)}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    title="Delete media"
                                  >
                                    <iconify-icon icon="solar:trash-bin-minimalistic-linear" width="10" height="10" />
                                  </button>
                                  <p className="text-xs text-stone-500 mt-1 truncate text-center" title={media.originalName}>
                                    {media.originalName}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Upload New Media */}
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/*,video/*"
                            onChange={(e) => handleFileUpload(item.id, e)}
                            disabled={uploadingFiles[item.id]}
                            className="text-xs file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:text-xs file:bg-sky-600 file:text-white hover:file:bg-sky-700 file:cursor-pointer"
                          />
                          {uploadingFiles[item.id] && (
                            <span className="text-xs text-stone-500">Uploading...</span>
                          )}
                        </div>
                        <p className="text-xs text-stone-400 mt-1">
                          Images & videos (Max 50MB)
                        </p>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={saveEdit}
                          className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-medium hover:bg-sky-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-3 py-1.5 border border-stone-200 text-stone-600 rounded-lg text-xs hover:bg-stone-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 group">
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
                      <div className="flex-1">
                        <span
                          className={`block text-sm ${
                            item.isCompleted
                              ? "text-stone-400 line-through"
                              : "text-stone-900"
                          }`}
                        >
                          {item.title}
                        </span>
                        {item.description && (
                          <span className="text-xs text-stone-400 mt-0.5">
                            {item.description}
                          </span>
                        )}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button
                          onClick={() => startEditing(item)}
                          className="p-1.5 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-600"
                          title="Edit item"
                        >
                          <iconify-icon icon="solar:pen-linear" width="16" height="16" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 hover:bg-red-50 rounded text-stone-400 hover:text-red-600"
                          title="Delete item"
                        >
                          <iconify-icon icon="solar:trash-bin-trash-linear" width="16" height="16" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Media Preview (when not editing) */}
                  {!editingItem && item.media?.length > 0 && (
                    <div className="px-4 pb-3">
                      <div className="flex flex-wrap gap-1">
                        {item.media.map((media: any, idx: number) => (
                          <div key={media.id} className="relative">
                            {media.mimeType.startsWith('image/') ? (
                              <img
                                src={media.filePath}
                                alt={media.originalName}
                                className="w-12 h-12 object-cover rounded border"
                                title={media.originalName}
                              />
                            ) : media.mimeType.startsWith('video/') ? (
                              <div className="w-12 h-12 bg-stone-100 rounded border flex items-center justify-center" title={media.originalName}>
                                <iconify-icon icon="solar:videocamera-record-linear" width="16" height="16" className="text-stone-400" />
                              </div>
                            ) : (
                              <div className="w-12 h-12 bg-stone-100 rounded border flex items-center justify-center" title={media.originalName}>
                                <iconify-icon icon="solar:document-linear" width="16" height="16" className="text-stone-400" />
                              </div>
                            )}
                            {media.uploaderType === 'handyman' && (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" title="Handyman upload" />
                            )}
                          </div>
                        ))}
                        <span className="text-xs text-stone-400 self-center ml-1">
                          {item.media.length} file{item.media.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add item */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-stone-700">Add New Item</h3>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs font-medium hover:bg-sky-700"
            >
              Add Item
            </button>
          )}
        </div>

        {showAddForm && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Room/Area</label>
                <select
                  value={newRoom}
                  onChange={(e) => {
                    setNewRoom(e.target.value);
                    setShowCustomNewRoom(e.target.value === "__CUSTOM__");
                    if (e.target.value !== "__CUSTOM__") {
                      setCustomNewRoom("");
                    }
                  }}
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm bg-white"
                >
                  <option value="">Select room...</option>
                  {allRooms.map((room) => (
                    <option key={room} value={room}>
                      {room}
                    </option>
                  ))}
                  <option value="__CUSTOM__">+ Add New Room Type</option>
                </select>
                {showCustomNewRoom && (
                  <input
                    type="text"
                    value={customNewRoom}
                    onChange={(e) => setCustomNewRoom(e.target.value)}
                    placeholder="Enter new room name..."
                    className="w-full px-3 py-2 text-sm border border-sky-200 rounded-lg mt-1 bg-sky-50 focus:bg-white focus:border-sky-400"
                    autoFocus
                  />
                )}
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Title *</label>
                <input
                  type="text"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  placeholder="What needs to be done?"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Description</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                  placeholder="Optional details..."
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={handleAddItem}
                  disabled={!newItem}
                  className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
                >
                  Add Item
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewItem("");
                    setNewRoom("");
                    setNewDescription("");
                    setShowCustomNewRoom(false);
                    setCustomNewRoom("");
                  }}
                  className="px-4 py-2 border border-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-50"
                >
                  Cancel
                </button>
              </div>
            </div>

            <p className="text-xs text-stone-400">
              💡 Tip: You can add media (photos/videos) to items after creating them by clicking the edit button.
            </p>
          </div>
        )}

        {!showAddForm && (
          <p className="text-xs text-stone-400">
            Add checklist items with room assignments, descriptions, and media attachments.
          </p>
        )}
      </div>
    </div>
  );
}
