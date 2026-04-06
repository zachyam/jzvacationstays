import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";

import { getPropertyBySlug } from "../../server/functions/properties";
import { getReviewsByProperty } from "../../server/functions/reviews";
import { getAvailability } from "../../server/functions/calendar-sync";
import { getPropertyMedia, getRoomTypes } from "../../server/functions/property-media";
import { Header } from "../../components/layout/header";
import { PropertyAmenities } from "../../components/property/property-amenities";
import { PropertyReviews } from "../../components/property/property-reviews";
import { DateRangePicker } from "../../components/ui/date-range-picker";
import { formatCurrency } from "../../lib/utils";
import { InspectionImage } from "../../components/inspection-image";

export const Route = createFileRoute("/properties/$propertyId")({
  loader: async ({ params }) => {
    let property;
    let photos;
    try {
      const result = await getPropertyBySlug({
        data: { slug: params.propertyId },
      });
      property = result.property;
      photos = result.photos;
    } catch {
      return { property: null, photos: [], reviews: [], blockedDates: [], propertyMedia: [], roomTypes: [] };
    }

    if (!property) return { property: null, photos: [], reviews: [], blockedDates: [], propertyMedia: [], roomTypes: [] };

    const [reviews, availability, mediaData, roomData] = await Promise.all([
      getReviewsByProperty({ data: { propertyId: property.id } }),
      getAvailability({ data: { propertySlug: property.slug } }),
      getPropertyMedia({ data: { propertyId: property.id } }),
      getRoomTypes({ data: { propertyId: property.id } }),
    ]);

    return {
      property,
      photos,
      reviews,
      blockedDates: availability.blockedDates,
      propertyMedia: mediaData.media,
      roomTypes: roomData.rooms
    };
  },
  component: PropertyDetailPage,
});

function PropertyDetailPage() {
  const { property, photos, reviews, blockedDates, propertyMedia, roomTypes } = Route.useLoaderData();
  const navigate = useNavigate();

  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [guestsCount, setGuestsCount] = useState(2);
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    caption?: string;
    roomName: string;
    currentIndex: number;
    images: Array<{ url: string; caption?: string; roomName: string }>;
  } | null>(null);

  // Create a flat array of all room images for navigation
  const allRoomImages = roomTypes.flatMap(room =>
    (room.media || []).map(media => ({
      url: media.url,
      caption: media.caption || undefined,
      roomName: room.name
    }))
  );

  const openLightbox = (imageUrl: string, roomName: string, caption?: string) => {
    const imageIndex = allRoomImages.findIndex(img => img.url === imageUrl);
    setLightboxImage({
      url: imageUrl,
      caption,
      roomName,
      currentIndex: imageIndex,
      images: allRoomImages
    });
  };

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (!lightboxImage) return;

    const { currentIndex, images } = lightboxImage;
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (newIndex < 0) newIndex = images.length - 1;
    if (newIndex >= images.length) newIndex = 0;

    const newImage = images[newIndex];
    setLightboxImage({
      ...lightboxImage,
      url: newImage.url,
      caption: newImage.caption,
      roomName: newImage.roomName,
      currentIndex: newIndex
    });
  };

  const closeLightbox = () => {
    setLightboxImage(null);
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxImage) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          navigateLightbox('prev');
          break;
        case 'ArrowRight':
          navigateLightbox('next');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxImage]);

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

  // Use new hero media if available, otherwise fall back to old photos
  const heroMedia = propertyMedia.find((m) => m.category === 'hero');
  const coverPhoto = photos.find((p) => p.isCover) ?? photos[0];
  const heroUrl =
    heroMedia?.url ||
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

          {/* More Details */}
          {property.moreDetails && (
            <>
              <div className="mb-12">
                <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-stone-900 mb-6">
                  More details about home
                </h2>
                <div className="space-y-6 text-lg font-light text-stone-700 leading-relaxed">
                  {property.moreDetails.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
              <hr className="border-stone-200 mb-10" />
            </>
          )}

          {/* Amenities */}
          <PropertyAmenities amenities={(property.amenities as string[]) || []} />

          {/* Enhanced Photo Gallery */}
          {(propertyMedia.length > 0 || photos.length > 1) && (
            <div className="mt-12">
              <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-stone-900 mb-6">
                Gallery
              </h2>

              {/* Hero Images */}
              {propertyMedia.filter(m => m.category === 'hero').length > 0 && (
                <div className="mb-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {propertyMedia
                      .filter(m => m.category === 'hero')
                      .map((media) => (
                        <div
                          key={media.id}
                          className="aspect-[16/9] rounded-2xl overflow-hidden"
                        >
                          <InspectionImage
                            src={media.url}
                            alt={media.caption || property.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Gallery Images */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Use new media if available, otherwise fall back to old photos */}
                {propertyMedia.filter(m => m.category === 'gallery').length > 0 ? (
                  propertyMedia
                    .filter(m => m.category === 'gallery')
                    .map((media) => (
                      <div
                        key={media.id}
                        className="aspect-[4/3] rounded-2xl overflow-hidden"
                      >
                        <InspectionImage
                          src={media.url}
                          alt={media.caption || property.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ))
                ) : (
                  photos.map((photo) => (
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
                  ))
                )}
              </div>

              {/* Exterior Images */}
              {propertyMedia.filter(m => m.category === 'exterior').length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-medium text-stone-800 mb-4">Exterior</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {propertyMedia
                      .filter(m => m.category === 'exterior')
                      .map((media) => (
                        <div
                          key={media.id}
                          className="aspect-[4/3] rounded-2xl overflow-hidden"
                        >
                          <InspectionImage
                            src={media.url}
                            alt={media.caption || "Exterior view"}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Amenity Images */}
              {propertyMedia.filter(m => m.category === 'amenity').length > 0 && (
                <div className="mt-8">
                  <h3 className="text-xl font-medium text-stone-800 mb-4">Amenities</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {propertyMedia
                      .filter(m => m.category === 'amenity')
                      .map((media) => (
                        <div
                          key={media.id}
                          className="aspect-[4/3] rounded-2xl overflow-hidden"
                        >
                          <InspectionImage
                            src={media.url}
                            alt={media.caption || "Amenity"}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Room Types */}
          {roomTypes.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-stone-900 mb-6">
                Rooms & Sleeping Arrangements
              </h2>
              <div className="grid gap-8">
                {roomTypes.map((room) => (
                  <div key={room.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-medium text-stone-900">{room.name}</h3>
                          {room.description && (
                            <p className="text-stone-600 mt-1">{room.description}</p>
                          )}
                          <div className="flex gap-4 mt-3 text-sm text-stone-500">
                            {room.beds && (
                              <span className="flex items-center gap-1.5">
                                <iconify-icon icon="solar:bed-linear" class="text-base" />
                                {room.beds}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Room Images */}
                      {room.media && room.media.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                          {room.media.map((media) => (
                            <div
                              key={media.id}
                              className="group relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer bg-stone-100"
                              onClick={() => openLightbox(media.url, room.name, media.caption)}
                            >
                              <InspectionImage
                                src={media.url}
                                alt={media.caption || room.name}
                                className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                              />
                              {/* Hover overlay */}
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                                <iconify-icon
                                  icon="solar:eye-linear"
                                  class="text-white text-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110"
                                />
                              </div>
                              {/* Image caption indicator */}
                              {media.caption && (
                                <div className="absolute bottom-2 left-2 right-2">
                                  <div className="bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                    {media.caption}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-200"
          >
            <iconify-icon icon="solar:close-circle-linear" class="text-2xl" />
          </button>

          {/* Navigation buttons */}
          {lightboxImage.images.length > 1 && (
            <>
              <button
                onClick={() => navigateLightbox('prev')}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-200"
              >
                <iconify-icon icon="solar:arrow-left-linear" class="text-2xl" />
              </button>
              <button
                onClick={() => navigateLightbox('next')}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-all duration-200"
              >
                <iconify-icon icon="solar:arrow-right-linear" class="text-2xl" />
              </button>
            </>
          )}

          {/* Image container */}
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex flex-col">
            {/* Image */}
            <div className="flex-1 flex items-center justify-center">
              <InspectionImage
                src={lightboxImage.url}
                alt={lightboxImage.caption || lightboxImage.roomName}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Image info */}
            <div className="bg-black/50 backdrop-blur-sm text-white p-6 rounded-b-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium">{lightboxImage.roomName}</h3>
                  {lightboxImage.caption && (
                    <p className="text-stone-300 mt-1">{lightboxImage.caption}</p>
                  )}
                </div>
                {lightboxImage.images.length > 1 && (
                  <div className="text-sm text-stone-300">
                    {lightboxImage.currentIndex + 1} of {lightboxImage.images.length}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Click outside to close */}
          <div
            className="absolute inset-0 -z-10"
            onClick={closeLightbox}
          />
        </div>
      )}
    </main>
  );
}
