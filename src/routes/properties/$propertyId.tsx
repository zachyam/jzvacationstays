import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { getPropertyBySlug } from "../../server/functions/properties";
import { getReviewsByProperty } from "../../server/functions/reviews";
import { getAvailability } from "../../server/functions/calendar-sync";
import { Header } from "../../components/layout/header";
import { PropertyAmenities } from "../../components/property/property-amenities";
import { PropertyReviews } from "../../components/property/property-reviews";
import { DateRangePicker } from "../../components/ui/date-range-picker";
import { formatCurrency } from "../../lib/utils";

export const Route = createFileRoute("/properties/$propertyId")({
  loader: async ({ params }) => {
    try {
      const { property, photos } = await getPropertyBySlug({
        data: { slug: params.propertyId },
      });

      if (!property) return { property: null, photos: [], reviews: [], blockedDates: [] };

      // Fetch reviews and availability separately so failures don't hide the property
      const [reviews, availability] = await Promise.all([
        getReviewsByProperty({ data: { propertyId: property.id } }).catch(() => []),
        getAvailability({ data: { propertySlug: property.slug } }).catch(() => ({ blockedDates: [] })),
      ]);

      return { property, photos, reviews, blockedDates: availability.blockedDates };
    } catch {
      return { property: null, photos: [], reviews: [], blockedDates: [] };
    }
  },
  component: PropertyDetailPage,
});

function PropertyDetailPage() {
  const { property, photos, reviews, blockedDates } = Route.useLoaderData();
  const navigate = useNavigate();

  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [guestsCount, setGuestsCount] = useState(2);

  if (!property) {
    return (
      <main className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-medium text-stone-900 mb-4">
            Property not found
          </h1>
          <Link
            to="/properties"
            className="text-sky-600 hover:text-sky-700 font-medium"
          >
            Browse all properties
          </Link>
        </div>
      </main>
    );
  }

  const coverPhoto = photos.find((p) => p.isCover) ?? photos[0];
  const heroUrl =
    coverPhoto?.url ||
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=2800&q=80";

  const nightlyRate = property.nightlyRate || 0;
  const nights =
    checkIn && checkOut
      ? Math.max(
          1,
          Math.ceil(
            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        )
      : 0;
  const subtotal = nights * nightlyRate;
  const totalAmount = subtotal + property.cleaningFee;

  function handleDateChange(newCheckIn: string, newCheckOut: string) {
    setCheckIn(newCheckIn);
    setCheckOut(newCheckOut);
  }

  function handleReserve() {
    if (!checkIn || !checkOut) return;
    navigate({
      to: "/booking/$propertyId",
      params: { propertyId: property.slug },
      search: { checkIn, checkOut, guests: guestsCount },
    });
  }

  return (
    <main className="w-full flex flex-col min-h-screen bg-stone-50">
      {/* Hero Image with Transparent Header */}
      <section className="relative w-full h-[50vh] min-h-[450px]">
        <img
          src={heroUrl}
          alt={property.name}
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-900/60 via-stone-900/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-stone-50 to-transparent" />

        <Header variant="transparent" />
      </section>

      {/* Main Content */}
      <section className="max-w-screen-xl w-full mx-auto px-6 pb-24 pt-8 md:pt-12 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
        {/* Left Side: Details */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
          {/* Title & Stats */}
          <div className="mb-10">
            <h1 className="text-5xl lg:text-6xl font-medium tracking-tight text-stone-900 mb-6 leading-[1.1]">
              {property.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 md:gap-8 text-lg text-stone-600 font-light">
              {property.address && (
                <>
                  <span className="flex items-center gap-2.5">
                    <iconify-icon
                      icon="solar:map-point-linear"
                      class="w-5 h-5 text-stone-400 flex items-center justify-center"
                    />
                    {property.address}
                  </span>
                  <span className="hidden md:inline text-stone-300">&bull;</span>
                </>
              )}
              <span className="flex items-center gap-2.5">
                <iconify-icon
                  icon="solar:users-group-rounded-linear"
                  class="w-5 h-5 text-stone-400 flex items-center justify-center"
                />
                {property.maxGuests} Guests
              </span>
              <span className="hidden md:inline text-stone-300">&bull;</span>
              <span className="flex items-center gap-2.5">
                <iconify-icon
                  icon="solar:bed-linear"
                  class="w-5 h-5 text-stone-400 flex items-center justify-center"
                />
                {property.bedrooms} Bedrooms
              </span>
              <span className="hidden md:inline text-stone-300">&bull;</span>
              <span className="flex items-center gap-2.5">
                <iconify-icon
                  icon="solar:bath-linear"
                  class="w-5 h-5 text-stone-400 flex items-center justify-center"
                />
                {Number(property.bathrooms)} Baths
              </span>
            </div>
          </div>

          <hr className="border-stone-200 mb-10" />

          {/* Description */}
          {property.description && (
            <>
              <div className="mb-12">
                <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-stone-900 mb-6">
                  About this home
                </h2>
                <div className="space-y-6 text-lg font-light text-stone-700 leading-relaxed">
                  {property.description.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
              <hr className="border-stone-200 mb-10" />
            </>
          )}

          {/* Amenities */}
          <PropertyAmenities amenities={(property.amenities as string[]) || []} />

          {/* Photo Gallery */}
          {photos.length > 1 && (
            <div className="mt-12">
              <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-stone-900 mb-6">
                Gallery
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-[4/3] rounded-2xl overflow-hidden"
                  >
                    <img
                      src={photo.url}
                      alt={photo.alt || property.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="mt-12">
            <PropertyReviews reviews={reviews} />
          </div>
        </div>

        {/* Right Side: Sticky Booking Card */}
        <div className="lg:col-span-5 xl:col-span-4 relative mt-4 lg:mt-0">
          <div className="sticky top-10 bg-white border border-stone-200 rounded-[2rem] p-8 shadow-[0_20px_40px_rgb(0,0,0,0.04)]">
            {/* Price */}
            <div className="flex items-end gap-2 mb-6">
              <span className="text-4xl font-medium tracking-tight text-stone-900">
                {formatCurrency(nightlyRate)}
              </span>
              <span className="text-lg text-stone-500 font-light pb-1">
                / night
              </span>
            </div>

            {/* Booking Inputs */}
            <div className="space-y-4 mb-6">
              {/* Date Range Picker */}
              <div>
                <span className="text-xs font-medium uppercase tracking-widest text-stone-500 mb-2 block">
                  Dates
                </span>
                <DateRangePicker
                  checkIn={checkIn}
                  checkOut={checkOut}
                  onDateChange={handleDateChange}
                  minDate={new Date().toISOString().split("T")[0]}
                  blockedDates={blockedDates}
                />
              </div>

              {/* Guests Selector */}
              <div className="border border-stone-200 rounded-xl bg-white shadow-sm">
                <div className="p-4 flex flex-col text-left">
                  <span className="text-xs font-medium uppercase tracking-widest text-stone-500 mb-1">
                    Guests
                  </span>
                  <select
                    value={guestsCount}
                    onChange={(e) => setGuestsCount(Number(e.target.value))}
                    className="text-lg font-light text-stone-900 bg-transparent focus:outline-none w-full"
                  >
                    {Array.from({ length: property.maxGuests }, (_, i) => i + 1).map(
                      (n) => (
                        <option key={n} value={n}>
                          {n} guest{n !== 1 ? "s" : ""}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Reserve Button */}
            <button
              onClick={handleReserve}
              disabled={!checkIn || !checkOut}
              className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white text-lg font-medium rounded-2xl transition-all shadow-lg shadow-sky-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              Reserve
            </button>

            <p className="text-sm font-light text-stone-500 text-center mb-6">
              You won't be charged yet
            </p>

            {/* Price Breakdown */}
            {nights > 0 && (
              <>
                <div className="flex flex-col gap-4 text-lg font-light text-stone-700 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="underline underline-offset-4 decoration-stone-300">
                      {formatCurrency(nightlyRate)} x {nights} night
                      {nights !== 1 ? "s" : ""}
                    </span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="underline underline-offset-4 decoration-stone-300">
                      Cleaning fee
                    </span>
                    <span>{formatCurrency(property.cleaningFee)}</span>
                  </div>
                </div>

                <hr className="border-stone-200 mb-6" />

                <div className="flex justify-between items-center text-xl font-medium text-stone-900">
                  <span>Total</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
