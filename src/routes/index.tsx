import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { useAuth } from "../hooks/use-auth";
import { getProperties } from "../server/functions/properties";
import { logout } from "../server/functions/auth";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      const properties = await getProperties();
      return { properties };
    } catch {
      return { properties: [] };
    }
  },
  component: HomePage,
});

function HomePage() {
  const { properties } = Route.useLoaderData();
  const user = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate({ to: "/" });
  }

  // Map DB properties to display data, with fallbacks for hardcoded values
  const seaglass = properties.find((p) => p.slug === "seaglass-villa");
  const coral = properties.find((p) => p.slug === "coral-retreat");

  return (
    <main className="relative min-h-screen w-full overflow-hidden flex flex-col">
      {/* Background Image & Overlays */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?ixlib=rb-4.0.3&auto=format&fit=crop&w=2800&q=80"
          alt="Sunny family beach house"
          className="w-full h-full object-cover object-center opacity-90 scale-105"
        />
        <div className="absolute inset-0 bg-stone-900/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-stone-100/40 via-stone-100/10 to-stone-100/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-stone-100/70 via-stone-100/30 to-stone-100/10" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col min-h-screen w-full max-w-screen-2xl mx-auto p-6 md:p-10 lg:p-12">
        {/* Header */}
        <header className="flex items-center justify-between w-full">
          <Link
            to="/"
            className="text-3xl md:text-4xl font-semibold tracking-tighter text-stone-900 uppercase drop-shadow-md hover:opacity-80 transition-opacity duration-300"
          >
            JZ Vacation Stays
          </Link>

          <nav className="hidden md:flex items-center space-x-10">
            <Link
              to="/properties"
              className="text-lg text-stone-700 hover:text-stone-900 transition-colors duration-200"
            >
              Browse
            </Link>
            <Link
              to="/properties"
              className="text-lg text-stone-700 hover:text-stone-900 transition-colors duration-200"
            >
              Find stay
            </Link>
          </nav>

          <div className="flex items-center space-x-4 md:space-x-6">
            {user ? (
              <>
                {user.role === "admin" && (
                  <Link
                    to="/admin/dashboard"
                    className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors hidden md:block"
                  >
                    Admin
                  </Link>
                )}
                <Link
                  to="/account"
                  className="flex items-center gap-2 group"
                >
                  <div className="w-9 h-9 rounded-full bg-white/60 backdrop-blur-md border border-white/50 shadow-sm text-stone-700 flex items-center justify-center font-medium text-xs group-hover:bg-white/80 transition-colors duration-200">
                    {(user.name || user.email).slice(0, 2).toUpperCase()}
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2.5 rounded-full bg-stone-200/80 hover:bg-stone-300/80 backdrop-blur-md text-stone-900 text-sm font-medium transition-all duration-200"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <button
                  className="p-3 rounded-full bg-white/40 hover:bg-white/70 backdrop-blur-md transition-all duration-200 text-stone-800 border border-white/50 flex items-center justify-center shadow-sm"
                  aria-label="Share"
                >
                  <iconify-icon icon="solar:share-linear" class="text-xl" />
                </button>
                <Link
                  to="/auth/login"
                  className="px-7 py-3 rounded-full bg-stone-900/90 hover:bg-stone-800 backdrop-blur-md text-white text-lg font-medium transition-all duration-200 border border-transparent shadow-xl shadow-stone-900/10"
                >
                  Log in
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Main Split Layout */}
        <div className="flex-grow flex flex-col lg:flex-row items-center justify-between w-full gap-12 mt-12 lg:mt-0">
          {/* Left Side: Hero Text & CTA */}
          <div className="max-w-xl w-full flex flex-col gap-8">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight text-stone-900 leading-[1.05] drop-shadow-sm">
              Feel at home
              <br />
              <span className="font-light italic text-sky-600/90">
                by the ocean
              </span>
            </h1>

            <div className="space-y-4 max-w-md drop-shadow-sm">
              <p className="text-lg text-stone-700 leading-relaxed font-light">
                Find spaces for fun, connection, and unforgettable family moments
                under the Florida sun.
              </p>
              <p className="text-lg text-stone-600 font-light">
                Experience our family-friendly coastal retreats.
              </p>
            </div>

            <div className="pt-2">
              <Link
                to="/properties"
                className="inline-block px-8 py-4 bg-sky-600/85 backdrop-blur-sm border border-sky-500/20 text-white text-lg font-medium rounded-full hover:bg-sky-600 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl shadow-sky-600/20"
              >
                Plan your family trip
              </Link>
            </div>
          </div>

          {/* Right Side: Properties */}
          <div className="w-full lg:w-auto max-w-xl flex flex-col gap-6">
            <h2 className="text-base font-medium tracking-widest uppercase text-stone-700 mb-2 ml-2 drop-shadow-sm">
              Our Properties
            </h2>

            <HeroPropertyCard
              slug={seaglass?.slug || "seaglass-villa"}
              name={seaglass?.name || "Seaglass Villa"}
              tagline={`${seaglass?.tagline || "Oceanfront"} • ${seaglass?.maxGuests || 8} Guests`}
              highlight={seaglass?.highlight || "Family favorite"}
              highlightColor="bg-emerald-500/90 shadow-emerald-500/50"
              imageUrl="https://images.unsplash.com/photo-1519046904884-53103b34b206?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
              imageAlt="Family on the beach"
            />

            <HeroPropertyCard
              slug={coral?.slug || "coral-retreat"}
              name={coral?.name || "Coral Retreat"}
              tagline={`${coral?.tagline || "Private Pool"} • ${coral?.maxGuests || 4} Guests`}
              highlight={coral?.highlight || "Kid-friendly pool"}
              highlightColor="bg-sky-500/90 shadow-sky-500/50"
              imageUrl="https://images.unsplash.com/photo-1572331165267-854da2b10ccc?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
              imageAlt="Sunny pool area"
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function HeroPropertyCard({
  slug,
  name,
  tagline,
  highlight,
  highlightColor,
  imageUrl,
  imageAlt,
}: {
  slug: string;
  name: string;
  tagline: string;
  highlight: string;
  highlightColor: string;
  imageUrl: string;
  imageAlt: string;
}) {
  return (
    <Link
      to="/properties/$propertyId"
      params={{ propertyId: slug }}
      className="group flex items-center gap-6 p-6 bg-white/85 hover:bg-white/95 backdrop-blur-2xl border border-white/80 rounded-[2rem] transition-all duration-300 cursor-pointer shadow-2xl shadow-stone-800/15"
    >
      <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-2xl overflow-hidden flex-shrink-0 relative shadow-inner">
        <img
          src={imageUrl}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
          alt={imageAlt}
        />
        <div className="absolute inset-0 bg-stone-900/5 group-hover:bg-transparent transition-colors duration-300" />
      </div>
      <div className="flex flex-col flex-grow justify-center py-1">
        <h3 className="text-2xl sm:text-3xl font-medium tracking-tight text-stone-900 mb-1">
          {name}
        </h3>
        <p className="text-lg text-stone-500 font-light">{tagline}</p>
        <div className="flex items-center gap-2 mt-4">
          <span
            className={`w-2.5 h-2.5 rounded-full shadow-sm ${highlightColor}`}
          />
          <span className="text-base text-stone-600 font-medium">
            {highlight}
          </span>
        </div>
      </div>
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-stone-200 flex items-center justify-center text-stone-400 group-hover:bg-sky-600 group-hover:border-transparent group-hover:text-white group-hover:shadow-lg group-hover:shadow-sky-600/30 group-hover:scale-105 transition-all duration-300 flex-shrink-0 mr-1">
        <iconify-icon
          icon="solar:arrow-right-up-linear"
          class="text-2xl sm:text-3xl"
        />
      </div>
    </Link>
  );
}
