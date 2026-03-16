import { createFileRoute } from "@tanstack/react-router";

import { getProperties } from "../../server/functions/properties";
import { PropertyCard } from "../../components/property/property-card";
import { Header } from "../../components/layout/header";

export const Route = createFileRoute("/properties/")({
  loader: async () => {
    try {
      const properties = await getProperties();
      return { properties };
    } catch {
      return { properties: [] };
    }
  },
  component: PropertiesPage,
});

function PropertiesPage() {
  const { properties } = Route.useLoaderData();

  return (
    <main className="min-h-screen bg-stone-100">
      <div className="max-w-screen-xl mx-auto px-6 md:px-10 lg:px-12 py-8">
        <Header />
      </div>
      <div className="max-w-screen-xl mx-auto px-6 md:px-10 lg:px-12 py-12">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-medium tracking-tight text-stone-900">
            Our Properties
          </h1>
          <p className="text-lg text-stone-500 font-light mt-3">
            Two handpicked coastal retreats for your family getaway.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              slug={property.slug}
              name={property.name}
              tagline={property.tagline}
              maxGuests={property.maxGuests}
              highlight={property.highlight}
            />
          ))}
        </div>

        {properties.length === 0 && (
          <div className="text-center py-20 text-stone-400">
            <p className="text-xl font-light">
              Properties are being set up. Check back soon!
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
