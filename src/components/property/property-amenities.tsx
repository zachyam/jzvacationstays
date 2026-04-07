import { useState } from "react";

const AMENITY_ICONS: Record<string, string> = {
  // Views and location
  "Ocean view": "solar:waterdrops-linear",
  "Beach access": "solar:sun-linear",

  // Internet & Entertainment
  "Wi-Fi": "solar:wi-fi-router-linear",
  "WiFi": "solar:wi-fi-router-linear",
  "Streaming services": "solar:tv-linear",

  // Climate control
  "Air conditioning": "solar:wind-linear",
  "Heating": "solar:fire-minimalistic-linear",

  // Kitchen & Dining
  "Kitchen": "solar:cup-hot-linear",
  "Full kitchen": "solar:cup-hot-linear",
  "BBQ grill": "solar:fire-linear",
  "Outdoor dining": "solar:dish-linear",

  // Laundry
  "Washer": "solar:washing-machine-linear",
  "Dryer": "solar:washing-machine-linear",
  "Washer/Dryer": "solar:washing-machine-linear",

  // Parking & Transportation
  "Free parking": "solar:car-linear",
  "Parking": "solar:car-linear",
  "EV charger": "solar:electric-refueling-linear",
  "Bikes": "solar:bicycle-linear",
  "Kayaks": "solar:skateboarding-linear",

  // Recreation
  "Pool": "solar:swimming-linear",
  "Private pool": "solar:swimming-linear",
  "Heated pool": "solar:swimming-linear",
  "Hot tub": "solar:bath-linear",
  "Gym": "solar:dumbbells-linear",
  "Fire pit": "solar:fire-square-linear",
  "Board games": "solar:gamepad-linear",

  // Family & Pets
  "Pet friendly": "solar:cat-linear",
  "Baby gear": "solar:baby-carriage-linear",
  "Pack n Play": "solar:baby-carriage-linear",
  "High chair": "solar:baby-carriage-linear",

  // Work & Safety
  "Workspace": "solar:laptop-linear",
  "Security cameras": "solar:camera-linear",

  // Other amenities
  "Fenced yard": "solar:fence-linear",
  "Outdoor shower": "solar:shower-linear",
  "Beach chairs": "solar:armchair-linear",
};

function getAmenityIcon(amenity: string): string {
  if (AMENITY_ICONS[amenity]) return AMENITY_ICONS[amenity];
  const lower = amenity.toLowerCase();
  for (const [key, icon] of Object.entries(AMENITY_ICONS)) {
    if (lower.includes(key.toLowerCase())) return icon;
  }
  return "solar:star-linear";
}

export function PropertyAmenities({ amenities }: { amenities: string[] }) {
  const [showAll, setShowAll] = useState(false);

  if (!amenities || amenities.length === 0) return null;

  // Show 5 items initially, or 4 if exactly 5 amenities (to show the button)
  const visibleCount = amenities.length === 5 ? 4 : 5;
  const hasMore = amenities.length > visibleCount;
  const displayedAmenities = showAll ? amenities : amenities.slice(0, visibleCount);

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-stone-900 mb-8">
        What this place offers
      </h2>
      <div className="relative">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
          {displayedAmenities.map((amenity) => (
            <div
              key={amenity}
              className="flex items-center gap-4 text-lg text-stone-700 font-light"
            >
              <iconify-icon
                icon={getAmenityIcon(amenity)}
                class="w-6 h-6 text-stone-400 flex-shrink-0 flex items-center justify-center"
              />
              <span>{amenity}</span>
            </div>
          ))}
        </div>

        {/* Fade overlay when collapsed */}
        {hasMore && !showAll && (
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-stone-50 via-stone-50/95 to-transparent pointer-events-none" />
        )}
      </div>

      {/* Show more/less button */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-6 text-black hover:text-stone-700 font-semibold text-lg transition-colors flex items-center gap-2"
        >
          <span>{showAll ? "Show less" : "Show more"}</span>
          <iconify-icon
            icon={showAll ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
            class="w-5 h-5"
          />
        </button>
      )}
    </div>
  );
}
