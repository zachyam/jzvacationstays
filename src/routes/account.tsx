import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { getMyBookings } from "../server/functions/bookings";
import { Header } from "../components/layout/header";
import { formatCurrency, formatDate } from "../lib/utils";

export const Route = createFileRoute("/account")({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/auth/login" });
    }
  },
  loader: async () => {
    try {
      const bookings = await getMyBookings();
      return { bookings };
    } catch {
      return { bookings: [] };
    }
  },
  component: AccountPage,
});

function AccountPage() {
  const { bookings } = Route.useLoaderData();
  const user = Route.useRouteContext().user!;

  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const upcoming = bookings.filter(
    (b) => b.booking.checkIn >= today && b.booking.status !== "cancelled",
  );
  const past = bookings.filter(
    (b) => b.booking.checkIn < today || b.booking.status === "completed",
  );

  const modalBooking = bookings.find((b) => b.booking.id === selectedBooking);

  return (
    <div className="bg-stone-50 text-stone-900 flex flex-col min-h-screen">
      {/* Header */}
      <header className="w-full pt-8 pb-4">
        <div className="max-w-screen-xl mx-auto px-6 flex items-center justify-between">
          <Link
            to="/"
            className="text-xl font-medium tracking-tight text-stone-900"
          >
            JZ Vacation Stays
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/properties"
              className="text-sm font-light text-stone-500 hover:text-stone-900 transition-colors duration-200"
            >
              Browse
            </Link>
            <Link
              to="/account"
              className="text-sm font-medium text-stone-900 transition-colors duration-200"
            >
              Dashboard
            </Link>
          </nav>

          <div className="flex items-center gap-5">
            <Link to="/account" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full bg-white border border-stone-200 shadow-sm text-stone-700 flex items-center justify-center font-medium text-xs group-hover:border-stone-300 transition-colors duration-200">
                {(user.name || user.email).slice(0, 2).toUpperCase()}
              </div>
            </Link>
          </div>
        </div>
      </header>

      <main className="w-full max-w-screen-xl mx-auto px-6 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 flex-grow">
        {/* Left Side: Bookings */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
          <div className="mb-12">
            <h1 className="text-4xl lg:text-5xl font-medium tracking-tight text-stone-900 mb-4">
              Welcome back, {user.name?.split(" ")[0] || "there"}
            </h1>
            <p className="text-lg text-stone-500 font-light">
              Manage your upcoming stays and review your past adventures.
            </p>
          </div>

          {/* Upcoming Bookings */}
          <div className="mb-16">
            <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-stone-900 mb-6">
              Upcoming Bookings
            </h2>

            {upcoming.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-[2rem] p-8 text-center">
                <p className="text-stone-500 font-light mb-4">
                  No upcoming bookings yet.
                </p>
                <Link
                  to="/properties"
                  className="inline-block px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-xl transition-colors"
                >
                  Browse properties
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcoming.map(({ booking, propertyName, propertySlug }) => (
                  <div
                    key={booking.id}
                    className="bg-white border border-stone-200 rounded-[2rem] p-4 md:p-6 flex flex-col md:flex-row gap-6 lg:gap-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] group"
                  >
                    <div className="w-full md:w-64 h-56 md:h-auto flex-shrink-0 overflow-hidden rounded-2xl relative">
                      <img
                        src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                        alt={propertyName}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            booking.status === "confirmed"
                              ? "bg-emerald-500"
                              : "bg-amber-500"
                          }`}
                        />
                        <span className="text-xs font-medium uppercase tracking-widest text-stone-900">
                          {booking.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col flex-grow py-2">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-2xl font-medium tracking-tight text-stone-900">
                          {propertyName}
                        </h3>
                        <span className="text-xl font-medium text-stone-900 hidden sm:block">
                          {formatCurrency(booking.totalAmount)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div>
                          <span className="text-xs font-medium uppercase tracking-widest text-stone-400 block mb-1">
                            Dates
                          </span>
                          <span className="text-base text-stone-900 font-light block">
                            {formatDate(booking.checkIn)} -{" "}
                            {formatDate(booking.checkOut)}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs font-medium uppercase tracking-widest text-stone-400 block mb-1">
                            Guests
                          </span>
                          <span className="text-base text-stone-900 font-light block">
                            {booking.guestsCount} guest
                            {booking.guestsCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      <div className="mt-auto flex flex-wrap gap-3">
                        <button
                          onClick={() => setSelectedBooking(booking.id)}
                          className="px-5 py-2.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-sm font-medium rounded-xl transition-colors active:scale-[0.98]"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Bookings */}
          {past.length > 0 && (
            <div>
              <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-stone-900 mb-6">
                Past Bookings
              </h2>

              <div className="flex flex-col gap-4">
                {past.map(({ booking, propertyName, propertySlug }) => (
                  <div
                    key={booking.id}
                    className="group flex items-center gap-5 p-4 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedBooking(booking.id)}
                  >
                    <img
                      src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80"
                      alt={propertyName}
                      className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-grow">
                      <h4 className="text-lg font-medium text-stone-900 mb-1">
                        {propertyName}
                      </h4>
                      <p className="text-sm font-light text-stone-500">
                        {formatDate(booking.checkIn)} -{" "}
                        {formatDate(booking.checkOut)} &bull;{" "}
                        {booking.guestsCount} Guest
                        {booking.guestsCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="hidden sm:flex items-center gap-3 pr-2">
                      <Link
                        to="/booking/$propertyId"
                        params={{ propertyId: propertySlug }}
                        className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg hover:border-stone-300 transition-all"
                      >
                        Book again
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Personal Details Card */}
        <div className="lg:col-span-5 xl:col-span-4 relative mt-4 lg:mt-0">
          <div className="sticky top-12 bg-white border border-stone-200 rounded-[2rem] p-8 shadow-[0_20px_40px_rgb(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-medium tracking-tight text-stone-900">
                Personal Details
              </h2>
              <iconify-icon
                icon="solar:user-circle-linear"
                class="w-7 h-7 text-stone-400"
              />
            </div>

            <div className="border border-stone-200 rounded-2xl mb-8 flex flex-col bg-white shadow-sm overflow-hidden">
              <div className="p-4 flex flex-col text-left bg-white border-b border-stone-200 group focus-within:bg-stone-50 transition-colors">
                <span className="text-xs font-medium uppercase tracking-widest text-stone-500 group-focus-within:text-sky-600 transition-colors mb-1">
                  Full Name
                </span>
                <span className="text-lg font-light text-stone-900">
                  {user.name || "—"}
                </span>
              </div>

              <div className="p-4 flex flex-col text-left bg-white border-b border-stone-200">
                <span className="text-xs font-medium uppercase tracking-widest text-stone-500 mb-1">
                  Email Address
                </span>
                <span className="text-lg font-light text-stone-900">
                  {user.email}
                </span>
              </div>

              <div className="p-4 flex flex-col text-left bg-white">
                <span className="text-xs font-medium uppercase tracking-widest text-stone-500 mb-1">
                  Account Type
                </span>
                <span className="text-lg font-light text-stone-900 capitalize">
                  {user.role}
                </span>
              </div>
            </div>

            <p className="text-sm font-light text-stone-500 text-center flex items-center justify-center gap-2">
              <iconify-icon
                icon="solar:lock-password-linear"
                class="w-4 h-4"
              />
              Your data is securely encrypted
            </p>
          </div>
        </div>
      </main>

      {/* Booking Details Modal */}
      {modalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSelectedBooking(null)}
          />

          <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-[0_20px_60px_rgb(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Image Header */}
            <div className="h-48 sm:h-64 w-full relative flex-shrink-0">
              <img
                src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80"
                alt={modalBooking.propertyName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/40 to-transparent" />

              <button
                onClick={() => setSelectedBooking(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm text-stone-900 flex items-center justify-center hover:bg-white transition-colors shadow-sm"
              >
                <iconify-icon
                  icon="solar:close-circle-linear"
                  class="w-5 h-5"
                />
              </button>

              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                <div
                  className={`w-2 h-2 rounded-full ${
                    modalBooking.booking.status === "confirmed"
                      ? "bg-emerald-500"
                      : modalBooking.booking.status === "pending"
                        ? "bg-amber-500"
                        : "bg-stone-400"
                  }`}
                />
                <span className="text-xs font-medium uppercase tracking-widest text-stone-900">
                  {modalBooking.booking.status}
                </span>
              </div>

              <div className="absolute bottom-4 left-6 pr-6">
                <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white mb-1 shadow-sm">
                  {modalBooking.propertyName}
                </h2>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 overflow-y-auto">
              <div className="flex items-center justify-between pb-6 border-b border-stone-200 mb-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-stone-400 mb-1">
                    Booking ID
                  </p>
                  <p className="text-lg font-medium tracking-widest text-stone-900">
                    #{modalBooking.booking.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-widest text-stone-400 mb-1">
                    Total
                  </p>
                  <p className="text-xl font-medium text-stone-900">
                    {formatCurrency(modalBooking.booking.totalAmount)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/50">
                  <p className="text-xs font-medium uppercase tracking-widest text-stone-500 mb-2">
                    Check-in
                  </p>
                  <p className="text-base font-medium text-stone-900 mb-0.5">
                    {formatDate(modalBooking.booking.checkIn)}
                  </p>
                  <p className="text-sm font-light text-stone-500">
                    After 3:00 PM
                  </p>
                </div>
                <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50/50">
                  <p className="text-xs font-medium uppercase tracking-widest text-stone-500 mb-2">
                    Check-out
                  </p>
                  <p className="text-base font-medium text-stone-900 mb-0.5">
                    {formatDate(modalBooking.booking.checkOut)}
                  </p>
                  <p className="text-sm font-light text-stone-500">
                    Before 11:00 AM
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400 mb-3">
                  Guests &amp; Accommodation
                </p>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-light text-stone-600">
                      Guests
                    </span>
                    <span className="text-base font-medium text-stone-900">
                      {modalBooking.booking.guestsCount} Guest
                      {modalBooking.booking.guestsCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 sm:p-8 pt-0 mt-auto flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={() => setSelectedBooking(null)}
                className="w-full sm:w-auto px-6 py-3 bg-transparent hover:bg-stone-50 text-stone-600 text-sm font-medium rounded-xl transition-colors active:scale-[0.98]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
