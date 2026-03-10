import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { createProperty } from "../../../server/functions/admin-properties";
import { PropertyForm } from "../../../components/admin/property-form";

export const Route = createFileRoute("/admin/listings/new")({
  component: NewListingPage,
});

function NewListingPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(data: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const result = await createProperty({ data });
      if (result.success && result.property) {
        navigate({
          to: "/admin/listings/$slug",
          params: { slug: result.property.slug },
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    }
    setSaving(false);
  }

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
        <h1 className="text-2xl font-medium text-stone-900">Add New Listing</h1>
        <p className="text-stone-500 text-sm mt-1">
          Create a new vacation rental property.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <PropertyForm onSubmit={handleSubmit} saving={saving} />
    </div>
  );
}
