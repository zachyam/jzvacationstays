import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";

import { getProperties } from "../../server/functions/properties";
import { getCalendarBookings } from "../../server/functions/admin-calendar";
import { formatCurrency } from "../../lib/utils";

export const Route = createFileRoute("/_admin/calendar")({
  loader: async () => {
    try {
      const properties = await getProperties();
      const now = new Date();
      let initialData = null;

      if (properties.length > 0) {
        initialData = await getCalendarBookings({
          data: {
            propertyId: properties[0].id,
            year: now.getFullYear(),
            month: now.getMonth(),
          },
        });
      }

      return { properties, initialData };
    } catch {
      return { properties: [], initialData: null };
    }
  },
  component: AdminCalendarPage,
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const SOURCE_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; hover: string }> = {
  airbnb: { bg: "bg-rose-50", border: "border-rose-100", text: "text-rose-600", dot: "bg-rose-500", hover: "hover:border-rose-200" },
  vrbo: { bg: "bg-sky-50", border: "border-sky-100", text: "text-sky-600", dot: "bg-sky-500", hover: "hover:border-sky-200" },
  direct: { bg: "bg-stone-100", border: "border-stone-200", text: "text-stone-700", dot: "bg-stone-700", hover: "hover:border-stone-300" },
  hospitable: { bg: "bg-violet-50", border: "border-violet-100", text: "text-violet-600", dot: "bg-violet-500", hover: "hover:border-violet-200" },
};

function getSourceColors(source: string) {
  return SOURCE_COLORS[source] || SOURCE_COLORS.direct;
}

function getSourceIcon(source: string) {
  switch (source) {
    case "airbnb": return "solar:home-smile-linear";
    case "vrbo": return "solar:global-linear";
    case "hospitable": return "solar:server-linear";
    default: return "solar:link-linear";
  }
}

function AdminCalendarPage() {
  const { properties, initialData } = Route.useLoaderData();

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedPropertyId, setSelectedPropertyId] = useState(properties[0]?.id || "");
  const [calendarData, setCalendarData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedPropertyId) return;
    setLoading(true);
    getCalendarBookings({
      data: { propertyId: selectedPropertyId, year: currentYear, month: currentMonth },
    }).then((data) => {
      setCalendarData(data);
      setLoading(false);
    });
  }, [selectedPropertyId, currentMonth, currentYear]);

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  }

  function goToToday() {
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  }

  // Build calendar grid
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();

  // Build a map of date -> bookings for quick lookup
  const dateBookingMap = new Map<string, Array<{ guestName: string; source: string; isCheckout: boolean }>>();
  if (calendarData?.bookings) {
    for (const { booking } of calendarData.bookings) {
      const checkIn = new Date(booking.checkIn);
      const checkOut = new Date(booking.checkOut);
      const current = new Date(checkIn);
      while (current <= checkOut) {
        const dateStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
        if (!dateBookingMap.has(dateStr)) dateBookingMap.set(dateStr, []);
        const lastName = booking.guestName.split(" ");
        const shortName = `${lastName[0]} ${lastName.length > 1 ? lastName[1][0] + "." : ""}`;
        dateBookingMap.get(dateStr)!.push({
          guestName: current.getTime() === checkOut.getTime() ? "Checkout" : shortName,
          source: booking.source || "direct",
          isCheckout: current.getTime() === checkOut.getTime(),
        });
        current.setDate(current.getDate() + 1);
      }
    }
  }

  // Month's bookings for sidebar
  const monthBookings = calendarData?.bookings || [];

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-medium tracking-tight text-stone-900 mb-2">
            Property Calendar
          </h1>
          <p className="text-sm text-stone-500 font-light">
            Manage your bookings, availability, and guest details at a glance.
          </p>
        </div>

        <div className="relative w-full sm:w-auto flex-shrink-0">
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="appearance-none w-full sm:w-72 bg-white border border-stone-200 text-stone-900 text-sm font-medium rounded-2xl pl-4 pr-10 py-3 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all cursor-pointer shadow-[0_2px_10px_rgb(0,0,0,0.02)]"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <iconify-icon
            icon="solar:alt-arrow-down-linear"
            class="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none w-4 h-4"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-12">
        {/* Calendar Grid */}
        <div className="xl:col-span-8 flex flex-col">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-medium tracking-tight text-stone-900">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors shadow-sm"
              >
                <iconify-icon icon="solar:alt-arrow-left-linear" class="w-5 h-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-4 h-9 flex items-center justify-center rounded-xl border border-stone-200 bg-white text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors shadow-sm"
              >
                Today
              </button>
              <button
                onClick={nextMonth}
                className="w-9 h-9 flex items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:text-stone-900 hover:bg-stone-50 transition-colors shadow-sm"
              >
                <iconify-icon icon="solar:alt-arrow-right-linear" class="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-stone-200 rounded-3xl border border-stone-200 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col w-full overflow-x-auto">
            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-stone-50/80 border-b border-stone-200 min-w-[600px]">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="py-3 text-center text-xs font-medium uppercase tracking-widest text-stone-400"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-px bg-stone-200 min-w-[600px]">
              {/* Previous month padding */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div
                  key={`prev-${i}`}
                  className="bg-stone-50/50 min-h-[100px] lg:min-h-[120px] p-2 text-stone-400 opacity-60"
                >
                  <span className="text-sm font-medium p-1">
                    {prevMonthDays - firstDayOfWeek + i + 1}
                  </span>
                </div>
              ))}

              {/* Current month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayBookings = dateBookingMap.get(dateStr) || [];
                const isToday =
                  day === now.getDate() &&
                  currentMonth === now.getMonth() &&
                  currentYear === now.getFullYear();

                return (
                  <div
                    key={day}
                    className="bg-white min-h-[100px] lg:min-h-[120px] p-2 flex flex-col gap-1 transition-colors hover:bg-stone-50 cursor-pointer group"
                  >
                    <span
                      className={`text-sm font-medium p-1 ${
                        isToday
                          ? "text-sky-600 bg-sky-50 rounded-lg w-7 h-7 flex items-center justify-center"
                          : "text-stone-900 group-hover:text-sky-600 transition-colors"
                      }`}
                    >
                      {day}
                    </span>
                    {dayBookings.map((b, j) => {
                      const colors = getSourceColors(b.source);
                      return (
                        <div
                          key={j}
                          className={`w-full ${colors.bg} border ${colors.border} ${colors.text} text-xs font-medium px-2 py-1.5 rounded-md truncate flex items-center gap-1.5 shadow-sm`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} flex-shrink-0`} />
                          {b.guestName}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Next month padding */}
              {(() => {
                const totalCells = firstDayOfWeek + daysInMonth;
                const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
                return Array.from({ length: remaining }).map((_, i) => (
                  <div
                    key={`next-${i}`}
                    className="bg-stone-50/50 min-h-[100px] lg:min-h-[120px] p-2 text-stone-400 opacity-60"
                  >
                    <span className="text-sm font-medium p-1">{i + 1}</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center gap-6 px-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/20" />
              <span className="text-sm font-medium text-stone-600">Airbnb</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-sm shadow-sky-500/20" />
              <span className="text-sm font-medium text-stone-600">Vrbo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-stone-700 shadow-sm" />
              <span className="text-sm font-medium text-stone-600">Direct Booking</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-violet-500 shadow-sm shadow-violet-500/20" />
              <span className="text-sm font-medium text-stone-600">Hospitable</span>
            </div>
          </div>
        </div>

        {/* Right Side: Booking List */}
        <div className="xl:col-span-4 relative">
          <div className="xl:sticky xl:top-24 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-medium tracking-tight text-stone-900">
                {MONTHS[currentMonth]} Bookings
              </h2>
              <span className="text-xs font-medium bg-stone-200 text-stone-700 px-2 py-1 rounded-md">
                {monthBookings.length} Stay{monthBookings.length !== 1 ? "s" : ""}
              </span>
            </div>

            {monthBookings.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-[1.5rem] p-5 text-center">
                <p className="text-sm text-stone-400 font-light">
                  No bookings this month.
                </p>
              </div>
            ) : (
              monthBookings.map(({ booking }) => {
                const colors = getSourceColors(booking.source || "direct");
                return (
                  <div
                    key={booking.id}
                    className={`bg-white border border-stone-200 rounded-[1.5rem] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] ${colors.hover} transition-all cursor-pointer group`}
                  >
                    <div className="flex items-start justify-between mb-4 border-b border-stone-100 pb-4">
                      <div>
                        <h3 className={`text-lg font-medium text-stone-900 group-hover:${colors.text} transition-colors`}>
                          {booking.guestName}
                        </h3>
                        <p className="text-sm font-light text-stone-500 mt-0.5">
                          {new Date(booking.checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" - "}
                          {new Date(booking.checkOut).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl ${colors.bg} ${colors.text} text-xs font-medium border ${colors.border}/50`}>
                        <iconify-icon icon={getSourceIcon(booking.source || "direct")} class="w-4 h-4" />
                        {(booking.source || "direct").charAt(0).toUpperCase() + (booking.source || "direct").slice(1)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-xs uppercase tracking-widest text-stone-400 mb-1">
                          Guests
                        </span>
                        <span className="block text-sm font-medium text-stone-900 flex items-center gap-1.5">
                          <iconify-icon icon="solar:users-group-rounded-linear" class="text-stone-400" />
                          {booking.guestsCount} Guest{booking.guestsCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-widest text-stone-400 mb-1">
                          Total Payout
                        </span>
                        <span className="block text-sm font-medium text-emerald-600 flex items-center gap-1.5">
                          <iconify-icon icon="solar:wallet-linear" class="text-emerald-500" />
                          {formatCurrency(booking.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
