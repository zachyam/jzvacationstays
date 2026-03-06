import { Link, useNavigate } from "@tanstack/react-router";

import { useAuth } from "../../hooks/use-auth";
import { logout } from "../../server/functions/auth";
import { cn } from "../../lib/utils";

type HeaderProps = {
  variant?: "default" | "transparent";
};

export function Header({ variant = "default" }: HeaderProps) {
  const user = useAuth();
  const navigate = useNavigate();
  const isTransparent = variant === "transparent";

  async function handleLogout() {
    await logout();
    navigate({ to: "/" });
  }

  return (
    <header
      className={cn(
        "flex items-center justify-between w-full",
        isTransparent &&
          "absolute top-0 left-0 right-0 z-50 max-w-screen-2xl mx-auto p-6 md:p-10 lg:p-12",
      )}
    >
      <Link
        to="/"
        className={cn(
          "text-3xl md:text-4xl font-medium tracking-tighter uppercase drop-shadow-md hover:opacity-80 transition-opacity duration-300",
          isTransparent ? "text-white" : "text-stone-900 font-semibold",
        )}
      >
        JZ Vacation Stays
      </Link>

      <nav className="hidden md:flex items-center space-x-10">
        <Link
          to="/properties"
          className={cn(
            "text-lg transition-colors duration-200",
            isTransparent
              ? "text-stone-100 hover:text-white drop-shadow-sm font-light"
              : "text-stone-700 hover:text-stone-900",
          )}
        >
          Browse
        </Link>
        <Link
          to="/properties"
          className={cn(
            "text-lg transition-colors duration-200",
            isTransparent
              ? "text-stone-100 hover:text-white drop-shadow-sm font-light"
              : "text-stone-700 hover:text-stone-900",
          )}
        >
          Find stay
        </Link>
      </nav>

      <div className="flex items-center space-x-4 md:space-x-6">
        {user ? (
          <>
            {user.role === "admin" && (
              <Link
                to="/dashboard"
                className={cn(
                  "text-sm font-medium transition-colors duration-200 hidden md:block",
                  isTransparent
                    ? "text-white/80 hover:text-white"
                    : "text-stone-500 hover:text-stone-900",
                )}
              >
                Admin
              </Link>
            )}
            <Link
              to="/account"
              className="flex items-center gap-2 group"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full border shadow-sm flex items-center justify-center font-medium text-xs transition-colors duration-200",
                  isTransparent
                    ? "bg-white/10 border-white/20 text-white group-hover:bg-white/20"
                    : "bg-white border-stone-200 text-stone-700 group-hover:border-stone-300",
                )}
              >
                {(user.name || user.email).slice(0, 2).toUpperCase()}
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200",
                isTransparent
                  ? "bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20"
                  : "bg-stone-200 hover:bg-stone-300 text-stone-900",
              )}
            >
              Log out
            </button>
          </>
        ) : (
          <Link
            to="/auth/login"
            className={cn(
              "px-7 py-3 rounded-full text-lg font-medium transition-all duration-200 shadow-xl",
              isTransparent
                ? "bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20"
                : "bg-stone-900/90 hover:bg-stone-800 backdrop-blur-md text-white border border-transparent shadow-stone-900/10",
            )}
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
