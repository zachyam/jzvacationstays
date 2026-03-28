import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useRef } from "react";

import {
  getChecklistById,
  addChecklistItem,
  deleteChecklist,
  deleteChecklistItem,
  updateChecklistItem,
  saveChecklistMedia,
  deleteChecklistMedia,
  updateRoomOrder,
} from "../../../server/functions/admin-checklists";
import { getChecklistUploadUrl } from "../../../server/functions/uploads";
import { createInspection } from "../../../server/functions/inspections";
import { getProperties } from "../../../server/functions/properties";
import { getInspectionUrl } from "../../../lib/inspection-url";

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
  const [addingToRoom, setAddingToRoom] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");

  // State for pending media uploads (not yet saved to DB)
  const [pendingMedia, setPendingMedia] = useState<Record<string, Array<{
    fileName: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    filePath: string;
    tempKey: string;
    tempId: string;
  }>>>({});

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

  // Room ordering: use stored roomOrder, fall back to Map insertion order
  const storedRoomOrder: string[] = (checklist?.roomOrder as string[] | null) || [];
  const roomKeys = Array.from(rooms.keys());
  const initialOrderedRooms = storedRoomOrder.length > 0
    ? [
        ...storedRoomOrder.filter(r => rooms.has(r)),
        ...roomKeys.filter(r => !storedRoomOrder.includes(r)),
      ]
    : roomKeys;
  const [orderedRooms, setOrderedRooms] = useState<string[]>(initialOrderedRooms);

  // Keep orderedRooms in sync if rooms change (e.g. after reload)
  const currentRoomKeysStr = roomKeys.sort().join(",");
  const orderedRoomsKeysStr = [...orderedRooms].sort().join(",");
  if (currentRoomKeysStr !== orderedRoomsKeysStr) {
    const synced = [
      ...orderedRooms.filter(r => rooms.has(r)),
      ...roomKeys.filter(r => !orderedRooms.includes(r)),
    ];
    setOrderedRooms(synced);
  }

  async function moveRoom(room: string, direction: -1 | 1) {
    const current = [...orderedRooms];
    const idx = current.indexOf(room);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= current.length) return;
    [current[idx], current[newIdx]] = [current[newIdx], current[idx]];
    setOrderedRooms(current);
    await updateRoomOrder({ data: { checklistId: checklist!.id, roomOrder: current } });
  }

  // Comprehensive room list
  const commonRooms = [
    "Living Room", "Kitchen", "Master Bedroom", "Master Bathroom", "Blue Bedroom", "Bunk Bedroom 1", "Bunk Bedroom 2", "Bathroom",
    "Laundry Room", "Garage", "Outdoor Patio", "Pool Area", "Game Area", "Outdoor Kitchen", "Basement Living Room", "Basement Bedroom",
    "Basement Bathroom", "Entrance Hallway", "Exterior", "General",
  ];
  const existingRooms = [...new Set(items.map((i) => i.room).filter(Boolean))] as string[];
  const allRooms = [...new Set([...commonRooms, ...existingRooms])].sort();

  async function handleAddItem() {
    if (!newItem || !checklist) return;
    let roomValue: string | undefined = newRoom;
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

  async function handleAddTaskToRoom(room: string) {
    if (!newTaskTitle || !checklist) return;
    await addChecklistItem({
      data: {
        checklistId: checklist.id,
        title: newTaskTitle,
        room: room === "General" ? undefined : room,
        description: newTaskDescription || undefined,
        sortOrder: items.length,
      },
    });
    setNewTaskTitle("");
    setNewTaskDescription("");
    setAddingToRoom(null);
    window.location.reload();
  }


  async function handleDelete() {
    if (!checklist || !confirm("Delete this checklist and all its items?")) return;
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
    const url = getInspectionUrl(result.token);
    setInspectionLink(url);
  }

  function startEditing(item: typeof items[0]) {
    setEditingItem(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description || "");
    const currentRoom = item.room || "";
    if (currentRoom && !allRooms.includes(currentRoom)) {
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
    if (editingItem) {
      setPendingMedia(prev => {
        const newPending = { ...prev };
        delete newPending[editingItem];
        return newPending;
      });
    }
    setEditingItem(null);
    setEditTitle("");
    setEditRoom("");
    setEditDescription("");
    setShowCustomEditRoom(false);
    setCustomEditRoom("");
  }

  async function saveEdit() {
    if (!editingItem) return;
    let roomValue: string | undefined | null = editRoom;
    if (editRoom === "__CUSTOM__" && customEditRoom.trim()) {
      roomValue = customEditRoom.trim();
    } else if (editRoom === "__CUSTOM__" || !editRoom) {
      roomValue = null;
    }
    const pending = pendingMedia[editingItem] || [];
    if (pending.length > 0) {
      for (const media of pending) {
        await saveChecklistMedia({
          data: {
            checklistItemId: editingItem,
            fileName: media.fileName,
            originalName: media.originalName,
            mimeType: media.mimeType,
            fileSize: media.fileSize,
            filePath: media.filePath,
            tempKey: media.tempKey,
          },
        });
      }
    }
    await updateChecklistItem({
      data: {
        itemId: editingItem,
        title: editTitle,
        room: roomValue,
        description: editDescription || null,
      },
    });
    setPendingMedia(prev => {
      const newPending = { ...prev };
      delete newPending[editingItem];
      return newPending;
    });
    cancelEditing();
    window.location.reload();
  }

  async function handleDeleteItem(itemId: string) {
    if (!confirm("Delete this task?")) return;
    setPendingMedia(prev => {
      const newPending = { ...prev };
      delete newPending[itemId];
      return newPending;
    });
    await deleteChecklistItem({ data: { itemId } });
    window.location.reload();
  }

  async function handleFileUpload(itemId: string, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingFiles(prev => ({ ...prev, [itemId]: true }));
    try {
      const item = items.find(i => i.id === itemId);
      const property = properties.find(p => p.id === checklist?.propertyId);
      const { uploadUrl, publicUrl, key } = await getChecklistUploadUrl({
        data: {
          checklistId: checklist?.id || '',
          itemId,
          contentType: file.type,
          fileName: file.name,
          fileSize: file.size,
          propertyName: property?.name,
          roomName: item?.room,
          temporary: true,
        },
      });
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }
      const fileName = publicUrl.split("/").pop() || file.name;
      const newMedia = {
        fileName,
        originalName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        filePath: publicUrl,
        tempKey: key,
        tempId: `temp-${Date.now()}-${Math.random()}`,
      };
      setPendingMedia(prev => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), newMedia],
      }));
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploadingFiles(prev => ({ ...prev, [itemId]: false }));
      event.target.value = "";
    }
  }

  function removePendingMedia(itemId: string, tempId: string) {
    setPendingMedia(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).filter(m => m.tempId !== tempId),
    }));
  }

  async function handleDeleteMedia(mediaId: string) {
    if (!confirm("Delete this media file?")) return;
    await deleteChecklistMedia({ data: { mediaId } });
    window.location.reload();
  }

  const editingItemData = editingItem ? items.find(i => i.id === editingItem) : null;

  return (
    <div className="space-y-6">
      {/* Create Inspection Form */}
      {showInspectionForm && (
        <div className="bg-white border border-stone-200 rounded-[1.5rem] p-6 shadow-sm space-y-4">
          {!inspectionLink ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-stone-900">Create Inspection</h3>
                <button
                  onClick={() => setShowInspectionForm(false)}
                  className="w-8 h-8 rounded-full bg-stone-50 hover:bg-red-50 flex items-center justify-center transition-colors border border-stone-200 hover:border-red-200 text-red-500 hover:text-red-600 text-xl font-bold"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-stone-500">
                Create a new inspection from this checklist. A shareable link will be generated for the handyman.
              </p>
              <div className="max-w-xs">
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                  Property
                </label>
                <select
                  value={inspectionPropertyId}
                  onChange={(e) => setInspectionPropertyId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all text-sm font-medium"
                >
                  <option value="">Select property</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleCreateInspection}
                className="bg-sky-500 text-white font-medium px-6 py-3 rounded-xl shadow-md shadow-sky-500/20 hover:bg-sky-400 hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm"
              >
                Generate Link
              </button>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-emerald-700 font-medium flex items-center gap-2">
                <iconify-icon icon="solar:check-circle-bold" class="text-lg" />
                Inspection created! Share this link with the handyman:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inspectionLink}
                  readOnly
                  className="flex-1 px-4 py-3 border border-stone-200 rounded-xl text-sm bg-stone-50 font-mono text-xs"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(inspectionLink)}
                  className="px-5 py-3 bg-sky-500 text-white rounded-xl text-sm font-medium hover:bg-sky-400 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
        {/* Left Column: Checklist Builder */}
        <div className="flex-1 w-full space-y-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <Link
                to="/admin/checklists"
                className="text-sm text-stone-400 hover:text-stone-600 mb-2 inline-flex items-center gap-1 transition-colors"
              >
                <iconify-icon icon="solar:arrow-left-linear" class="text-sm" />
                Checklists
              </Link>
              <h1 className="text-4xl font-medium tracking-tight text-stone-900 mb-2">
                {checklist.title}
              </h1>
              <p className="text-stone-500 text-lg">
                {checklist.type} &middot; {items.length} items
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setShowInspectionForm(!showInspectionForm)}
                className="flex items-center justify-center gap-2 bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-xl hover:bg-emerald-400 transition-all shadow-sm text-sm"
              >
                <iconify-icon icon="solar:clipboard-check-linear" class="text-lg" />
                Create Inspection
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center justify-center gap-2 bg-white border border-stone-200 text-stone-900 font-medium px-5 py-2.5 rounded-xl hover:bg-stone-50 hover:border-stone-300 transition-all shadow-sm text-sm"
              >
                <iconify-icon icon="solar:add-circle-linear" class="text-lg text-stone-400" />
                Add Task
              </button>
            </div>
          </div>

          {/* Add Task Form (top-level) */}
          {showAddForm && (
            <div className="bg-white border border-stone-200 rounded-[1.5rem] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-stone-900">Add New Task</h3>
                <button
                  onClick={() => { setShowAddForm(false); setNewItem(""); setNewRoom(""); setNewDescription(""); }}
                  className="w-8 h-8 rounded-full bg-stone-50 hover:bg-red-50 flex items-center justify-center transition-colors border border-stone-200 hover:border-red-200 text-red-500 hover:text-red-600 text-xl font-bold"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Task Name</label>
                  <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
                    placeholder="e.g. Check air filters"
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all text-sm font-medium placeholder-stone-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Room / Section</label>
                  <select
                    value={newRoom}
                    onChange={(e) => {
                      setNewRoom(e.target.value);
                      setShowCustomNewRoom(e.target.value === "__CUSTOM__");
                      if (e.target.value !== "__CUSTOM__") setCustomNewRoom("");
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all text-sm font-medium"
                  >
                    <option value="">Select room...</option>
                    {allRooms.map((room) => (
                      <option key={room} value={room}>{room}</option>
                    ))}
                    <option value="__CUSTOM__">+ Add New Room Type</option>
                  </select>
                  {showCustomNewRoom && (
                    <input
                      type="text"
                      value={customNewRoom}
                      onChange={(e) => setCustomNewRoom(e.target.value)}
                      placeholder="Enter new room name..."
                      className="w-full px-4 py-3 rounded-xl border border-sky-200 bg-sky-50 focus:bg-white focus:border-sky-400 outline-none transition-all text-sm font-medium mt-2"
                      autoFocus
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Instructions</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Provide detailed steps for the handyman..."
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all text-sm font-medium placeholder-stone-400 resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => { setShowAddForm(false); setNewItem(""); setNewRoom(""); setNewDescription(""); }}
                  className="text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors px-4 py-2.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={!newItem}
                  className="bg-sky-500 text-white font-medium px-6 py-2.5 rounded-xl shadow-md shadow-sky-500/20 hover:bg-sky-400 hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md"
                >
                  Add Task
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {items.length === 0 && !showAddForm && (
            <div className="bg-white border border-stone-200 rounded-[1.5rem] p-12 text-center shadow-sm">
              <iconify-icon icon="solar:clipboard-list-linear" class="text-5xl text-stone-300 mb-4" />
              <p className="text-stone-500 text-lg mb-4">No tasks yet. Add one to get started.</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-sky-500 text-white font-medium px-6 py-3 rounded-xl shadow-md shadow-sky-500/20 hover:bg-sky-400 transition-all text-sm"
              >
                Add First Task
              </button>
            </div>
          )}

          {/* Room Sections */}
          {orderedRooms.map((room, roomIdx) => {
            const roomItems = rooms.get(room)!;
            return (
            <section key={room} className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-medium tracking-tight text-stone-900 flex items-center gap-3">
                  {room}
                  <span className="text-xs font-medium bg-stone-200 text-stone-600 px-2.5 py-1 rounded-full">
                    {roomItems.length} Task{roomItems.length !== 1 ? "s" : ""}
                  </span>
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveRoom(room, -1)}
                    disabled={roomIdx === 0}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 disabled:opacity-30 transition-colors"
                    title="Move room up"
                  >
                    <iconify-icon icon="solar:arrow-up-linear" />
                  </button>
                  <button
                    onClick={() => moveRoom(room, 1)}
                    disabled={roomIdx === orderedRooms.length - 1}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 disabled:opacity-30 transition-colors"
                    title="Move room down"
                  >
                    <iconify-icon icon="solar:arrow-down-linear" />
                  </button>
                </div>
              </div>

              <div className="bg-white border border-stone-200 rounded-[1.5rem] shadow-sm overflow-hidden flex flex-col">
                {roomItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`group flex items-start gap-4 p-5 transition-colors cursor-pointer ${
                      idx < roomItems.length - 1 ? "border-b border-stone-100" : ""
                    } ${
                      editingItem === item.id
                        ? "bg-sky-50/30 relative"
                        : "hover:bg-stone-50"
                    }`}
                    onClick={() => {
                      if (editingItem !== item.id) startEditing(item);
                    }}
                  >
                    {editingItem === item.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500 rounded-r-full" />
                    )}

                    {/* Drag handle */}
                    <button
                      className="mt-1 text-stone-300 cursor-grab active:cursor-grabbing hover:text-stone-500 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <iconify-icon icon="solar:menu-dots-bold" class="text-xl" />
                    </button>


                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-medium text-base mb-1 text-stone-900">
                            {item.title}
                          </h3>
                          {item.description && (
                            <p className="text-sm text-stone-500 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>
                        {/* Action buttons */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(item.id);
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <iconify-icon icon="solar:trash-bin-trash-linear" />
                          </button>
                        </div>
                      </div>

                      {/* Media indicators and thumbnails */}
                      {(item.media?.length > 0 || pendingMedia[item.id]?.length > 0) && (
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {item.media?.map((media: any) => (
                            <div key={media.id} className="relative w-14 h-14 rounded-lg border border-stone-200 overflow-hidden group/img">
                              {media.mimeType.startsWith('image/') ? (
                                <img
                                  src={media.filePath}
                                  alt={media.originalName}
                                  className="w-full h-full object-cover transition-transform group-hover/img:scale-110"
                                />
                              ) : (
                                <div className="w-full h-full bg-stone-100 flex items-center justify-center">
                                  <iconify-icon icon="solar:videocamera-record-linear" class="text-stone-400" />
                                </div>
                              )}
                            </div>
                          ))}
                          {pendingMedia[item.id]?.map((media) => (
                            <div key={media.tempId} className="relative w-14 h-14 rounded-lg border-2 border-orange-400 overflow-hidden">
                              {media.mimeType.startsWith('image/') ? (
                                <img src={media.filePath} alt={media.originalName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-orange-50 flex items-center justify-center">
                                  <iconify-icon icon="solar:videocamera-record-linear" class="text-orange-600" />
                                </div>
                              )}
                              <span className="absolute bottom-0 right-0 text-[8px] bg-orange-400 text-white px-1 rounded-tl">NEW</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add Task Row */}
                <button
                  onClick={() => {
                    setAddingToRoom(addingToRoom === room ? null : room);
                    setNewTaskTitle("");
                    setNewTaskDescription("");
                  }}
                  className="w-full flex items-center gap-3 p-5 text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors text-left group"
                >
                  <div className="w-5 h-5 flex items-center justify-center ml-8 text-stone-400 group-hover:text-stone-900 transition-colors">
                    <iconify-icon icon="solar:add-circle-linear" class="text-xl" />
                  </div>
                  <span className="font-medium text-base">Add new task</span>
                </button>

                {/* Inline add form */}
                {addingToRoom === room && (
                  <div className="p-5 border-t border-stone-100 bg-stone-50/50 space-y-3">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTaskToRoom(room)}
                      placeholder="Task name..."
                      autoFocus
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all text-sm font-medium placeholder-stone-400"
                    />
                    <textarea
                      rows={2}
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder="Instructions (optional)..."
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all text-sm font-medium placeholder-stone-400 resize-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => { setAddingToRoom(null); setNewTaskTitle(""); setNewTaskDescription(""); }}
                        className="text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors px-3 py-2"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleAddTaskToRoom(room)}
                        disabled={!newTaskTitle}
                        className="bg-sky-500 text-white font-medium px-5 py-2 rounded-xl shadow-sm hover:bg-sky-400 transition-all text-sm disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
            );
          })}
        </div>

        {/* Right Column: Task Editor Card */}
        {editingItemData && (
          <div className="w-full lg:w-[26rem] shrink-0 lg:sticky lg:top-24 z-10">
            <div className="bg-white border border-stone-200 rounded-[1.5rem] p-7 shadow-xl shadow-stone-200/50 flex flex-col h-auto max-h-[calc(100vh-8rem)] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-xl font-medium tracking-tight text-stone-900">Edit Task</h4>
                <button
                  onClick={cancelEditing}
                  className="w-8 h-8 rounded-full bg-stone-50 hover:bg-red-50 flex items-center justify-center transition-colors border border-stone-200 hover:border-red-200 text-red-500 hover:text-red-600 text-xl font-bold"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6 flex-1">
                {/* Room Selection */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                    Room / Section
                  </label>
                  <select
                    value={editRoom}
                    onChange={(e) => {
                      setEditRoom(e.target.value);
                      setShowCustomEditRoom(e.target.value === "__CUSTOM__");
                      if (e.target.value !== "__CUSTOM__") setCustomEditRoom("");
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all text-sm text-stone-900 font-medium"
                  >
                    <option value="">Select room...</option>
                    {allRooms.map((room) => (
                      <option key={room} value={room}>{room}</option>
                    ))}
                    <option value="__CUSTOM__">+ Add New Room Type</option>
                  </select>
                  {showCustomEditRoom && (
                    <input
                      type="text"
                      value={customEditRoom}
                      onChange={(e) => setCustomEditRoom(e.target.value)}
                      placeholder="Enter new room name..."
                      className="w-full px-4 py-3 rounded-xl border border-sky-200 bg-sky-50 focus:bg-white focus:border-sky-400 outline-none transition-all text-sm font-medium mt-2"
                      autoFocus
                    />
                  )}
                </div>

                {/* Task Name */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                    Task Name
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all text-sm text-stone-900 font-medium placeholder-stone-400"
                    placeholder="e.g. Check air filters"
                  />
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                    Instructions
                  </label>
                  <textarea
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 outline-none transition-all text-sm text-stone-900 font-medium placeholder-stone-400 resize-none"
                    placeholder="Provide detailed steps for the handyman..."
                  />
                </div>

                {/* Reference Media */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                    <span className="flex justify-between items-center">
                      <span>Reference Media</span>
                      <span className="text-stone-400 normal-case tracking-normal">Optional</span>
                    </span>
                  </label>

                  {/* Existing and pending media */}
                  {(editingItemData.media?.length > 0 || pendingMedia[editingItem!]?.length > 0) && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {editingItemData.media?.map((media: any) => (
                        <div key={media.id} className="relative group">
                          {media.mimeType.startsWith('image/') ? (
                            <img src={media.filePath} alt={media.originalName} className="w-full h-20 object-cover rounded-lg border border-stone-200" />
                          ) : (
                            <div className="w-full h-20 bg-stone-100 rounded-lg border border-stone-200 flex items-center justify-center">
                              <iconify-icon icon="solar:videocamera-record-linear" class="text-stone-400 text-xl" />
                            </div>
                          )}
                          <button
                            onClick={() => handleDeleteMedia(media.id)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <iconify-icon icon="solar:close-circle-bold" class="text-xs" />
                          </button>
                        </div>
                      ))}
                      {pendingMedia[editingItem!]?.map((media) => (
                        <div key={media.tempId} className="relative group">
                          {media.mimeType.startsWith('image/') ? (
                            <img src={media.filePath} alt={media.originalName} className="w-full h-20 object-cover rounded-lg border-2 border-orange-400" />
                          ) : (
                            <div className="w-full h-20 bg-orange-50 rounded-lg border-2 border-orange-400 flex items-center justify-center">
                              <iconify-icon icon="solar:videocamera-record-linear" class="text-orange-600 text-xl" />
                            </div>
                          )}
                          <button
                            onClick={() => removePendingMedia(editingItem!, media.tempId)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <iconify-icon icon="solar:close-circle-bold" class="text-xs" />
                          </button>
                          <span className="absolute bottom-1 right-1 text-[8px] bg-orange-400 text-white px-1.5 py-0.5 rounded font-medium">NEW</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Area */}
                  <label className="border-2 border-dashed border-stone-200 rounded-[1rem] p-6 flex flex-col items-center justify-center text-center hover:bg-stone-50 hover:border-stone-300 transition-colors cursor-pointer group block">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => handleFileUpload(editingItem!, e)}
                      disabled={uploadingFiles[editingItem!]}
                      className="hidden"
                    />
                    <div className="w-10 h-10 bg-white border border-stone-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 group-hover:shadow-sm transition-all">
                      {uploadingFiles[editingItem!] ? (
                        <iconify-icon icon="solar:refresh-linear" class="text-stone-500 text-xl animate-spin" />
                      ) : (
                        <iconify-icon icon="solar:gallery-add-linear" class="text-stone-500 text-xl" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-stone-900 block mb-1">
                      {uploadingFiles[editingItem!] ? "Uploading..." : "Click to upload media"}
                    </span>
                    <span className="text-xs text-stone-500">Add photos to help locate items</span>
                  </label>
                </div>

                {/* Divider */}
                <div className="h-px w-full bg-stone-200" />

                {/* Actions */}
                <div className="flex items-center justify-between gap-4 pt-2">
                  <button
                    onClick={() => handleDeleteItem(editingItem!)}
                    className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors px-2"
                  >
                    Delete Task
                  </button>
                  <button
                    onClick={saveEdit}
                    className="bg-sky-500 text-white font-medium px-6 py-3 rounded-xl shadow-md shadow-sky-500/20 hover:bg-sky-400 hover:shadow-lg hover:-translate-y-0.5 transition-all focus:ring-4 focus:ring-sky-500/20 focus:outline-none text-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete checklist button (when no item selected) */}
        {!editingItemData && items.length > 0 && (
          <div className="w-full lg:w-[26rem] shrink-0 lg:sticky lg:top-24">
            <div className="bg-white border border-stone-200 rounded-[1.5rem] p-7 shadow-sm">
              <h4 className="text-lg font-medium tracking-tight text-stone-900 mb-3">Checklist Info</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Type</span>
                  <span className="font-medium text-stone-900 capitalize">{checklist.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Tasks</span>
                  <span className="font-medium text-stone-900">{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Rooms</span>
                  <span className="font-medium text-stone-900">{rooms.size}</span>
                </div>
              </div>
              <div className="border-t border-stone-200 mt-6 pt-4">
                <button
                  onClick={handleDelete}
                  className="text-sm font-medium text-red-500 hover:text-red-600 transition-colors"
                >
                  Delete Checklist
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
