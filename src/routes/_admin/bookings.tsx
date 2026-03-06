import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import {
  getAdminBookings,
  updateBookingStatus,
} from "../../server/functions/admin-bookings";
import { formatCurrency, formatDate } from "../../lib/utils";

export const Route = createFileRoute("/_admin/bookings")({
  loader: async () => {
    try {
      return { bookings: await getAdminBookings() };
    } catch {
      return { bookings: [] };
    }
  },
  component: BookingsPage,
});

const STATUS_OPTIONS = ["pending", "confirmed", "cancelled", "completed"];

function BookingsPage() {
  const { bookings } = Route.useLoaderData();
  const [filter, setFilter] = useState("all");

  const filtered =
    filter === "all"
      ? bookings
      : bookings.filter((b) => b.booking.status === filter);

  async function handleStatusChange(bookingId: string, status: string) {
    await updateBookingStatus({ data: { bookingId, status } });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-stone-900">Bookings</h1>
          <p className="text-stone-500 text-sm mt-1">
            Manage all guest bookings.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["all", ...STATUS_OPTIONS].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th className="text-left py-3 px-4 font-medium text-stone-500">
                Guest
              </th>
              <th className="text-left py-3 px-4 font-medium text-stone-500">
                Property
              </th>
              <th className="text-left py-3 px-4 font-medium text-stone-500">
                Dates
              </th>
              <th className="text-left py-3 px-4 font-medium text-stone-500">
                Amount
              </th>
              <th className="text-left py-3 px-4 font-medium text-stone-500">
                Status
              </th>
              <th className="text-left py-3 px-4 font-medium text-stone-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-stone-400">
                  No bookings found.
                </td>
              </tr>
            ) : (
              filtered.map(({ booking, propertyName }) => (
                <tr
                  key={booking.id}
                  className="border-b border-stone-100 last:border-0"
                >
                  <td className="py-3 px-4">
                    <p className="text-stone-900 font-medium">
                      {booking.guestName}
                    </p>
                    <p className="text-stone-400 text-xs">
                      {booking.guestEmail}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-stone-700">{propertyName}</td>
                  <td className="py-3 px-4 text-stone-700">
                    {formatDate(booking.checkIn)} &rarr;{" "}
                    {formatDate(booking.checkOut)}
                  </td>
                  <td className="py-3 px-4 text-stone-900 font-medium">
                    {formatCurrency(booking.totalAmount)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === "confirmed"
                          ? "bg-green-100 text-green-700"
                          : booking.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : booking.status === "cancelled"
                              ? "bg-red-100 text-red-700"
                              : "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <select
                      value={booking.status}
                      onChange={(e) =>
                        handleStatusChange(booking.id, e.target.value)
                      }
                      className="text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
