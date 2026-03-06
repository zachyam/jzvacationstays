import { Link } from "@tanstack/react-router";

type PropertyCardProps = {
  slug: string;
  name: string;
  tagline: string | null;
  maxGuests: number;
  highlight: string | null;
  coverImageUrl?: string;
};

export function PropertyCard({
  slug,
  name,
  tagline,
  maxGuests,
  highlight,
  coverImageUrl,
}: PropertyCardProps) {
  return (
    <Link
      to="/properties/$propertyId"
      params={{ propertyId: slug }}
      className="group flex flex-col bg-white/90 hover:bg-white backdrop-blur-xl border border-white/80 rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer shadow-xl shadow-stone-800/10 hover:shadow-2xl"
    >
      <div className="h-56 overflow-hidden relative">
        <img
          src={
            coverImageUrl ||
            "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=600&q=80"
          }
          alt={name}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-stone-900/5 group-hover:bg-transparent transition-colors duration-300" />
      </div>
      <div className="p-6">
        <h3 className="text-2xl font-medium tracking-tight text-stone-900 mb-1">
          {name}
        </h3>
        <p className="text-stone-500 font-light">
          {tagline} &bull; {maxGuests} Guests
        </p>
        {highlight && (
          <div className="flex items-center gap-2 mt-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500/90" />
            <span className="text-sm text-stone-600 font-medium">
              {highlight}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
