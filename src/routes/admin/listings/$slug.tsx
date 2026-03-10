import { createFileRoute, useNavigate, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";

import {
  getAdminPropertyBySlug,
  updateProperty,
  deleteProperty,
  addPropertyPhoto,
  deletePropertyPhoto,
  reorderPropertyPhotos,
} from "../../../server/functions/admin-properties";
import { PhotoManager } from "../../../components/admin/photo-manager";
import { cn } from "../../../lib/utils";

export const Route = createFileRoute("/admin/listings/$slug")({
  loader: async ({ params }) => {
    try {
      return await getAdminPropertyBySlug({ data: { slug: params.slug } });
    } catch {
      return { property: null, photos: [] };
    }
  },
  component: EditListingPage,
});

const SECTIONS = [
  { id: "basic", label: "Basic Information", icon: "solar:info-circle-linear" },
  { id: "pricing", label: "Pricing", icon: "solar:dollar-minimalistic-linear" },
  { id: "features", label: "Unit Features", icon: "solar:home-smile-linear" },
  { id: "amenities", label: "Amenities", icon: "solar:stars-line-linear" },
  { id: "media", label: "Media", icon: "solar:gallery-linear" },
  { id: "rules", label: "House Rules", icon: "solar:document-text-linear" },
  { id: "location", label: "Location", icon: "solar:map-point-linear" },
];

const AMENITY_OPTIONS = [
  "Ocean view", "Pool", "Hot tub", "Wi-Fi", "Air conditioning", "Heating",
  "Kitchen", "Washer", "Dryer", "Free parking", "EV charger", "Gym",
  "BBQ grill", "Fire pit", "Outdoor dining", "Beach access", "Kayaks",
  "Bikes", "Board games", "Streaming services", "Workspace", "Pet friendly",
  "Baby gear", "Security cameras",
];

function EditListingPage() {
  const { property, photos } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [activeSection, setActiveSection] = useState("basic");

  // Form state
  const [formData, setFormData] = useState({
    slug: property?.slug || "",
    name: property?.name || "",
    tagline: property?.tagline || "",
    description: property?.description || "",
    maxGuests: property?.maxGuests || 1,
    bedrooms: property?.bedrooms || 1,
    bathrooms: property?.bathrooms || "1",
    beds: (property?.beds as string[]) || [],
    cleaningFee: property?.cleaningFee ? property.cleaningFee / 100 : 0,
    nightlyRate: property?.nightlyRate ? property.nightlyRate / 100 : 0,
    petFee: property?.petFee ? property.petFee / 100 : 0,
    maxPets: property?.maxPets || 0,
    minStay: property?.minStay || 1,
    checkInTime: property?.checkInTime || "16:00",
    checkOutTime: property?.checkOutTime || "11:00",
    houseRules: property?.houseRules || "",
    address: property?.address || "",
    latitude: property?.latitude || "",
    longitude: property?.longitude || "",
    amenities: (property?.amenities as string[]) || [],
    highlight: property?.highlight || "",
    isActive: property?.isActive ?? true,
  });

  if (!property) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-medium text-stone-900 mb-2">
          Listing not found
        </h2>
        <button
          onClick={() => navigate({ to: "/admin/listings" })}
          className="text-sky-600 hover:text-sky-700 font-medium text-sm"
        >
          Back to listings
        </button>
      </div>
    );
  }

  async function handleSubmit() {
    setSaving(true);
    setError("");
    try {
      const updates = {
        ...formData,
        cleaningFee: Math.round(formData.cleaningFee * 100),
        nightlyRate: Math.round(formData.nightlyRate * 100),
        petFee: Math.round(formData.petFee * 100),
      };

      const result = await updateProperty({
        data: { slug: property.slug, updates },
      });

      if (result.success && result.property) {
        if (result.property.slug !== property.slug) {
          navigate({
            to: "/admin/listings/$slug",
            params: { slug: result.property.slug },
          });
        } else {
          router.invalidate();
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update listing");
    }
    setSaving(false);
  }

  async function handleDelete() {
    try {
      await deleteProperty({ data: { slug: property.slug } });
      navigate({ to: "/admin/listings" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete listing");
    }
  }

  async function handleAddPhoto(url: string, alt: string) {
    try {
      await addPropertyPhoto({
        data: {
          propertyId: property.id,
          url,
          alt,
          sortOrder: photos.length,
        },
      });
      router.invalidate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add photo");
    }
  }

  async function handleDeletePhoto(photoId: string) {
    try {
      await deletePropertyPhoto({ data: { photoId } });
      router.invalidate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete photo");
    }
  }

  async function handleReorderPhotos(
    reordered: { id: string; sortOrder: number; isCover: boolean }[],
  ) {
    try {
      await reorderPropertyPhotos({ data: { photos: reordered } });
      router.invalidate();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reorder photos");
    }
  }

  const coverPhoto = photos.find(p => p.isCover) || photos[0];

  return (
    <>
      {/* Top Navigation */}
      <div className="border-b border-stone-200 bg-white -mx-8 -mt-8 mb-8 sticky top-0 z-10">
        <div className="px-8">
          {/* Breadcrumbs */}
          <div className="h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Link
                to="/admin/listings"
                className="text-stone-500 hover:text-stone-900 transition-colors"
              >
                Listings
              </Link>
              <span className="text-stone-300">/</span>
              <span className="text-stone-900">Edit Listing</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(true)}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
              >
                Delete
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-8 overflow-x-auto no-scrollbar">
            <button className="pb-3 border-b-2 border-sky-600 text-sky-600 text-sm font-medium pt-3">
              Listing Details
            </button>
            <button className="pb-3 border-b-2 border-transparent text-stone-500 hover:text-stone-900 text-sm font-medium pt-3 transition-colors">
              Availability
            </button>
            <button className="pb-3 border-b-2 border-transparent text-stone-500 hover:text-stone-900 text-sm font-medium pt-3 transition-colors">
              Bookings
            </button>
            <button className="pb-3 border-b-2 border-transparent text-stone-500 hover:text-stone-900 text-sm font-medium pt-3 transition-colors">
              Analytics
            </button>
          </nav>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Main Content Layout */}
      <div className="flex gap-12">
        {/* Left Sidebar: Section Navigation */}
        <aside className="w-48 shrink-0">
          <h3 className="text-xs font-medium text-stone-400 mb-4 uppercase tracking-wide">
            Listing Details
          </h3>
          <ul className="space-y-1">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <button
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    activeSection === section.id
                      ? "bg-sky-50 text-sky-700"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-50"
                  )}
                >
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full border-[1.5px] flex items-center justify-center shrink-0",
                    activeSection === section.id
                      ? "border-sky-600"
                      : "border-stone-300"
                  )}>
                    {activeSection === section.id && (
                      <div className="w-1.5 h-1.5 bg-sky-600 rounded-full" />
                    )}
                  </div>
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Middle Content: Form */}
        <div className="flex-1 max-w-2xl">
          {activeSection === "basic" && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-2xl font-medium text-stone-900 mb-1">
                  Basic Information
                </h1>
                <p className="text-sm text-stone-500">
                  Essential details about your property
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-stone-600">
                  Property Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-stone-600">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-stone-600">
                  Tagline
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="e.g., Oceanfront Paradise"
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-stone-600">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-600">
                    Bedrooms
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 0 })}
                      className="w-full pl-4 pr-20 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                      Bedrooms
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-600">
                    Bathrooms
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.bathrooms}
                      onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                      className="w-full pl-4 pr-20 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                      Bathrooms
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-stone-600">
                  Maximum Guests
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.maxGuests}
                    onChange={(e) => setFormData({ ...formData, maxGuests: parseInt(e.target.value) || 0 })}
                    className="w-full pl-4 pr-16 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                    Max
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-stone-600">
                  Property Status
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.isActive}
                      onChange={() => setFormData({ ...formData, isActive: true })}
                      className="w-4 h-4 text-sky-600"
                    />
                    <span className="text-sm text-stone-700">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!formData.isActive}
                      onChange={() => setFormData({ ...formData, isActive: false })}
                      className="w-4 h-4 text-sky-600"
                    />
                    <span className="text-sm text-stone-700">Inactive</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeSection === "pricing" && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-2xl font-medium text-stone-900 mb-1">Pricing</h1>
                <p className="text-sm text-stone-500">Set your rates and fees</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-600">
                    Nightly Rate
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
                    <input
                      type="number"
                      value={formData.nightlyRate}
                      onChange={(e) => setFormData({ ...formData, nightlyRate: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-600">
                    Cleaning Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
                    <input
                      type="number"
                      value={formData.cleaningFee}
                      onChange={(e) => setFormData({ ...formData, cleaningFee: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-600">
                    Pet Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
                    <input
                      type="number"
                      value={formData.petFee}
                      onChange={(e) => setFormData({ ...formData, petFee: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-8 pr-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-600">
                    Max Pets
                  </label>
                  <input
                    type="number"
                    value={formData.maxPets}
                    onChange={(e) => setFormData({ ...formData, maxPets: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-600">
                    Minimum Stay (nights)
                  </label>
                  <input
                    type="number"
                    value={formData.minStay}
                    onChange={(e) => setFormData({ ...formData, minStay: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === "features" && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-2xl font-medium text-stone-900 mb-1">
                  Unit Features
                </h1>
                <p className="text-sm text-stone-500">
                  Check-in times and special highlights
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-600">
                    Check-in Time
                  </label>
                  <input
                    type="time"
                    value={formData.checkInTime}
                    onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-600">
                    Check-out Time
                  </label>
                  <input
                    type="time"
                    value={formData.checkOutTime}
                    onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-stone-600">
                  Property Highlight
                </label>
                <input
                  type="text"
                  value={formData.highlight}
                  onChange={(e) => setFormData({ ...formData, highlight: e.target.value })}
                  placeholder="e.g., Steps from the beach"
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-stone-600 mb-3">
                  Beds Configuration
                </label>
                <div className="space-y-2">
                  {formData.beds.map((bed, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={bed}
                        onChange={(e) => {
                          const newBeds = [...formData.beds];
                          newBeds[index] = e.target.value;
                          setFormData({ ...formData, beds: newBeds });
                        }}
                        className="flex-1 px-4 py-2 bg-white border border-stone-200 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => {
                          const newBeds = formData.beds.filter((_, i) => i !== index);
                          setFormData({ ...formData, beds: newBeds });
                        }}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <iconify-icon icon="solar:trash-bin-trash-linear" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setFormData({ ...formData, beds: [...formData.beds, ""] })}
                    className="px-4 py-2 border border-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-50 transition-colors"
                  >
                    Add Bed
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "amenities" && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-2xl font-medium text-stone-900 mb-1">
                  Amenities
                </h1>
                <p className="text-sm text-stone-500">
                  Select all amenities available at your property
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {AMENITY_OPTIONS.map((amenity) => (
                  <label
                    key={amenity}
                    className="flex items-center gap-3 p-3 border border-stone-200 rounded-lg cursor-pointer hover:bg-stone-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.amenities.includes(amenity)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, amenities: [...formData.amenities, amenity] });
                        } else {
                          setFormData({ ...formData, amenities: formData.amenities.filter(a => a !== amenity) });
                        }
                      }}
                      className="w-4 h-4 text-sky-600 rounded"
                    />
                    <span className="text-sm text-stone-700">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeSection === "media" && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-2xl font-medium text-stone-900 mb-1">Media</h1>
                <p className="text-sm text-stone-500">
                  Manage your property photos
                </p>
              </div>

              <PhotoManager
                photos={photos}
                onAdd={handleAddPhoto}
                onDelete={handleDeletePhoto}
                onReorder={handleReorderPhotos}
              />
            </div>
          )}

          {activeSection === "rules" && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-2xl font-medium text-stone-900 mb-1">
                  House Rules
                </h1>
                <p className="text-sm text-stone-500">
                  Set expectations for your guests
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-stone-600">
                  House Rules
                </label>
                <textarea
                  value={formData.houseRules}
                  onChange={(e) => setFormData({ ...formData, houseRules: e.target.value })}
                  rows={8}
                  placeholder="e.g., No smoking, No parties, Quiet hours after 10pm..."
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
          )}

          {activeSection === "location" && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-2xl font-medium text-stone-900 mb-1">
                  Location
                </h1>
                <p className="text-sm text-stone-500">
                  Property address and coordinates
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-stone-600">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-600">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-stone-600">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-4 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Content: Live Preview */}
        <aside className="w-[420px] shrink-0 sticky top-32 h-fit">
          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden mb-6 bg-stone-100 border border-stone-200">
            {coverPhoto ? (
              <img
                src={coverPhoto.url}
                alt={coverPhoto.alt || property.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400">
                <iconify-icon icon="solar:gallery-linear" width="48" height="48" />
              </div>
            )}
            <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/50 text-xs font-medium text-stone-700">
              Cover Image
            </div>
          </div>

          <div>
            <h2 className="text-xl font-medium text-stone-900 mb-1">
              {formData.name || "Property Name"}
            </h2>
            <p className="text-sm text-stone-500 mb-4">
              {formData.tagline || "Add a tagline"}
            </p>

            <div className="flex flex-wrap gap-4 text-sm text-stone-600">
              <div className="flex items-center gap-1.5">
                <iconify-icon icon="solar:bed-linear" />
                <span>{formData.bedrooms} bedrooms</span>
              </div>
              <div className="flex items-center gap-1.5">
                <iconify-icon icon="solar:bath-linear" />
                <span>{formData.bathrooms} bathrooms</span>
              </div>
              <div className="flex items-center gap-1.5">
                <iconify-icon icon="solar:users-group-rounded-linear" />
                <span>{formData.maxGuests} guests</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-stone-200">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-medium text-stone-900">
                  ${formData.nightlyRate}
                </span>
                <span className="text-sm text-stone-500">/ night</span>
              </div>
              {formData.cleaningFee > 0 && (
                <p className="text-sm text-stone-500 mt-1">
                  + ${formData.cleaningFee} cleaning fee
                </p>
              )}
              {formData.minStay > 1 && (
                <p className="text-sm text-stone-500 mt-1">
                  {formData.minStay} night minimum
                </p>
              )}
            </div>

            {formData.highlight && (
              <div className="mt-6 p-3 bg-sky-50 border border-sky-200 rounded-lg">
                <p className="text-sm text-sky-700 font-medium">
                  {formData.highlight}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-medium text-stone-900 mb-2">
              Delete "{property.name}"?
            </h3>
            <p className="text-sm text-stone-500 mb-6">
              This will permanently delete this listing and all its photos.
              Existing bookings will not be affected but cannot reference this
              property. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 px-4 py-2.5 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-stone-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}