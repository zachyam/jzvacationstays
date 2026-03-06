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
