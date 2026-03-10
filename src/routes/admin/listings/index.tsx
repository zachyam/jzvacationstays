import { createFileRoute, Link } from "@tanstack/react-router";

import { getAdminProperties } from "../../../server/functions/admin-properties";
import { formatCurrency } from "../../../lib/utils";

export const Route = createFileRoute("/admin/listings/")({
  loader: async () => {
    try {
      return { properties: await getAdminProperties() };
    } catch {
      return { properties: [] };
    }
  },
  component: ListingsPage,
});

function ListingsPage() {
  const { properties } = Route.useLoaderData();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-stone-900">Listings</h1>
          <p className="text-stone-500 text-sm mt-1">
            Manage your vacation rental properties.
          </p>
        </div>
        <Link
          to="/admin/listings/new"
          className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          Add Listing
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
          <iconify-icon
            icon="solar:home-add-linear"
            width="48"
            height="48"
            class="text-stone-300 mb-4"
          />
          <h3 className="text-lg font-medium text-stone-900 mb-2">
            No listings yet
          </h3>
          <p className="text-stone-500 mb-6">
            Add your first vacation rental property to get started.
          </p>
          <Link
            to="/admin/listings/new"
            className="bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Add Listing
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {properties.map((property) => (
            <Link
              key={property.id}
              to="/admin/listings/$slug"
              params={{ slug: property.slug }}
              className="bg-white border border-stone-200 rounded-xl p-5 hover:border-stone-300 hover:shadow-sm transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-stone-100 rounded-xl flex items-center justify-center shrink-0">
                  <iconify-icon
                    icon="solar:home-smile-linear"
                    width="28"
                    height="28"
                    class="text-stone-400"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-stone-900 group-hover:text-sky-600 transition-colors">
                      {property.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        property.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {property.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-stone-500 mt-1">
                    {property.slug}
                    {property.address && ` · ${property.address}`}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-stone-400 mt-1.5">
                    <span>{property.maxGuests} guests</span>
                    <span>{property.bedrooms} bed</span>
                    <span>{Number(property.bathrooms)} bath</span>
                    <span>{formatCurrency(property.nightlyRate)}/night</span>
                    {property.maxPets > 0 && (
                      <span>
                        {property.maxPets} pet{property.maxPets !== 1 ? "s" : ""} ({formatCurrency(property.petFee)} fee)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <iconify-icon
                icon="solar:alt-arrow-right-linear"
                width="20"
                height="20"
                class="text-stone-300 group-hover:text-stone-500 transition-colors"
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
