import { Link, useMatchRoute } from "@tanstack/react-router";

const NAV_ITEMS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "solar:chart-square-linear" },
  { to: "/admin/calendar", label: "Calendar", icon: "solar:calendar-linear" },
  { to: "/admin/bookings", label: "Bookings", icon: "solar:clipboard-list-linear" },
  { to: "/admin/reviews", label: "Reviews", icon: "solar:star-linear" },
  { to: "/admin/calendar-sync", label: "Calendar Sync", icon: "solar:refresh-linear" },
  { to: "/admin/checklists", label: "Checklists", icon: "solar:checklist-minimalistic-linear" },
  { to: "/admin/thermostat", label: "Thermostat", icon: "solar:temperature-linear" },
] as const;

export function AdminSidebar() {
  const matchRoute = useMatchRoute();

  return (
    <aside className="w-64 bg-stone-900 text-white min-h-screen p-6 flex flex-col">
      <Link
        to="/"
        className="flex items-center gap-2 mb-8"
      >
        <div className="w-8 h-8 bg-white/10 text-white rounded-xl flex items-center justify-center shadow-sm">
          <iconify-icon icon="solar:buildings-linear" class="w-4 h-4" />
        </div>
        <span className="text-lg font-medium tracking-tight text-stone-300 hover:text-white transition-colors">
          JZ Vacation Stays
        </span>
      </Link>

      <p className="text-xs text-stone-500 uppercase tracking-wider mb-4 px-3">
        Admin
      </p>

      <nav className="space-y-1 flex-grow">
        {NAV_ITEMS.map((item) => {
          const isActive = matchRoute({ to: item.to, fuzzy: true });
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-stone-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <iconify-icon icon={item.icon} width="20" height="20" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-stone-800 mt-4">
        <Link
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 text-sm text-stone-500 hover:text-stone-300 transition-colors"
        >
          <iconify-icon icon="solar:home-linear" width="20" height="20" />
          Back to site
        </Link>
      </div>
    </aside>
  );
}
