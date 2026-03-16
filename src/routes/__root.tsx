import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  redirect,
  Scripts,
} from "@tanstack/react-router";

import type { AuthUser } from "../hooks/use-auth";
import { getRedirectUrl, isAdminSubdomain } from "../lib/subdomain";
import { getSession } from "../server/functions/auth";
import appCss from "../styles/global.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  user: AuthUser | null;
}>()({
  beforeLoad: async ({ location }) => {
    try {
      const { user } = await getSession();

      // Only do subdomain checking on client side where we have access to window
      if (typeof window !== "undefined") {
        const hostname = window.location.hostname + (window.location.port ? `:${window.location.port}` : "");
        const isAdminDomain = isAdminSubdomain(hostname);

        // If on admin subdomain but accessing non-admin routes (except root which redirects separately)
        if (isAdminDomain && !location.pathname.startsWith("/admin") && location.pathname !== "/") {
          // Only redirect if it's not an admin-related path
          const nonAdminPaths = ["/properties", "/booking", "/auth/login"];
          if (nonAdminPaths.some(path => location.pathname.startsWith(path))) {
            window.location.href = getRedirectUrl(hostname, "www", location.pathname);
            return { user };
          }
        }

        // If on main domain but accessing admin route, redirect to admin subdomain
        if (!isAdminDomain && location.pathname.startsWith("/admin")) {
          window.location.href = getRedirectUrl(hostname, "app", location.pathname);
          return { user };
        }
      }

      return { user };
    } catch {
      return { user: null };
    }
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-medium text-stone-900 mb-4">404</h1>
        <p className="text-xl text-stone-600 mb-6">Page not found</p>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl transition-colors"
        >
          <iconify-icon icon="solar:home-linear" width="20" height="20" />
          Back to Home
        </a>
      </div>
    </div>
  ),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "JZ Vacation Stays" },
      {
        name: "description",
        content:
          "Family-friendly coastal vacation rentals in Florida. Book Seaglass Villa or Coral Retreat for your next getaway.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap",
      },
    ],
    scripts: [
      {
        src: "https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
