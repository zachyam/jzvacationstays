import { useState, useRef } from "react";
import { InspectionImage } from "../inspection-image";
import {
  uploadPropertyMedia,
  deletePropertyMedia,
  updateMediaOrder,
  getRoomTypes,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  uploadRoomMedia,
  deleteRoomMedia,
} from "../../server/functions/property-media";

interface MediaItem {
  id: string;
  url: string;
  caption?: string | null;
  category: string;
  sortOrder: number;
}

interface RoomType {
  id: string;
  name: string;
  description?: string | null;
  beds?: string | null;
  media: MediaItem[];
}

interface PropertyMediaManagerProps {
  propertyId: string;
  media: MediaItem[];
  rooms: RoomType[];
  onUpdate: () => void;
}

export function PropertyMediaManager({
  propertyId,
  media,
  rooms: initialRooms,
  onUpdate,
}: PropertyMediaManagerProps) {
  const [activeTab, setActiveTab] = useState<"gallery" | "rooms">("gallery");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
  } | null>(null);
  const [uploadingRoomId, setUploadingRoomId] = useState<string | null>(null);
  const [roomUploadProgress, setRoomUploadProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
    roomId: string;
  } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("gallery");
  const [rooms, setRooms] = useState(initialRooms);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roomFileInputRef = useRef<HTMLInputElement>(null);

  // Filter media by category
  const filteredMedia = media.filter(m => m.category === selectedCategory);

  const handleUploadPropertyMedia = async (files: FileList) => {
    const filesArray = Array.from(files);
    setUploading(true);
    setUploadProgress({ current: 0, total: filesArray.length, fileName: '' });

    try {
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        setUploadProgress({
          current: i + 1,
          total: filesArray.length,
          fileName: file.name
        });

        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await uploadPropertyMedia({
          data: {
            propertyId,
            file: fileData,
            contentType: file.type,
            fileName: file.name,
            fileSize: file.size,
            category: selectedCategory as any,
          },
        });
      }
      onUpdate();
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm("Delete this image?")) return;

    try {
      await deletePropertyMedia({ data: { mediaId } });
      onUpdate();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete image.");
    }
  };

  const handleUploadRoomMedia = async (roomId: string, files: FileList) => {
    const filesArray = Array.from(files);
    setUploadingRoomId(roomId);
    setRoomUploadProgress({ current: 0, total: filesArray.length, fileName: '', roomId });

    try {
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        setRoomUploadProgress({
          current: i + 1,
          total: filesArray.length,
          fileName: file.name,
          roomId
        });

        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await uploadRoomMedia({
          data: {
            roomTypeId: roomId,
            file: fileData,
            contentType: file.type,
            fileName: file.name,
            fileSize: file.size,
          },
        });
      }

      // Refresh room data
      const { rooms: updatedRooms } = await getRoomTypes({ data: { propertyId } });
      setRooms(updatedRooms);
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to upload room image.");
    } finally {
      setUploadingRoomId(null);
      setRoomUploadProgress(null);
    }
  };

  const handleAddRoom = async (roomData: any) => {
    try {
      await createRoomType({
        data: {
          propertyId,
          ...roomData,
        },
      });

      const { rooms: updatedRooms } = await getRoomTypes({ data: { propertyId } });
      setRooms(updatedRooms);
      setShowAddRoom(false);
    } catch (error) {
      console.error("Failed to add room:", error);
      alert("Failed to add room.");
    }
  };

  const handleUpdateRoom = async (roomId: string, roomData: any) => {
    try {
      await updateRoomType({
        data: {
          roomId,
          ...roomData,
        },
      });

      const { rooms: updatedRooms } = await getRoomTypes({ data: { propertyId } });
      setRooms(updatedRooms);
      setEditingRoom(null);
    } catch (error) {
      console.error("Failed to update room:", error);
      alert("Failed to update room.");
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm("Delete this room type and all its images?")) return;

    try {
      await deleteRoomType({ data: { roomId } });
      const { rooms: updatedRooms } = await getRoomTypes({ data: { propertyId } });
      setRooms(updatedRooms);
    } catch (error) {
      console.error("Failed to delete room:", error);
      alert("Failed to delete room.");
    }
  };

  const handleDeleteRoomMedia = async (mediaId: string) => {
    if (!confirm("Delete this image?")) return;

    try {
      await deleteRoomMedia({ data: { mediaId } });
      const { rooms: updatedRooms } = await getRoomTypes({ data: { propertyId } });
      setRooms(updatedRooms);
    } catch (error) {
      console.error("Failed to delete image:", error);
      alert("Failed to delete image.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-stone-200">
        <button
          onClick={() => setActiveTab("gallery")}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "gallery"
              ? "text-sky-600 border-sky-600"
              : "text-stone-500 border-transparent hover:text-stone-700"
          }`}
        >
          Property Gallery
        </button>
        <button
          onClick={() => setActiveTab("rooms")}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "rooms"
              ? "text-sky-600 border-sky-600"
              : "text-stone-500 border-transparent hover:text-stone-700"
          }`}
        >
          Room Types
        </button>
      </div>

      {activeTab === "gallery" && (
        <div className="space-y-6">
          {/* Category Selector */}
          <div className="flex gap-2">
            {["hero", "gallery", "exterior", "amenity"].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? "bg-sky-100 text-sky-700"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>

          {/* Upload Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  handleUploadPropertyMedia(e.target.files);
                  e.target.value = "";
                }
              }}
            />
            <div className="space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <iconify-icon icon="solar:refresh-linear" class="text-lg animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <iconify-icon icon="solar:camera-add-linear" class="text-lg" />
                    Add {selectedCategory} Images
                  </>
                )}
              </button>

              {uploadProgress && (
                <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-sky-700 font-medium">
                      Uploading {uploadProgress.current} of {uploadProgress.total}
                    </span>
                    <span className="text-sky-600">
                      {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-sky-200 rounded-full h-2">
                    <div
                      className="bg-sky-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-sky-600 truncate">{uploadProgress.fileName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMedia.map((item) => (
              <div key={item.id} className="relative group">
                <InspectionImage
                  src={item.url}
                  alt={item.caption || "Property image"}
                  className="w-full h-40 object-cover rounded-lg border border-stone-200"
                />
                <button
                  onClick={() => handleDeleteMedia(item.id)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <iconify-icon icon="solar:trash-bin-2-linear" class="text-base" />
                </button>
                {item.caption && (
                  <p className="absolute bottom-2 left-2 right-2 text-xs text-white bg-black/50 px-2 py-1 rounded">
                    {item.caption}
                  </p>
                )}
              </div>
            ))}
            {filteredMedia.length === 0 && (
              <div className="col-span-3 py-12 text-center text-stone-400">
                <iconify-icon icon="solar:gallery-minimalistic-linear" class="text-4xl mb-2" />
                <p className="text-sm">No {selectedCategory} images yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "rooms" && (
        <div className="space-y-6">
          {/* Add Room Button */}
          <div>
            <button
              onClick={() => setShowAddRoom(true)}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors"
            >
              <iconify-icon icon="solar:add-circle-linear" class="text-lg" />
              Add Room Type
            </button>
          </div>

          {/* Add Room Form */}
          {showAddRoom && (
            <RoomForm
              onSubmit={handleAddRoom}
              onCancel={() => setShowAddRoom(false)}
            />
          )}

          {/* Rooms List */}
          <div className="space-y-6">
            {rooms.map((room) => (
              <div key={room.id} className="bg-white border border-stone-200 rounded-xl p-6">
                {editingRoom === room.id ? (
                  <RoomForm
                    room={room}
                    onSubmit={(data) => handleUpdateRoom(room.id, data)}
                    onCancel={() => setEditingRoom(null)}
                  />
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-stone-900">{room.name}</h3>
                        {room.description && (
                          <p className="text-sm text-stone-500 mt-1">{room.description}</p>
                        )}
                        <div className="flex gap-4 mt-2 text-sm text-stone-600">
                          {room.beds && (
                            <span className="flex items-center gap-1">
                              <iconify-icon icon="solar:bed-linear" class="text-base" />
                              {room.beds}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingRoom(room.id)}
                          className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                        >
                          <iconify-icon icon="solar:pen-linear" class="text-lg" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <iconify-icon icon="solar:trash-bin-2-linear" class="text-lg" />
                        </button>
                      </div>
                    </div>

                    {/* Room Images */}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        disabled={uploadingRoomId === room.id}
                        className="hidden"
                        id={`room-upload-${room.id}`}
                        onChange={(e) => {
                          if (e.target.files?.length && uploadingRoomId !== room.id) {
                            handleUploadRoomMedia(room.id, e.target.files);
                            e.target.value = "";
                          }
                        }}
                      />
                      <div className="space-y-3 mb-3">
                        <label
                          htmlFor={`room-upload-${room.id}`}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                            uploadingRoomId === room.id
                              ? "bg-stone-200 text-stone-500 cursor-not-allowed"
                              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                          }`}
                        >
                          {uploadingRoomId === room.id ? (
                            <>
                              <iconify-icon icon="solar:refresh-linear" class="text-base animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <iconify-icon icon="solar:camera-add-linear" class="text-base" />
                              Add Photos
                            </>
                          )}
                        </label>

                        {roomUploadProgress && roomUploadProgress.roomId === room.id && (
                          <div className="bg-stone-50 border border-stone-200 rounded-lg p-2 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-stone-700 font-medium">
                                Uploading {roomUploadProgress.current} of {roomUploadProgress.total}
                              </span>
                              <span className="text-stone-600">
                                {Math.round((roomUploadProgress.current / roomUploadProgress.total) * 100)}%
                              </span>
                            </div>
                            <div className="w-full bg-stone-200 rounded-full h-1.5">
                              <div
                                className="bg-stone-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${(roomUploadProgress.current / roomUploadProgress.total) * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-stone-600 truncate">{roomUploadProgress.fileName}</p>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {room.media.map((item) => (
                          <div key={item.id} className="relative group">
                            <InspectionImage
                              src={item.url}
                              alt={item.caption || "Room image"}
                              className="w-full h-24 object-cover rounded-lg border border-stone-200"
                            />
                            <button
                              onClick={() => handleDeleteRoomMedia(item.id)}
                              className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <iconify-icon icon="solar:close-circle-bold" class="text-xs" />
                            </button>
                          </div>
                        ))}
                        {room.media.length === 0 && (
                          <div className="col-span-4 py-8 text-center text-stone-400 border-2 border-dashed border-stone-200 rounded-lg">
                            <iconify-icon icon="solar:gallery-minimalistic-linear" class="text-2xl mb-1" />
                            <p className="text-xs">No photos yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
            {rooms.length === 0 && (
              <div className="py-12 text-center text-stone-400">
                <iconify-icon icon="solar:home-smile-linear" class="text-4xl mb-2" />
                <p className="text-sm">No room types added yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Room Form Component
function RoomForm({
  room,
  onSubmit,
  onCancel,
}: {
  room?: RoomType;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: room?.name || "",
    description: room?.description || "",
    beds: room?.beds || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-stone-50 rounded-lg p-4 space-y-4">
      <div>
        <label className="block text-sm font-medium text-stone-600 mb-1">
          Room Name *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-sky-500"
          placeholder="e.g., Master Bedroom, Guest Room"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-600 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-sky-500"
          placeholder="Brief description of the room"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-600 mb-1">
          Beds
        </label>
        <input
          type="text"
          value={formData.beds}
          onChange={(e) => setFormData({ ...formData, beds: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-sky-500"
          placeholder="e.g., 1 King bed, 2 Twin beds"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-stone-600 hover:text-stone-900 text-sm font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors"
        >
          {room ? "Update Room" : "Add Room"}
        </button>
      </div>
    </form>
  );
}