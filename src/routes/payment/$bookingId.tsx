import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

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

import { getBookingById } from "../../server/functions/bookings";
import { createPaymentIntent } from "../../server/functions/payments";
import { StripePayment } from "../../components/booking/stripe-payment";
import { formatDate, formatCurrency } from "../../lib/utils";
import { useAuth } from "../../hooks/use-auth";
import { useState } from "react";

export const Route = createFileRoute("/payment/$bookingId")({
  loader: async ({ params }) => {
    try {
      const { booking, property } = await getBookingById({
        data: { bookingId: params.bookingId },
      });

      if (!booking || !property) {
        throw new Error("Booking not found");
      }

      // Create payment intent
      const paymentResult = await createPaymentIntent({
        data: { bookingId: params.bookingId, amount: booking.totalAmount },
      });

      if (!paymentResult.clientSecret) {
        throw new Error("Failed to create payment intent");
      }

      return { booking, property, clientSecret: paymentResult.clientSecret };
    } catch {
      return { booking: null, property: null, clientSecret: null };
    }
  },
  component: PaymentPage,
});

function PaymentPage() {
  const { booking, property, clientSecret } = Route.useLoaderData();
  const user = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!booking || !property || !clientSecret) {
    return (
      <main className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-stone-900 mb-2">
            Payment session not found
          </h1>
          <p className="text-stone-500 mb-4">
            This payment link may have expired or is invalid.
          </p>
          <Link
            to="/properties"
            className="text-sky-600 hover:text-sky-700 font-medium"
          >
            Browse properties
          </Link>
        </div>
      </main>
    );
  }

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(booking.checkOut).getTime() -
        new Date(booking.checkIn).getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );

  function handlePaymentSuccess() {
    navigate({
      to: "/booking/confirmation/$bookingId",
      params: { bookingId: booking.id },
    });
  }

  function handleGoBack() {
    navigate({
      to: "/booking/$propertyId",
      params: { propertyId: property.slug },
      search: {
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.guestsCount,
      },
    });
  }

  return (
    <main className="min-h-screen bg-stone-100">
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

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">

          {/* Left Column: Payment Form */}
          <div className="space-y-8">
            <div>
              <button
                onClick={handleGoBack}
                className="flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors mb-6"
              >
                <iconify-icon icon="solar:arrow-left-linear"></iconify-icon>
                Back to booking details
              </button>
              <h1 className="text-4xl font-medium tracking-tight text-stone-900 mb-2">
                Complete your payment
              </h1>
              <p className="text-stone-500 text-lg">
                Review your booking details and enter payment information to confirm your stay.
              </p>
            </div>

            {/* Locked booking notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <iconify-icon icon="solar:lock-bold" className="text-amber-600 text-sm"></iconify-icon>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Booking details are locked during payment
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Need to make changes? Go back to the booking page above.
                </p>
              </div>
            </div>

            {/* Guest Information */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6">
              <h3 className="text-lg font-medium text-stone-900 mb-4">Guest Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">Primary guest</span>
                  <span className="text-stone-900 font-medium">{booking.guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Email</span>
                  <span className="text-stone-900">{booking.guestEmail}</span>
                </div>
                {booking.guestPhone && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Phone</span>
                    <span className="text-stone-900">{booking.guestPhone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Section */}
            <div className="bg-white border border-stone-200 rounded-2xl p-6">
              <h3 className="text-lg font-medium text-stone-900 mb-6">Payment Information</h3>
              <StripePayment
                clientSecret={clientSecret}
                onSuccess={handlePaymentSuccess}
                onProcessing={(processing) => setIsProcessing(processing)}
              />
            </div>
          </div>

          {/* Right Column: Booking Summary (Locked) */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-lg">
              <h3 className="text-xl font-medium text-stone-900 mb-6 flex items-center gap-2">
                <iconify-icon icon="solar:bookmark-bold" className="text-sky-500"></iconify-icon>
                Booking Summary
              </h3>

              {/* Property Details */}
              <div className="space-y-4 pb-6 border-b border-stone-200">
                <h4 className="text-lg font-medium text-stone-900">{property.name}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Check-in</span>
                    <span className="text-stone-900 font-medium">
                      {formatDate(booking.checkIn)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Check-out</span>
                    <span className="text-stone-900 font-medium">
                      {formatDate(booking.checkOut)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Guests</span>
                    <span className="text-stone-900 font-medium">{booking.guestsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Nights</span>
                    <span className="text-stone-900 font-medium">{nights}</span>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="py-6 border-b border-stone-200">
                <h4 className="text-lg font-medium text-stone-900 mb-4">Price Details</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">
                      ${((booking.totalAmount - property.cleaningFee) / 100 / nights).toFixed(2)} x {nights} night{nights !== 1 ? "s" : ""}
                    </span>
                    <span className="text-stone-900 font-medium">
                      {formatCurrency(booking.totalAmount - property.cleaningFee)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Cleaning fee</span>
                    <span className="text-stone-900 font-medium">
                      {formatCurrency(property.cleaningFee)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="pt-6">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="block font-semibold text-lg text-stone-900 tracking-tight">Total</span>
                    <span className="text-sm text-stone-500">Includes all taxes and fees</span>
                  </div>
                  <span className="font-semibold text-2xl tracking-tight text-stone-900">
                    {formatCurrency(booking.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Security Note */}
              <div className="mt-6 pt-6 border-t border-stone-200">
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <iconify-icon icon="solar:shield-check-linear" className="text-emerald-500"></iconify-icon>
                  <span>Secure payment powered by Stripe</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}