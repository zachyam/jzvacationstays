import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";

import { sendOtp } from "../../server/functions/auth";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/login" });
  const redirectTo = (search as any)?.redirect || "/";
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [showName, setShowName] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await sendOtp({
        data: { email, name: showName ? name : undefined },
      });

      if (result.needsName) {
        setShowName(true);
        setLoading(false);
        return;
      }

      if (!result.success) {
        setError("Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Admin users skip OTP and go directly to admin subdomain dashboard
      if (result.skipOtp) {
        // Get the current hostname to build admin URL
        const currentHost = window.location.hostname;
        const domain = currentHost.includes("localhost")
          ? "localhost:3001"
          : currentHost.split(".").slice(-2).join(".");

        // Redirect directly to admin subdomain dashboard
        const adminUrl = currentHost.includes("localhost")
          ? "http://localhost:3001/admin/dashboard"
          : `https://admin.${domain}/admin/dashboard`;

        window.location.href = adminUrl;
        return;
      }

      navigate({
        to: "/auth/verify",
        search: { email, isNewUser: result.isNewUser, name: showName ? name : undefined },
      });
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to send code. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-100 p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl p-8 shadow-2xl shadow-stone-800/10">
          <h1 className="text-3xl font-medium tracking-tight text-stone-900 mb-2">
            {showName ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-stone-500 font-light mb-8">
            {showName
              ? "Enter your name to get started."
              : "Enter your email and we'll send you a login code."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-stone-700 mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={showName}
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all disabled:opacity-60"
              />
            </div>

            {showName && (
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-stone-700 mb-1.5"
                >
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  autoFocus
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-stone-50 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? "Sending code..." : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
