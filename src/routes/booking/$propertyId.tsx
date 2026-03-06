import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { getPropertyBySlug } from "../../server/functions/properties";
import { createBooking } from "../../server/functions/bookings";
import { createPaymentIntent } from "../../server/functions/payments";
import { sendOtp, verifyOtp } from "../../server/functions/auth";
import { useAuth } from "../../hooks/use-auth";
import { BookingSummary } from "../../components/booking/booking-summary";
import { StripePayment } from "../../components/booking/stripe-payment";
import { formatDate } from "../../lib/utils";

type BookingSearch = {
  checkIn: string;
  checkOut: string;
  guests: number;
};

export const Route = createFileRoute("/booking/$propertyId")({
  validateSearch: (search: Record<string, unknown>): BookingSearch => ({
    checkIn: (search.checkIn as string) || "",
    checkOut: (search.checkOut as string) || "",
    guests: Number(search.guests) || 2,
  }),
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

type Step = "details" | "payment";

function BookingPage() {
  const { property, coverPhoto } = Route.useLoaderData();
  const { checkIn, checkOut, guests } = Route.useSearch();
  const user = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("details");

  // Guest details
  const [guestName, setGuestName] = useState(user?.name || "");
  const [guestEmail, setGuestEmail] = useState(user?.email || "");
  const [guestPhone, setGuestPhone] = useState("");

  // Auth inline state
  const [authMode, setAuthMode] = useState<"none" | "send" | "verify">("none");
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");
  const [showNameField, setShowNameField] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(
    user?.id || null,
  );

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

  if (!checkIn || !checkOut) {
    return (
      <main className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-stone-500 text-lg mb-4">
            Please select your dates on the property page first.
          </p>
          <button
            onClick={() =>
              navigate({
                to: "/properties/$propertyId",
                params: { propertyId: property.slug },
              })
            }
            className="text-sky-600 hover:text-sky-700 font-medium"
          >
            Back to {property.name}
          </button>
        </div>
      </main>
    );
  }

  const guestsCount = guests;
  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  // TODO: Replace with dynamic pricing from platform sync
  const nightlyRate = 20000; // $200 in cents — placeholder
  const totalAmount = nights * nightlyRate + property.cleaningFee;

  const isLoggedIn = !!authenticatedUserId;

  async function handleSendOtp() {
    const emailToUse = authEmail || guestEmail;
    if (!emailToUse) return;

    setAuthLoading(true);
    setAuthError("");
    try {
      const result = await sendOtp({
        data: { email: emailToUse, name: authName || guestName || undefined },
      });
      if (result.needsName) {
        setShowNameField(true);
        setAuthMode("send");
        setAuthLoading(false);
        return;
      }
      if (result.success) {
        setAuthEmail(emailToUse);
        setAuthMode("verify");
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
        data: {
          email: authEmail || guestEmail,
          code: otpCode,
          name: authName || guestName || undefined,
        },
      });
      if (result.success && result.user) {
        setAuthenticatedUserId(result.user.id);
        setAuthMode("none");
        if (!guestName && result.user.name) setGuestName(result.user.name);
        if (!guestEmail) setGuestEmail(result.user.email);
      } else {
        setAuthError(result.error || "Verification failed");
      }
    } catch (err: any) {
      setAuthError(err.message || "Verification failed");
    }
    setAuthLoading(false);
  }

  async function handleContinueToPayment() {
    if (!guestName || !guestEmail || !authenticatedUserId || !property) return;

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
          userId: authenticatedUserId,
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
          {formatDate(checkIn)} &rarr; {formatDate(checkOut)} &bull;{" "}
          {guestsCount} guest{guestsCount !== 1 ? "s" : ""} &bull; {nights}{" "}
          night{nights !== 1 ? "s" : ""}
        </p>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-10">
          {(["details", "payment"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-stone-300" />}
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  step === s
                    ? "bg-sky-600 text-white"
                    : step === "payment" && s === "details"
                      ? "bg-sky-100 text-sky-700"
                      : "bg-stone-200 text-stone-500"
                }`}
              >
                {s === "details" ? "Your details" : "Payment"}
              </div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-10">
          {/* Left: Form */}
          <div className="lg:col-span-3">
            {/* Step 1: Guest details + login */}
            {step === "details" && (
              <div className="space-y-8">
                {/* Login section */}
                {!isLoggedIn && (
                  <div className="bg-white/90 backdrop-blur-xl border border-stone-200 rounded-2xl p-6">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <iconify-icon
                          icon="solar:user-circle-linear"
                          class="text-sky-600"
                          width="18"
                          height="18"
                        />
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-stone-900">
                          Have an account?
                        </h3>
                        <p className="text-sm text-stone-500">
                          Sign in to speed up your booking and access your
                          reservations later.
                        </p>
                      </div>
                    </div>

                    {authMode === "none" && (
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <input
                            type="email"
                            value={authEmail || guestEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            placeholder="Your email address"
                            className="flex-1 px-4 py-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                          />
                          <button
                            onClick={handleSendOtp}
                            disabled={
                              authLoading ||
                              (!authEmail && !guestEmail)
                            }
                            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {authLoading ? "Sending..." : "Sign in"}
                          </button>
                        </div>
                        {showNameField && (
                          <div>
                            <input
                              type="text"
                              value={authName}
                              onChange={(e) => setAuthName(e.target.value)}
                              placeholder="Full name (required for new accounts)"
                              className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                            />
                            <button
                              onClick={handleSendOtp}
                              disabled={authLoading || !authName}
                              className="mt-2 w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                            >
                              {authLoading
                                ? "Sending..."
                                : "Send verification code"}
                            </button>
                          </div>
                        )}
                        {authError && (
                          <p className="text-sm text-red-600">{authError}</p>
                        )}
                      </div>
                    )}

                    {authMode === "send" && (
                      <div className="space-y-3">
                        {showNameField && (
                          <input
                            type="text"
                            value={authName}
                            onChange={(e) => setAuthName(e.target.value)}
                            placeholder="Full name (required for new accounts)"
                            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                          />
                        )}
                        <button
                          onClick={handleSendOtp}
                          disabled={
                            authLoading || (showNameField && !authName)
                          }
                          className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                        >
                          {authLoading
                            ? "Sending..."
                            : "Send verification code"}
                        </button>
                        {authError && (
                          <p className="text-sm text-red-600">{authError}</p>
                        )}
                      </div>
                    )}

                    {authMode === "verify" && (
                      <div className="space-y-3">
                        <p className="text-sm text-stone-600">
                          Enter the 6-digit code sent to{" "}
                          <span className="font-medium">{authEmail}</span>
                        </p>
                        <input
                          type="text"
                          value={otpCode}
                          onChange={(e) =>
                            setOtpCode(
                              e.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                          placeholder="000000"
                          maxLength={6}
                          className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-white text-stone-900 text-center text-xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                        />
                        {authError && (
                          <p className="text-sm text-red-600">{authError}</p>
                        )}
                        <button
                          onClick={handleVerifyOtp}
                          disabled={otpCode.length !== 6 || authLoading}
                          className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                        >
                          {authLoading ? "Verifying..." : "Verify code"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Logged-in confirmation */}
                {isLoggedIn && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <iconify-icon
                        icon="solar:check-circle-bold"
                        class="text-emerald-600"
                        width="18"
                        height="18"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emerald-900">
                        Signed in{user?.name ? ` as ${user.name}` : ""}
                      </p>
                      <p className="text-xs text-emerald-700">
                        Your booking will be saved to your account.
                      </p>
                    </div>
                  </div>
                )}

                {/* Guest details form */}
                <div>
                  <h2 className="text-xl font-medium text-stone-900 mb-5">
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
                    <button
                      onClick={handleContinueToPayment}
                      disabled={
                        !guestName ||
                        !guestEmail ||
                        !isLoggedIn ||
                        paymentLoading
                      }
                      className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                    >
                      {paymentLoading
                        ? "Setting up payment..."
                        : !isLoggedIn
                          ? "Sign in above to continue"
                          : "Continue to payment"}
                    </button>
                    {!isLoggedIn && guestName && guestEmail && (
                      <p className="text-xs text-stone-400 text-center">
                        Please sign in or create an account above to proceed
                        with your booking.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === "payment" && clientSecret && (
              <div className="space-y-6">
                <h2 className="text-xl font-medium text-stone-900">Payment</h2>
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
              <BookingSummary
                propertyName={property.name}
                checkIn={checkIn}
                checkOut={checkOut}
                guestsCount={guestsCount}
                nights={nights}
                cleaningFee={property.cleaningFee}
                totalAmount={totalAmount}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
