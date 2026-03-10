import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import {
  getAdminPropertyBySlug,
  updateProperty,
  deleteProperty,
  addPropertyPhoto,
  deletePropertyPhoto,
  reorderPropertyPhotos,
} from "../../../server/functions/admin-properties";
import { PropertyForm } from "../../../components/admin/property-form";
import { PhotoManager } from "../../../components/admin/photo-manager";

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

function EditListingPage() {
  const { property, photos } = Route.useLoaderData();
  const navigate = useNavigate();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);

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

  async function handleSubmit(data: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const result = await updateProperty({
        data: { slug: property!.slug, updates: data },
      });
      if (result.success && result.property) {
        // If slug changed, navigate to new URL
        if (result.property.slug !== property!.slug) {
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
      await deleteProperty({ data: { slug: property!.slug } });
      navigate({ to: "/admin/listings" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete listing");
    }
  }

  async function handleAddPhoto(url: string, alt: string) {
    try {
      await addPropertyPhoto({
        data: {
          propertyId: property!.id,
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

  const formDefaults = {
    slug: property.slug,
    name: property.name,
    tagline: property.tagline || "",
    description: property.description || "",
    maxGuests: property.maxGuests,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    beds: (property.beds as string[]) || [],
    cleaningFee: property.cleaningFee,
    nightlyRate: property.nightlyRate,
    petFee: property.petFee,
    maxPets: property.maxPets,
    minStay: property.minStay,
    checkInTime: property.checkInTime || "16:00",
    checkOutTime: property.checkOutTime || "11:00",
    houseRules: property.houseRules || "",
    address: property.address || "",
    latitude: property.latitude || "",
    longitude: property.longitude || "",
    amenities: (property.amenities as string[]) || [],
    highlight: property.highlight || "",
    isActive: property.isActive,
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <button
          onClick={() => navigate({ to: "/admin/listings" })}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors mb-4"
        >
          <iconify-icon icon="solar:arrow-left-linear" />
          Back to listings
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium text-stone-900">
              Edit: {property.name}
            </h1>
            <p className="text-stone-500 text-sm mt-1">
              Update listing details, photos, and settings.
            </p>
          </div>
          <button
            onClick={() => setShowDelete(true)}
            className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            Delete listing
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Photo Management */}
      <PhotoManager
        photos={photos}
        onAdd={handleAddPhoto}
        onDelete={handleDeletePhoto}
        onReorder={handleReorderPhotos}
      />

      {/* Property Details Form */}
      <PropertyForm
        defaults={formDefaults}
        onSubmit={handleSubmit}
        saving={saving}
        isEdit
      />

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
    </div>
  );
}
