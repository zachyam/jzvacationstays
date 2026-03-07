import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";

import type { AuthUser } from "../hooks/use-auth";
import { getSession } from "../server/functions/auth";
import appCss from "../styles/global.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  user: AuthUser | null;
}>()({
  beforeLoad: async () => {
    try {
      const { user } = await getSession();
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
