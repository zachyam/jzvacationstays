import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { AdminSidebar } from "../../components/admin/admin-sidebar";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/auth/login", search: { redirect: "/admin/dashboard" } });
    }
    if (context.user.role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-stone-50">
      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex-1 flex flex-col">
        <header className="lg:hidden bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Open menu"
          >
            <iconify-icon icon="solar:hamburger-menu-linear" width="24" height="24" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-stone-900 text-white rounded-lg flex items-center justify-center">
              <iconify-icon icon="solar:buildings-linear" width="14" height="14" />
            </div>
            <span className="text-sm font-medium text-stone-900">JZ Admin</span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
