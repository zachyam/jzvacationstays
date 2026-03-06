const AMENITY_ICONS: Record<string, string> = {
  "Ocean view": "solar:waterdrops-linear",
  "Fast Wi-Fi": "solar:wi-fi-router-linear",
  "Wi-Fi": "solar:wi-fi-router-linear",
  "Free parking on premises": "solar:key-linear",
  "Free parking": "solar:key-linear",
  "Parking": "solar:key-linear",
  "Smart TV": "solar:tv-linear",
  "TV": "solar:tv-linear",
  "Fully equipped kitchen": "solar:cup-hot-linear",
  "Kitchen": "solar:cup-hot-linear",
  "Central air conditioning": "solar:wind-linear",
  "Air conditioning": "solar:wind-linear",
  "A/C": "solar:wind-linear",
  "Pool": "solar:swimming-linear",
  "Private pool": "solar:swimming-linear",
  "Beach access": "solar:sun-linear",
  "Washer": "solar:washing-machine-linear",
  "Dryer": "solar:washing-machine-linear",
  "Washer/Dryer": "solar:washing-machine-linear",
  "BBQ grill": "solar:fire-linear",
  "Grill": "solar:fire-linear",
  "Outdoor shower": "solar:shower-linear",
  "Patio": "solar:armchair-linear",
  "Deck": "solar:armchair-linear",
  "Board games": "solar:gamepad-linear",
  "Games": "solar:gamepad-linear",
  "Pet friendly": "solar:cat-linear",
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
  if (amenities.length === 0) return null;

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-stone-900 mb-8">
        What this place offers
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
        {amenities.map((amenity) => (
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
    </div>
  );
}
