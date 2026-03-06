import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { verifyOtp } from "../../server/functions/auth";

type VerifySearch = {
  email: string;
  isNewUser?: boolean;
  name?: string;
  redirect?: string;
};

export const Route = createFileRoute("/auth/verify")({
  validateSearch: (search: Record<string, unknown>): VerifySearch => ({
    email: (search.email as string) || "",
    isNewUser: search.isNewUser === true,
    name: search.name as string | undefined,
    redirect: search.redirect as string | undefined,
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const { email, name, redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await verifyOtp({ data: { email, code, name } });

      if (!result.success) {
        setError(result.error || "Verification failed");
        setLoading(false);
        return;
      }

      navigate({ to: redirect || "/" });
    } catch {
      setError("Verification failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-100 p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl p-8 shadow-2xl shadow-stone-800/10">
          <h1 className="text-3xl font-medium tracking-tight text-stone-900 mb-2">
            Check your email
          </h1>
          <p className="text-stone-500 font-light mb-8">
            We sent a 6-digit code to{" "}
            <span className="font-medium text-stone-700">{email}</span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-stone-700 mb-1.5"
              >
                Verification code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 text-center text-2xl tracking-[0.5em] font-medium placeholder:text-stone-300 placeholder:tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>
          </form>

          <p className="text-sm text-stone-400 text-center mt-6">
            Didn't receive a code?{" "}
            <button
              onClick={() => navigate({ to: "/auth/login" })}
              className="text-sky-600 hover:text-sky-700 font-medium"
            >
              Try again
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
