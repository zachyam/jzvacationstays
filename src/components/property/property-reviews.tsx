import { formatDate } from "../../lib/utils";

type Review = {
  id: string;
  guestName: string;
  rating: number;
  comment: string | null;
  source: string;
  stayDate: string | null;
};

export function PropertyReviews({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <div>
        <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-stone-900 mb-6">
          Reviews
        </h2>
        <p className="text-lg text-stone-400 font-light">No reviews yet.</p>
      </div>
    );
  }

  const avgRating =
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div>
      <div className="flex items-baseline gap-4 mb-8">
        <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-stone-900">
          Reviews
        </h2>
        <div className="flex items-center gap-2 text-lg text-stone-500 font-light">
          <span className="text-amber-400 text-xl">★</span>
          <span>{avgRating.toFixed(1)}</span>
          <span className="text-stone-300">·</span>
          <span>
            {reviews.length} review{reviews.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reviews.map((review) => (
          <div
            key={review.id}
            className="p-6 bg-white border border-stone-200 rounded-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 font-medium text-sm">
                  {review.guestName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span className="font-medium text-stone-900 block">
                    {review.guestName}
                  </span>
                  {review.stayDate && (
                    <span className="text-xs text-stone-400">
                      {formatDate(review.stayDate)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={
                      i < review.rating ? "text-amber-400" : "text-stone-200"
                    }
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            {review.comment && (
              <p className="text-stone-600 font-light leading-relaxed">
                {review.comment}
              </p>
            )}
            <span className="inline-block text-xs px-2 py-0.5 bg-stone-100 rounded-full text-stone-500 capitalize">
              {review.source}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
