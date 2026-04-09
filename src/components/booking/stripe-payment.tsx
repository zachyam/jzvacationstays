import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useState } from "react";

const stripePromise = loadStripe(
  (typeof window !== "undefined" &&
    (window as any).__STRIPE_PUBLISHABLE_KEY__) ||
    "",
);

function CheckoutForm({
  onSuccess,
  onProcessing
}: {
  onSuccess: () => void;
  onProcessing?: (processing: boolean) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError("");
    onProcessing?.(true);

    const { error: submitError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (submitError) {
      setError(submitError.message || "Payment failed");
      setLoading(false);
      onProcessing?.(false);
    } else {
      onProcessing?.(false);
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
      >
        {loading ? "Processing..." : !stripe ? "Loading payment..." : "Pay now"}
      </button>
    </form>
  );
}

export function StripePayment({
  clientSecret,
  onSuccess,
  onProcessing,
}: {
  clientSecret: string;
  onSuccess: () => void;
  onProcessing?: (processing: boolean) => void;
}) {
  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: "stripe" } }}
    >
      <CheckoutForm onSuccess={onSuccess} onProcessing={onProcessing} />
    </Elements>
  );
}
