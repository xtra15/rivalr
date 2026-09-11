import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary: "bg-accent text-white hover:bg-accent-hover shadow-card",
  secondary: "bg-surface text-ink hover:bg-wash border border-line-strong",
  ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-wash",
  danger: "bg-danger/10 text-danger hover:bg-danger/15 border border-danger/25",
};

const sizes = {
  sm: "px-3.5 py-2 text-[13px] min-h-9",
  md: "px-5 py-2.5 text-sm min-h-11",
  lg: "px-7 py-3.5 text-base min-h-12",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150
        active:scale-[0.98] select-none
        focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2
        disabled:opacity-40 disabled:pointer-events-none
        ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
);

Button.displayName = "Button";