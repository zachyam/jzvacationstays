import { type ReactNode } from "react";
import { cn } from "../../lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    primary: "bg-sky-600 hover:bg-sky-700 text-white focus:ring-sky-500",
    secondary: "bg-stone-200 hover:bg-stone-300 text-stone-800 focus:ring-stone-500",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    ghost: "hover:bg-stone-100 text-stone-700 focus:ring-stone-500",
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {loading && (
        <div className="mr-2 animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
      )}
      {children}
    </button>
  );
}

// Specific preset components for common use cases
export function SubmitButton({ loading, loadingText, children, ...props }: Omit<ButtonProps, "variant"> & { loadingText?: string }) {
  return (
    <Button variant="primary" loading={loading} {...props}>
      {loading ? (loadingText || "Saving...") : children}
    </Button>
  );
}

export function DeleteButton({ loading, children, ...props }: Omit<ButtonProps, "variant">) {
  return (
    <Button variant="danger" loading={loading} {...props}>
      {loading ? "Deleting..." : children}
    </Button>
  );
}

export function LoadingButton({ loading, loadingText, children, ...props }: ButtonProps & { loadingText?: string }) {
  return (
    <Button loading={loading} {...props}>
      {loading ? (loadingText || "Loading...") : children}
    </Button>
  );
}