import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AdminSidebar } from "../../components/admin/admin-sidebar";

export const Route = createFileRoute("/_admin")({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/auth/login", search: { redirect: "/dashboard" } });
    }
    if (context.user.role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-stone-50">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
