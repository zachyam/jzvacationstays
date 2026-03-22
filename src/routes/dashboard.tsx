import { createFileRoute, redirect } from "@tanstack/react-router";

import { AdminSidebar } from "../components/admin/admin-sidebar";
import { getDashboardStats } from "../server/functions/admin-dashboard";
import { StatsCard } from "../components/admin/stats-card";
import { formatCurrency, formatDate } from "../lib/utils";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ context }) => {
    // Only allow access on admin subdomain (or localhost for development)
    if (typeof window !== "undefined") {
      const hostname = window.location.hostname;
      const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");

      // In production, require admin subdomain
      if (!isLocalhost && !hostname.startsWith("admin.")) {
        // If not on admin subdomain, redirect to home
        throw redirect({ to: "/" });
      }
    }

    // Check authentication
    if (!context.user) {
      throw redirect({ to: "/auth/login", search: { redirect: "/dashboard" } });
    }
    if (context.user.role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
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
    <div className="flex min-h-screen bg-stone-50">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-medium text-stone-900">Dashboard</h1>
            <p className="text-stone-500 mt-1">Welcome back to your admin panel</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Bookings"
              value={stats.totalBookings}
              icon="solar:calendar-date-linear"
            />
            <StatsCard
              title="Confirmed"
              value={stats.confirmedBookings}
              icon="solar:check-circle-linear"
              variant="success"
            />
            <StatsCard
              title="Upcoming"
              value={stats.upcomingBookings}
              icon="solar:clock-circle-linear"
              variant="warning"
            />
            <StatsCard
              title="Total Revenue"
              value={formatCurrency(stats.totalRevenue)}
              icon="solar:dollar-linear"
              variant="primary"
            />
          </div>

          {/* Recent Bookings */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="p-6 border-b border-stone-100">
              <h2 className="text-xl font-medium text-stone-900">Recent Bookings</h2>
            </div>
            <div className="p-6">
              {stats.recentBookings.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 bg-stone-50 rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-stone-900">{booking.guestName}</p>
                        <p className="text-sm text-stone-500">
                          {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-stone-900">
                          {formatCurrency(booking.totalAmount)}
                        </p>
                        <p className="text-sm text-stone-500">{booking.propertyName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-stone-500 text-center py-8">No recent bookings</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}