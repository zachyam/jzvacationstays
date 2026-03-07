import { createFileRoute } from "@tanstack/react-router";

import { getDashboardStats } from "../../server/functions/admin-dashboard";
import { StatsCard } from "../../components/admin/stats-card";
import { formatCurrency, formatDate } from "../../lib/utils";

export const Route = createFileRoute("/admin/dashboard")({
  loader: async () => {
    try {
      return await getDashboardStats();
    } catch {
      return {
        totalBookings: 0,
        confirmedBookings: 0,
        upcomingBookings: 0,
        totalRevenue: 0,
        totalReviews: 0,
        properties: [],
        recentBookings: [],
      };
    }
  },
  component: DashboardPage,
});

function DashboardPage() {
  const stats = Route.useLoaderData();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium text-stone-900">Dashboard</h1>
        <p className="text-stone-500 text-sm mt-1">
          Overview of your vacation rental business.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Total Bookings"
          value={stats.totalBookings}
          icon="mdi:calendar-check"
        />
        <StatsCard
          label="Confirmed"
          value={stats.confirmedBookings}
          icon="mdi:check-circle"
        />
        <StatsCard
          label="Upcoming"
          value={stats.upcomingBookings}
          icon="mdi:clock-outline"
        />
        <StatsCard
          label="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon="mdi:currency-usd"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent bookings */}
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <h3 className="font-medium text-stone-900 mb-4">Recent Bookings</h3>
          {stats.recentBookings.length === 0 ? (
            <p className="text-sm text-stone-400">No bookings yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentBookings.map(({ booking, propertyName }) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="text-stone-900 font-medium">
                      {booking.guestName}
                    </p>
                    <p className="text-stone-500">
                      {propertyName} &bull; {formatDate(booking.checkIn)}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      booking.status === "confirmed"
                        ? "bg-green-100 text-green-700"
                        : booking.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Properties overview */}
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <h3 className="font-medium text-stone-900 mb-4">Properties</h3>
          {stats.properties.length === 0 ? (
            <p className="text-sm text-stone-400">No properties set up.</p>
          ) : (
            <div className="space-y-3">
              {stats.properties.map((property) => (
                <div
                  key={property.id}
                  className="flex items-center justify-between text-sm"
                >
                  <p className="text-stone-900 font-medium">{property.name}</p>
                  <span className="text-stone-400">{property.slug}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
