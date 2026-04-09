import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': {
        icon: string;
        className?: string;
        width?: string;
        height?: string;
      };
    }
  }
}

import { getPropertyBySlug } from "../../server/functions/properties";
import { createBooking } from "../../server/functions/bookings";
import { sendOtp, verifyOtp } from "../../server/functions/auth";
import { useAuth } from "../../hooks/use-auth";
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

function BookingPage() {
  const { property, coverPhoto } = Route.useLoaderData();
  const { checkIn, checkOut, guests } = Route.useSearch();
  const user = useAuth();
  const navigate = useNavigate();

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
  const [signupLoading, setSignupLoading] = useState(false);
  const [authenticatedUserId, setAuthenticatedUserId] = useState<string | null>(
    user?.id || null,
  );

  // Booking state
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState("");

  // Edit booking state
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [isEditingGuests, setIsEditingGuests] = useState(false);
  const [tempCheckIn, setTempCheckIn] = useState(checkIn);
  const [tempCheckOut, setTempCheckOut] = useState(checkOut);
  const [tempGuests, setTempGuests] = useState(guests);

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
  const currentCheckIn = isEditingDates && tempCheckIn ? tempCheckIn : checkIn;
  const currentCheckOut = isEditingDates && tempCheckOut ? tempCheckOut : checkOut;
  const currentGuests = isEditingGuests ? tempGuests : guests;

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(currentCheckOut).getTime() - new Date(currentCheckIn).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  const nightlyRate = property.nightlyRate || 0;
  const totalAmount = nights * nightlyRate + property.cleaningFee;

  const isLoggedIn = !!authenticatedUserId;

  async function handleSendOtp() {
    const emailToUse = authEmail || guestEmail;
    if (!emailToUse) return;

    setAuthLoading(true);
    setAuthError("");
    try {
      const result = await sendOtp({
        data: { email: emailToUse },
      });
      if (result.needsName) {
        setShowNameField(true);
        setAuthMode("send");
        if (result.error) {
          // User tried to sign in with unregistered email
          setAuthError(result.error);
        }
        setAuthLoading(false);
        return;
      }
      if (result.success) {
        // Admin users skip OTP
        if (result.skipOtp && result.user) {
          setAuthenticatedUserId(result.user.id);
          setAuthMode("none");
          if (!guestName && result.user.name) setGuestName(result.user.name);
          if (!guestEmail) setGuestEmail(result.user.email);
        } else {
          setAuthEmail(emailToUse);
          setAuthMode("verify");
        }
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

        // Clear OTP code after successful verification
        setOtpCode("");
        setAuthEmail("");
        setAuthName("");
      } else {
        setAuthError(result.error || "Verification failed");
      }
    } catch (err: any) {
      setAuthError(err.message || "Verification failed");
    }
    setAuthLoading(false);
  }

  async function handleSignUp() {
    setSignupLoading(true);
    setAuthError("");
    try {
      // Send OTP for signup with isSignup flag
      const result = await sendOtp({
        data: { email: guestEmail, isSignup: true },
      });

      if (result.success) {
        setAuthEmail(guestEmail);
        setAuthName(guestName);
        setAuthMode("verify");
      } else {
        setAuthError(result.error || "Failed to send verification code");
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to send verification code");
    }
    setSignupLoading(false);
  }

  async function handleContinueToPayment() {
    if (!authenticatedUserId || !property) return;

    setPaymentLoading(true);
    setError("");
    try {
      const result = await createBooking({
        data: {
          propertySlug: property.slug,
          checkIn,
          checkOut,
          guestsCount,
          totalAmount,
          userId: authenticatedUserId
        },
      });

      if (!result.success || !result.booking) {
        setError(result.error || "Failed to create booking");
        setPaymentLoading(false);
        return;
      }

      // Redirect to payment page instead of inline payment
      navigate({
        to: "/payment/$bookingId",
        params: { bookingId: result.booking.id },
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setPaymentLoading(false);
    }
  }



  function handleApplyChanges() {
    navigate({
      to: "/booking/$propertyId",
      params: { propertyId: property.slug },
      search: {
        checkIn: tempCheckIn,
        checkOut: tempCheckOut,
        guests: tempGuests
      },
    });
    setIsEditingDates(false);
    setIsEditingGuests(false);
  }

  function handleCancelEdit() {
    setTempCheckIn(checkIn);
    setTempCheckOut(checkOut);
    setTempGuests(guests);
    setIsEditingDates(false);
    setIsEditingGuests(false);
  }

  return (
    <main className="bg-stone-50 text-stone-900 selection:bg-sky-500/20 flex flex-col min-h-screen relative">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-stone-900 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center text-white">
            <iconify-icon icon="solar:home-smile-linear" className="text-xl"></iconify-icon>
          </div>
          <span className="text-xl font-medium tracking-tight">JZ Vacation Stays</span>
        </Link>
        <nav className="hidden md:flex items-center space-x-8">
          <Link
            to="/properties"
            className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
          >
            Browse Properties
          </Link>
        </nav>
      </header>

      <div className="max-w-7xl mx-auto w-full p-6 sm:p-8 lg:p-12 flex flex-col xl:flex-row gap-8 lg:gap-12 items-start">

        {/* Left Column: Modify Booking & Details */}
        <div className="flex-1 w-full space-y-10">

          {/* Header */}
          <div>
            <button
              onClick={() => navigate({ to: "/properties/$propertyId", params: { propertyId: property.slug } })}
              className="flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors mb-6"
            >
              <iconify-icon icon="solar:arrow-left-linear"></iconify-icon>
              Back to property
            </button>
            <h1 className="text-4xl font-medium tracking-tight text-stone-900 mb-2">Review your booking</h1>
            <p className="text-stone-500 text-lg">Make sure all details are correct before confirming your stay.</p>
          </div>

          {/* Trip Details Modification Bar */}
          <section className="space-y-6">
            <h2 className="text-2xl font-medium tracking-tight text-stone-900">Trip Details</h2>

            <div className="bg-white border border-stone-200 rounded-[1.5rem] p-2 shadow-sm flex flex-col sm:flex-row gap-3 relative z-20">

              {/* Dates Editor */}
              <div className="relative group flex-1">
                <button
                  onClick={() => {
                    setIsEditingGuests(false);
                    setIsEditingDates(!isEditingDates);
                  }}
                  className="w-full flex flex-col items-start px-6 py-5 rounded-xl hover:bg-stone-50 transition-colors text-left focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:outline-none"
                >
                  <span className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Dates</span>
                  <div className="flex items-center gap-3 text-stone-900 font-medium text-base">
                    <span>{formatDate(currentCheckIn)}</span>
                    <iconify-icon icon="solar:arrow-right-linear" className="text-stone-400" />
                    <span>{formatDate(currentCheckOut)}</span>
                  </div>
                </button>

                {/* Editing Panel */}
                {isEditingDates && (
                  <div className="absolute top-full left-0 mt-3 w-full sm:w-80 bg-white border border-stone-200 rounded-[1.5rem] p-6 shadow-2xl shadow-stone-200/50 z-30">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-600 mb-2">Check In</label>
                        <input
                          type="date"
                          value={tempCheckIn}
                          onChange={(e) => setTempCheckIn(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-600 mb-2">Check Out</label>
                        <input
                          type="date"
                          value={tempCheckOut}
                          onChange={(e) => setTempCheckOut(e.target.value)}
                          min={tempCheckIn || new Date().toISOString().split("T")[0]}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                      </div>
                      <div className="flex gap-3 pt-4 border-t border-stone-100">
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg font-medium hover:bg-stone-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleApplyChanges}
                          disabled={!tempCheckIn || !tempCheckOut}
                          className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="hidden sm:block w-px bg-stone-200 my-3"></div>
              <div className="sm:hidden h-px w-full bg-stone-200 mx-3"></div>

              {/* Guests Editor */}
              <div className="relative group flex-1">
                <button
                  onClick={() => {
                    setIsEditingDates(false);
                    setIsEditingGuests(!isEditingGuests);
                  }}
                  className="w-full flex items-center justify-between px-6 py-5 rounded-xl hover:bg-stone-50 transition-colors text-left focus-within:ring-2 focus-within:ring-sky-500/20 focus-within:outline-none"
                >
                  <div>
                    <span className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2 block">Guests</span>
                    <div className="text-stone-900 font-medium text-base">{currentGuests} Guest{currentGuests !== 1 ? "s" : ""}</div>
                  </div>
                  <iconify-icon icon="solar:alt-arrow-down-linear" className="text-stone-400 text-xl" />
                </button>

                {/* Guests Editing Panel */}
                {isEditingGuests && (
                  <div className="absolute top-full left-0 sm:right-0 sm:left-auto mt-3 w-full sm:w-80 bg-white border border-stone-200 rounded-[1.5rem] p-6 shadow-2xl shadow-stone-200/50 z-30">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-600 mb-2">Number of Guests</label>
                        <select
                          value={tempGuests}
                          onChange={(e) => setTempGuests(Number(e.target.value))}
                          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        >
                          {Array.from({ length: property.maxGuests }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>
                              {n} guest{n !== 1 ? "s" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-3 pt-4 border-t border-stone-100">
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg font-medium hover:bg-stone-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleApplyChanges}
                          disabled={!tempCheckIn || !tempCheckOut}
                          className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </section>


          {/* Information / Policies */}
          <section className="bg-white border border-stone-200 rounded-[1.5rem] p-6 shadow-sm relative z-10">
            <div className="flex gap-4 items-start">
              <div className="mt-1 bg-sky-50 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                <iconify-icon icon="solar:calendar-bold-duotone" className="text-xl text-sky-500"></iconify-icon>
              </div>
              <div>
                <h3 className="text-lg font-medium text-stone-900 mb-1 tracking-tight">Free cancellation before {formatDate(new Date(new Date(checkIn).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}</h3>
                <p className="text-stone-500 leading-relaxed text-sm">Cancel before {formatDate(new Date(new Date(checkIn).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])} for a full refund. After that, cancel before check-in and get a 50% refund, minus the service fee.</p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-stone-200 rounded-[1.5rem] p-6 shadow-sm relative z-10">
            <div className="flex gap-4 items-start">
              <div className="mt-1 bg-stone-100 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                <iconify-icon icon="solar:shield-check-bold-duotone" className="text-xl text-stone-600"></iconify-icon>
              </div>
              <div>
                <h3 className="text-lg font-medium text-stone-900 mb-1 tracking-tight">JZ Vacation Stays Guarantee</h3>
                <p className="text-stone-500 leading-relaxed text-sm">Every booking includes free protection from Host cancellations, listing inaccuracies, and other issues like trouble checking in.</p>
              </div>
            </div>
          </section>

          {/* Auth and Guest Details */}
          <div className="space-y-10">
              {/* Account Sign-in Card */}
              {!isLoggedIn && authMode !== "verify" && (
                <div className="bg-white border border-stone-200 rounded-[1.5rem] p-6 sm:p-8 shadow-sm transition-all">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center flex-shrink-0 border border-sky-100/50">
                      <iconify-icon icon="solar:user-linear" width="24" height="24"></iconify-icon>
                    </div>
                    <div className="pt-0.5">
                      <h2 className="text-xl font-medium tracking-tight text-stone-900">Have an account?</h2>
                      <p className="text-base text-stone-500 mt-1 leading-relaxed">Sign in to speed up your booking and access your reservations later.</p>
                    </div>
                  </div>

                  {(authMode === "none" || authMode === "send") && (
                    <div className="flex flex-col sm:flex-row gap-4 mt-2">
                      <input
                        type="email"
                        value={authEmail || guestEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="Your email address"
                        className="flex-grow bg-white border border-stone-200 rounded-xl px-5 py-3.5 text-base text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-stone-400 shadow-sm"
                      />
                      <button
                        onClick={handleSendOtp}
                        disabled={authLoading || (!authEmail && !guestEmail)}
                        className="bg-stone-500 hover:bg-stone-600 text-white font-medium px-8 py-3.5 rounded-xl text-base transition-colors shadow-sm whitespace-nowrap disabled:opacity-50"
                      >
                        {authLoading ? "Sending..." : "Sign in"}
                      </button>
                    </div>
                  )}

                  {authError && (
                    <p className="text-sm text-red-600 mt-4">{authError}</p>
                  )}

                  {authMode === "verify" && (
                    <div className="space-y-4">
                      <p className="text-base text-stone-600">
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
                        className="w-full bg-white border border-stone-200 rounded-xl px-5 py-3.5 text-base text-stone-900 text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-stone-400 shadow-sm"
                      />
                      {authError && (
                        <p className="text-sm text-red-600">{authError}</p>
                      )}
                      <button
                        onClick={handleVerifyOtp}
                        disabled={otpCode.length !== 6 || authLoading}
                        className="w-full bg-stone-500 hover:bg-stone-600 text-white font-medium py-3.5 rounded-xl text-base transition-colors shadow-sm disabled:opacity-50"
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
                    ></iconify-icon>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-900">
                      Signed in{user?.name ? ` as ${user.name}` : ""} and verified
                    </p>
                    <p className="text-xs text-emerald-700">
                      Your booking will be saved to your account.
                    </p>
                  </div>
                </div>
              )}

              {/* Guest Details Section - Only for non-logged-in users */}
              {!isLoggedIn && (authMode === "none" || (authMode === "send" && showNameField)) && (
                <div>
                  <h2 className="text-2xl font-medium tracking-tight text-stone-900 mb-6">Sign up for an account</h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-base font-medium text-stone-600 mb-2.5">Full name</label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => {
                          setGuestName(e.target.value);
                          if (authError) setAuthError(""); // Clear error when user starts typing
                        }}
                        className="w-full bg-white border border-stone-200 rounded-xl px-5 py-4 text-base text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm placeholder:text-stone-400"
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label className="block text-base font-medium text-stone-600 mb-2.5">Email</label>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-white border border-stone-200 rounded-xl px-5 py-4 text-base text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm placeholder:text-stone-400"
                      />
                    </div>

                    <div>
                      <label className="block text-base font-medium text-stone-600 mb-2.5">Phone</label>
                      <input
                        type="tel"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        className="w-full bg-white border border-stone-200 rounded-xl px-5 py-4 text-base text-stone-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-sm placeholder:text-stone-400"
                      />
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

                  <button
                    onClick={isLoggedIn ? handleContinueToPayment : handleSignUp}
                    disabled={
                      !guestName ||
                      !guestEmail ||
                      !guestPhone ||
                      (isLoggedIn && paymentLoading) ||
                      signupLoading
                    }
                    className="w-full mt-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-4 text-base font-medium text-center shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {signupLoading
                      ? "Sending verification code..."
                      : paymentLoading
                      ? "Setting up payment..."
                      : isLoggedIn ? "Continue to Payment" : "Sign Up"}
                  </button>
                </div>
              )}

              {/* OTP Verification Section - Only when in verify mode */}
              {!isLoggedIn && authMode === "verify" && (
                <div className="bg-white border border-stone-200 rounded-[1.5rem] p-6 sm:p-8 shadow-sm">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-500 flex items-center justify-center flex-shrink-0 border border-sky-100/50">
                      <iconify-icon icon="solar:shield-check-linear" width="24" height="24"></iconify-icon>
                    </div>
                    <div className="pt-0.5">
                      <h2 className="text-xl font-medium tracking-tight text-stone-900">Verify your email</h2>
                      <p className="text-base text-stone-500 mt-1 leading-relaxed">
                        Enter the 6-digit code sent to{" "}
                        <span className="font-medium">{authEmail}</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
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
                      className="w-full bg-white border border-stone-200 rounded-xl px-5 py-3.5 text-base text-stone-900 text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all placeholder:text-stone-400 shadow-sm"
                    />
                    {authError && (
                      <p className="text-sm text-red-600">{authError}</p>
                    )}
                    <button
                      onClick={handleVerifyOtp}
                      disabled={otpCode.length !== 6 || authLoading}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3.5 rounded-xl text-base transition-colors shadow-sm disabled:opacity-50"
                    >
                      {authLoading ? "Verifying..." : "Verify & Continue"}
                    </button>
                  </div>
                </div>
              )}

          </div>

        </div>

        {/* Right Column: Booking Summary Card */}
        <div className="w-full lg:w-[26rem] shrink-0 sticky top-12 z-10">
          <div className="bg-white border border-stone-200 rounded-[1.5rem] p-7 shadow-xl shadow-stone-200/50">

            {/* Property Preview */}
            <div className="flex gap-5 items-center">
              {coverPhoto && (
                <img
                  src={coverPhoto.url}
                  alt={coverPhoto.alt || property.name}
                  className="w-24 h-24 rounded-2xl object-cover border border-stone-100 shadow-sm"
                />
              )}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-1 block">Entire Villa</span>
                <h3 className="font-medium text-xl text-stone-900 tracking-tight leading-tight">{property.name}</h3>
                <div className="flex items-center gap-1.5 text-sm text-stone-500 mt-2">
                  <iconify-icon icon="solar:star-linear" className="text-sky-500"></iconify-icon>
                  <span className="font-medium text-stone-900">4.96</span>
                  <span className="text-stone-400">(128 reviews)</span>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-stone-200 my-7"></div>

            {/* Price Breakdown */}
            <h4 className="text-xl font-medium tracking-tight text-stone-900 mb-5">Price details</h4>
            <div className="space-y-4 text-stone-600 text-base">
              <div className="flex justify-between items-center">
                <span>${(nightlyRate / 100).toFixed(2)} x {nights} nights</span>
                <span className="font-medium text-stone-900">${(nights * nightlyRate / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="underline decoration-stone-300 underline-offset-4 decoration-dashed hover:text-stone-900 transition-colors cursor-help">Cleaning fee</span>
                <span className="font-medium text-stone-900">${(property.cleaningFee / 100).toFixed(2)}</span>
              </div>
            </div>

            <div className="h-px w-full bg-stone-200 my-7"></div>

            {/* Total & Action */}
            <div className="flex justify-between items-end mb-8">
              <div>
                <span className="block font-semibold text-lg text-stone-900 tracking-tight">Total</span>
                <span className="text-sm text-stone-500">Includes all taxes and fees</span>
              </div>
              <span className="font-semibold text-3xl tracking-tight text-stone-900">${(totalAmount / 100).toFixed(2)}</span>
            </div>

            {/* Action Button */}
            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            {isLoggedIn ? (
              <button
                onClick={handleContinueToPayment}
                disabled={paymentLoading}
                className="w-full bg-sky-500 text-white font-medium py-4 rounded-xl shadow-md shadow-sky-500/20 hover:bg-sky-400 hover:shadow-lg hover:-translate-y-0.5 transition-all focus:ring-4 focus:ring-sky-500/20 focus:outline-none text-lg disabled:opacity-50"
              >
                {paymentLoading ? "Creating booking..." : "Continue to Payment"}
              </button>
            ) : (
              <button
                disabled
                className="w-full bg-stone-300 text-stone-500 font-medium py-4 rounded-xl text-lg cursor-not-allowed"
              >
                Sign in to continue
              </button>
            )}

          </div>
        </div>

      </div>
    </main>
  );
}
