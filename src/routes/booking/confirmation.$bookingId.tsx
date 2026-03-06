import { createFileRoute, Link } from "@tanstack/react-router";

import { getBookingById } from "../../server/functions/bookings";
import { formatCurrency, formatDate } from "../../lib/utils";

export const Route = createFileRoute("/booking/confirmation/$bookingId")({
  loader: async ({ params }) => {
    try {
      const { booking, property } = await getBookingById({
        data: { bookingId: params.bookingId },
      });
      return { booking, property };
    } catch {
      return { booking: null, property: null };
    }
  },
  component: ConfirmationPage,
});

function ConfirmationPage() {
  const { booking, property } = Route.useLoaderData();

  if (!booking || !property) {
    return (
      <main className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-stone-900 mb-2">
            Booking not found
          </h1>
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

  return (
    <main className="min-h-screen bg-stone-100">
      <div className="max-w-screen-sm mx-auto px-6 py-16">
        {/* Success icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-medium text-stone-900 mb-2">
            Booking confirmed!
          </h1>
          <p className="text-stone-500">
            Your stay at {property.name} is all set.
          </p>
        </div>

        {/* Booking details */}
        <div className="bg-white/90 backdrop-blur-xl border border-stone-200 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-medium text-stone-900">
            Booking details
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">Property</span>
              <span className="text-stone-900 font-medium">
                {property.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Check-in</span>
              <span className="text-stone-900">
                {formatDate(booking.checkIn)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Check-out</span>
              <span className="text-stone-900">
                {formatDate(booking.checkOut)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Guests</span>
              <span className="text-stone-900">{booking.guestsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">
                {nights} night{nights !== 1 ? "s" : ""}
              </span>
              <span className="text-stone-900">
                {formatCurrency(booking.totalAmount - property.cleaningFee)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Cleaning fee</span>
              <span className="text-stone-900">
                {formatCurrency(property.cleaningFee)}
              </span>
            </div>
          </div>

          <div className="border-t border-stone-200 pt-3 flex justify-between text-base font-medium">
            <span className="text-stone-900">Total paid</span>
            <span className="text-stone-900">
              {formatCurrency(booking.totalAmount)}
            </span>
          </div>
        </div>

        {/* Confirmation email notice */}
        <p className="text-sm text-stone-400 text-center mt-6">
          A confirmation email has been sent to{" "}
          <span className="text-stone-600">{booking.guestEmail}</span>
        </p>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <Link
            to="/properties"
            className="flex-1 py-3 border border-stone-200 text-stone-700 font-medium rounded-xl hover:bg-stone-50 transition-colors text-center"
          >
            Browse properties
          </Link>
          <Link
            to="/"
            className="flex-1 py-3 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl transition-colors text-center"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
