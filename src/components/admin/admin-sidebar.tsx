import { Link, useMatchRoute } from "@tanstack/react-router";
import { useEffect } from "react";

const NAV_ITEMS = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "solar:chart-square-linear" },
  { to: "/admin/listings", label: "Listings", icon: "solar:home-smile-linear" },
  { to: "/admin/calendar", label: "Calendar", icon: "solar:calendar-linear" },
  { to: "/admin/bookings", label: "Bookings", icon: "solar:clipboard-list-linear" },
  { to: "/admin/reviews", label: "Reviews", icon: "solar:star-linear" },
  { to: "/admin/calendar-sync", label: "Calendar Sync", icon: "solar:refresh-linear" },
  { to: "/admin/checklists", label: "Checklists", icon: "solar:checklist-minimalistic-linear" },
  { to: "/admin/inspections", label: "Inspections", icon: "solar:document-text-linear" },
  { to: "/admin/thermostat", label: "Thermostat", icon: "solar:temperature-linear" },
] as const;

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const matchRoute = useMatchRoute();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 lg:w-64 bg-stone-900 text-white
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          p-6 flex flex-col
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <iconify-icon icon="solar:close-circle-linear" width="24" height="24" />
        </button>

        <Link
          to="/"
          className="flex items-center gap-2 mb-8"
          onClick={onClose}
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

        <nav className="space-y-1 flex-grow overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = matchRoute({ to: item.to, fuzzy: true });
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
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
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-stone-500 hover:text-stone-300 transition-colors"
          >
            <iconify-icon icon="solar:home-linear" width="20" height="20" />
            Back to site
          </Link>
        </div>
      </aside>
    </>
  );
}