import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { getPropertyBySlug } from "../../server/functions/properties";
import { createBooking } from "../../server/functions/bookings";
import { createPaymentIntent } from "../../server/functions/payments";
import { sendOtp, verifyOtp } from "../../server/functions/auth";
import { useAuth } from "../../hooks/use-auth";
import { AvailabilityCalendar } from "../../components/booking/availability-calendar";
import { BookingSummary } from "../../components/booking/booking-summary";
import { StripePayment } from "../../components/booking/stripe-payment";
import { formatCurrency } from "../../lib/utils";

export const Route = createFileRoute("/booking/$propertyId")({
  loader: async ({ params }) => {
    try {
      const { property, photos } = await getPropertyBySlug({
        data: { slug: params.propertyId },
      });
      return { property, coverPhoto: photos.find((p) => p.isCover) ?? photos[0] ?? null };
    } catch {
      return { property: null, coverPhoto: null };
    }
  },
  component: BookingPage,
});

type Step = "dates" | "info" | "auth" | "payment";

function BookingPage() {
  const { property, coverPhoto } = Route.useLoaderData();
  const user = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("dates");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestsCount, setGuestsCount] = useState(2);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  // Auth inline state
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");
  const [showNameField, setShowNameField] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Payment state
  const [clientSecret, setClientSecret] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState("");

  if (!property) {
    return (
      <main className="min-h-screen bg-stone-100 flex items-center justify-center">
        <p className="text-stone-500 text-lg">Property not found.</p>
      </main>
    );
  }

  // Calculate nights and total (placeholder: $200/night + cleaning fee)
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

  // TODO: Replace with dynamic pricing from platform sync
  const nightlyRate = 20000; // $200 in cents — placeholder
  const totalAmount = nights * nightlyRate + property.cleaningFee;

  function handleDateSelect(ci: string, co: string) {
    setCheckIn(ci);
    setCheckOut(co);
  }

  function handleDatesNext() {
    if (!checkIn || !checkOut) return;
    setStep("info");
  }

  function handleInfoNext() {
    if (!guestName || !guestEmail) return;
    if (user) {
      // Already logged in, skip auth step
      handleCreateBooking(user.id);
    } else {
      setAuthEmail(guestEmail);
      setStep("auth");
    }
  }

  async function handleSendOtp() {
    setAuthLoading(true);
    setAuthError("");
    try {
      const result = await sendOtp({
        data: { email: authEmail, name: authName || undefined },
      });
      if (result.needsName) {
        setShowNameField(true);
        setAuthLoading(false);
        return;
      }
      if (result.success) {
        setOtpSent(true);
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to send code");
    }
    setAuthLoading(false);
  }

  async function handleVerifyOtp() {
    setAuthLoading(true);
    setAuthError("");
    try {
      const result = await verifyOtp({
        data: { email: authEmail, code: otpCode, name: authName || undefined },
      });
      if (result.success && result.user) {
        handleCreateBooking(result.user.id);
      } else {
        setAuthError(result.error || "Verification failed");
      }
    } catch (err: any) {
      setAuthError(err.message || "Verification failed");
    }
    setAuthLoading(false);
  }

  async function handleCreateBooking(userId: string) {
    setPaymentLoading(true);
    setError("");
    try {
      const result = await createBooking({
        data: {
          propertySlug: property.slug,
          checkIn,
          checkOut,
          guestsCount,
          guestName,
          guestEmail,
          guestPhone: guestPhone || undefined,
          totalAmount,
          userId,
        },
      });

      if (!result.success || !result.booking) {
        setError(result.error || "Failed to create booking");
        setPaymentLoading(false);
        return;
      }

      setBookingId(result.booking.id);

      const paymentResult = await createPaymentIntent({
        data: { bookingId: result.booking.id, amount: totalAmount },
      });

      if (paymentResult.clientSecret) {
        setClientSecret(paymentResult.clientSecret);
        setStep("payment");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    }
    setPaymentLoading(false);
  }

  function handlePaymentSuccess() {
    navigate({
      to: "/booking/confirmation/$bookingId",
      params: { bookingId },
    });
  }

  return (
    <main className="min-h-screen bg-stone-100">
      <div className="max-w-screen-lg mx-auto px-6 md:px-10 py-12">
        {/* Header */}
        <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-stone-900 mb-2">
          Book {property.name}
        </h1>
        <p className="text-stone-500 font-light mb-8">
          {property.tagline} &bull; Up to {property.maxGuests} guests
        </p>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-10">
          {(["dates", "info", "auth", "payment"] as Step[])
            .filter((s) => s !== "auth" || !user)
            .map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && (
                  <div className="w-8 h-px bg-stone-300" />
                )}
                <div
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    step === s
                      ? "bg-sky-600 text-white"
                      : (["dates", "info", "auth", "payment"] as Step[]).indexOf(step) >
                          (["dates", "info", "auth", "payment"] as Step[]).indexOf(s)
                        ? "bg-sky-100 text-sky-700"
                        : "bg-stone-200 text-stone-500"
                  }`}
                >
                  {s === "dates" ? "Dates" : s === "info" ? "Details" : s === "auth" ? "Sign in" : "Payment"}
                </div>
              </div>
            ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-10">
          {/* Left: Form */}
          <div className="lg:col-span-3">
            {/* Step 1: Select dates */}
            {step === "dates" && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium text-stone-900">
                  Select your dates
                </h2>
                <AvailabilityCalendar onSelectDates={handleDateSelect} />

                {checkIn && checkOut && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-stone-500 mb-1">
                        Number of guests
                      </label>
                      <select
                        value={guestsCount}
                        onChange={(e) => setGuestsCount(Number(e.target.value))}
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
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
                    <button
                      onClick={handleDatesNext}
                      className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl transition-colors"
                    >
                      Continue
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Guest info */}
            {step === "info" && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium text-stone-900">
                  Guest details
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-stone-500 mb-1">
                      Full name
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-stone-500 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-stone-500 mb-1">
                      Phone (optional)
                    </label>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep("dates")}
                      className="px-6 py-3 border border-stone-200 text-stone-700 font-medium rounded-xl hover:bg-stone-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleInfoNext}
                      disabled={!guestName || !guestEmail || paymentLoading}
                      className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                    >
                      {paymentLoading ? "Setting up..." : user ? "Continue to payment" : "Continue"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Auth (only if not logged in) */}
            {step === "auth" && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium text-stone-900">
                  Sign in to complete booking
                </h2>
                <p className="text-stone-500 text-sm">
                  We&rsquo;ll send a verification code to your email.
                </p>

                {!otpSent ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-stone-500 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                      />
                    </div>
                    {showNameField && (
                      <div>
                        <label className="block text-sm text-stone-500 mb-1">
                          Full name (required for new accounts)
                        </label>
                        <input
                          type="text"
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          placeholder="Your full name"
                          className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                        />
                      </div>
                    )}
                    {authError && (
                      <p className="text-sm text-red-600">{authError}</p>
                    )}
                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep("info")}
                        className="px-6 py-3 border border-stone-200 text-stone-700 font-medium rounded-xl hover:bg-stone-50 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSendOtp}
                        disabled={!authEmail || authLoading || (showNameField && !authName)}
                        className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                      >
                        {authLoading ? "Sending..." : "Send verification code"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-stone-600">
                      Enter the 6-digit code sent to{" "}
                      <span className="font-medium">{authEmail}</span>
                    </p>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full px-4 py-3 border border-stone-200 rounded-xl bg-white text-stone-900 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    />
                    {authError && (
                      <p className="text-sm text-red-600">{authError}</p>
                    )}
                    <button
                      onClick={handleVerifyOtp}
                      disabled={otpCode.length !== 6 || authLoading}
                      className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                    >
                      {authLoading ? "Verifying..." : "Verify & continue"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Payment */}
            {step === "payment" && clientSecret && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium text-stone-900">
                  Payment
                </h2>
                <StripePayment
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                />
              </div>
            )}
          </div>

          {/* Right: Summary sidebar */}
          <div className="lg:col-span-2">
            <div className="sticky top-6">
              {coverPhoto && (
                <img
                  src={coverPhoto.url}
                  alt={coverPhoto.alt || property.name}
                  className="w-full h-48 object-cover rounded-2xl mb-4"
                />
              )}
              {checkIn && checkOut && nights > 0 && (
                <BookingSummary
                  propertyName={property.name}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  guestsCount={guestsCount}
                  nights={nights}
                  cleaningFee={property.cleaningFee}
                  totalAmount={totalAmount}
                />
              )}
              {(!checkIn || !checkOut) && (
                <div className="bg-white/90 backdrop-blur-xl border border-stone-200 rounded-2xl p-6">
                  <h3 className="text-lg font-medium text-stone-900 mb-2">
                    {property.name}
                  </h3>
                  <p className="text-sm text-stone-500">
                    Select your dates to see pricing.
                  </p>
                  <p className="text-sm text-stone-400 mt-2">
                    Cleaning fee: {formatCurrency(property.cleaningFee)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
