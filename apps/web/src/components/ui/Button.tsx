import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary:
    "bg-indigo-500 text-white hover:bg-indigo-400 shadow-card ring-1 ring-inset ring-white/10",
  secondary:
    "bg-navy-800 text-navy-100 hover:bg-navy-700 border border-navy-700",
  ghost: "bg-transparent text-navy-300 hover:text-white hover:bg-navy-800",
  danger: "bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20",
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
        focus-visible:outline-2 focus-visible:outline-indigo-400 focus-visible:outline-offset-2
        disabled:opacity-40 disabled:pointer-events-none
        ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
);

Button.displayName = "Button";