import { useState } from "react";
import { cn } from "../../lib/utils";

const AMENITY_OPTIONS = [
  "Ocean view",
  "Pool",
  "Hot tub",
  "Wi-Fi",
  "Air conditioning",
  "Heating",
  "Kitchen",
  "Washer",
  "Dryer",
  "Free parking",
  "EV charger",
  "Gym",
  "BBQ grill",
  "Fire pit",
  "Outdoor dining",
  "Beach access",
  "Kayaks",
  "Bikes",
  "Board games",
  "Streaming services",
  "Workspace",
  "Pet friendly",
  "Baby gear",
  "Security cameras",
];

type PropertyFormProps = {
  defaults?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  saving: boolean;
  isEdit?: boolean;
};

export function PropertyForm({
  defaults,
  onSubmit,
  saving,
  isEdit,
}: PropertyFormProps) {
  const [slug, setSlug] = useState((defaults?.slug as string) || "");
  const [name, setName] = useState((defaults?.name as string) || "");
  const [tagline, setTagline] = useState((defaults?.tagline as string) || "");
  const [description, setDescription] = useState(
    (defaults?.description as string) || "",
  );
  const [maxGuests, setMaxGuests] = useState(
    (defaults?.maxGuests as number) || 1,
  );
  const [bedrooms, setBedrooms] = useState(
    (defaults?.bedrooms as number) || 1,
  );
  const [bathrooms, setBathrooms] = useState(
    (defaults?.bathrooms as string) || "1",
  );
  const [beds, setBeds] = useState<string[]>(
    (defaults?.beds as string[]) || [],
  );
  const [newBed, setNewBed] = useState("");
  const [cleaningFee, setCleaningFee] = useState(
    ((defaults?.cleaningFee as number) || 0) / 100,
  );
  const [nightlyRate, setNightlyRate] = useState(
    ((defaults?.nightlyRate as number) || 0) / 100,
  );
  const [petFee, setPetFee] = useState(
    ((defaults?.petFee as number) || 0) / 100,
  );
  const [maxPets, setMaxPets] = useState((defaults?.maxPets as number) || 0);
  const [minStay, setMinStay] = useState(
    (defaults?.minStay as number) || 1,
  );
  const [checkInTime, setCheckInTime] = useState(
    (defaults?.checkInTime as string) || "16:00",
  );
  const [checkOutTime, setCheckOutTime] = useState(
    (defaults?.checkOutTime as string) || "11:00",
  );
  const [houseRules, setHouseRules] = useState(
    (defaults?.houseRules as string) || "",
  );
  const [address, setAddress] = useState(
    (defaults?.address as string) || "",
  );
  const [latitude, setLatitude] = useState(
    (defaults?.latitude as string) || "",
  );
  const [longitude, setLongitude] = useState(
    (defaults?.longitude as string) || "",
  );
  const [amenities, setAmenities] = useState<string[]>(
    (defaults?.amenities as string[]) || [],
  );
  const [highlight, setHighlight] = useState(
    (defaults?.highlight as string) || "",
  );
  const [isActive, setIsActive] = useState(
    (defaults?.isActive as boolean) ?? true,
  );

  function handleNameChange(value: string) {
    setName(value);
    if (!isEdit) {
      setSlug(
        value
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-"),
      );
    }
  }

  function toggleAmenity(amenity: string) {
    setAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity],
    );
  }

  function addBed() {
    if (newBed.trim()) {
      setBeds((prev) => [...prev, newBed.trim()]);
      setNewBed("");
    }
  }

  function removeBed(index: number) {
    setBeds((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      slug,
      name,
      tagline,
      description,
      maxGuests,
      bedrooms,
      bathrooms,
      beds,
      cleaningFee: Math.round(cleaningFee * 100),
      nightlyRate: Math.round(nightlyRate * 100),
      petFee: Math.round(petFee * 100),
      maxPets,
      minStay,
      checkInTime,
      checkOutTime,
      houseRules,
      address,
      latitude,
      longitude,
      amenities,
      highlight,
      isActive,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Info */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-medium text-stone-900">Basic Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Property Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              placeholder="e.g. Seaglass Villa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Slug (URL identifier)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              pattern="^[a-z0-9-]+$"
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              placeholder="e.g. seaglass-villa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Highlight
            </label>
            <input
              type="text"
              value={highlight}
              onChange={(e) => setHighlight(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              placeholder="e.g. Oceanfront paradise"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              placeholder="A short description shown on property cards"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-y"
              placeholder="Full property description. Use blank lines to separate paragraphs."
            />
          </div>
        </div>
      </section>

      {/* Property Details */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-medium text-stone-900">Property Details</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Max Guests
            </label>
            <input
              type="number"
              value={maxGuests}
              onChange={(e) => setMaxGuests(Number(e.target.value))}
              min={1}
              required
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Bedrooms
            </label>
            <input
              type="number"
              value={bedrooms}
              onChange={(e) => setBedrooms(Number(e.target.value))}
              min={0}
              required
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Bathrooms
            </label>
            <input
              type="text"
              value={bathrooms}
              onChange={(e) => setBathrooms(e.target.value)}
              required
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              placeholder="e.g. 2.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Min Stay (nights)
            </label>
            <input
              type="number"
              value={minStay}
              onChange={(e) => setMinStay(Number(e.target.value))}
              min={1}
              required
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>
        </div>

        {/* Beds */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Beds
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {beds.map((bed, i) => (
              <span
                key={i}
                className="bg-stone-100 text-stone-700 text-sm px-3 py-1.5 rounded-lg flex items-center gap-2"
              >
                {bed}
                <button
                  type="button"
                  onClick={() => removeBed(i)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  <iconify-icon icon="solar:close-circle-linear" width="16" height="16" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newBed}
              onChange={(e) => setNewBed(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addBed();
                }
              }}
              className="border border-stone-300 rounded-lg px-4 py-2 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 flex-1"
              placeholder="e.g. King bed, Queen bed, Sofa bed"
            />
            <button
              type="button"
              onClick={addBed}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm rounded-lg font-medium transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-medium text-stone-900">Pricing</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Nightly Rate ($)
            </label>
            <input
              type="number"
              value={nightlyRate}
              onChange={(e) => setNightlyRate(Number(e.target.value))}
              min={0}
              step={0.01}
              required
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Cleaning Fee ($)
            </label>
            <input
              type="number"
              value={cleaningFee}
              onChange={(e) => setCleaningFee(Number(e.target.value))}
              min={0}
              step={0.01}
              required
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Pet Fee ($)
            </label>
            <input
              type="number"
              value={petFee}
              onChange={(e) => setPetFee(Number(e.target.value))}
              min={0}
              step={0.01}
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Max Pets
            </label>
            <input
              type="number"
              value={maxPets}
              onChange={(e) => setMaxPets(Number(e.target.value))}
              min={0}
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>
        </div>
      </section>

      {/* Check-in/out & House Rules */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-medium text-stone-900">
          Policies & House Rules
        </h2>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Check-in Time
            </label>
            <input
              type="time"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Check-out Time
            </label>
            <input
              type="time"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            House Rules
          </label>
          <textarea
            value={houseRules}
            onChange={(e) => setHouseRules(e.target.value)}
            rows={4}
            className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-y"
            placeholder="e.g. No smoking. Quiet hours 10 PM - 8 AM. No parties or events."
          />
        </div>
      </section>

      {/* Location */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-medium text-stone-900">Location</h2>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            placeholder="Full property address"
          />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Latitude
            </label>
            <input
              type="text"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              placeholder="e.g. 26.1234567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Longitude
            </label>
            <input
              type="text"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              placeholder="e.g. -80.1234567"
            />
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-medium text-stone-900">Amenities</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {AMENITY_OPTIONS.map((amenity) => (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              className={cn(
                "text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors border",
                amenities.includes(amenity)
                  ? "bg-sky-50 border-sky-200 text-sky-700"
                  : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50",
              )}
            >
              {amenity}
            </button>
          ))}
        </div>
      </section>

      {/* Status & Submit */}
      <section className="bg-white border border-stone-200 rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-stone-900">
              Listing Status
            </h2>
            <p className="text-sm text-stone-500 mt-0.5">
              Inactive listings are hidden from guests.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsActive(!isActive)}
            className={cn(
              "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
              isActive ? "bg-emerald-500" : "bg-stone-300",
            )}
          >
            <span
              className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
                isActive ? "translate-x-6" : "translate-x-1",
              )}
            />
          </button>
        </div>
      </section>

      <div className="flex justify-end gap-3 pb-8">
        <button
          type="submit"
          disabled={saving}
          className="bg-sky-600 hover:bg-sky-700 text-white px-8 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : isEdit
              ? "Save Changes"
              : "Create Listing"}
        </button>
      </div>
    </form>
  );
}
