import { createFileRoute } from "@tanstack/react-router";

import {
  getAdminReviews,
  toggleReviewVisibility,
} from "../../server/functions/admin-reviews";

export const Route = createFileRoute("/admin/reviews")({
  loader: async () => {
    try {
      return { reviews: await getAdminReviews() };
    } catch {
      return { reviews: [] };
    }
  },
  component: ReviewsPage,
});

function ReviewsPage() {
  const { reviews } = Route.useLoaderData();

  async function handleToggle(reviewId: string, isVisible: boolean) {
    await toggleReviewVisibility({ data: { reviewId, isVisible } });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium text-stone-900">Reviews</h1>
        <p className="text-stone-500 text-sm mt-1">
          Moderate guest reviews across properties.
        </p>
      </div>

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-xl p-8 text-center text-stone-400">
            No reviews yet.
          </div>
        ) : (
          reviews.map(({ review, propertyName }) => (
            <div
              key={review.id}
              className={`bg-white border rounded-xl p-5 ${
                review.isVisible
                  ? "border-stone-200"
                  : "border-red-200 bg-red-50/30"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium text-stone-900">
                      {review.guestName}
                    </span>
                    <span className="text-xs text-stone-400">
                      {propertyName}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                      {review.source}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={
                          i < review.rating
                            ? "text-amber-400"
                            : "text-stone-200"
                        }
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  {review.comment && (
                    <p className="text-sm text-stone-600">{review.comment}</p>
                  )}
                </div>
                <button
                  onClick={() => handleToggle(review.id, !review.isVisible)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    review.isVisible
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-green-100 text-green-700 hover:bg-green-200"
                  }`}
                >
                  {review.isVisible ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
