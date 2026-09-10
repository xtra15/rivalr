import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const badgeVariants = {
  default: "bg-navy-800 text-navy-300 border border-navy-700",
  success: "bg-signal-success/10 text-signal-success border border-signal-success/20",
  warning: "bg-signal-warning/10 text-signal-warning border border-signal-warning/20",
  danger: "bg-signal-danger/10 text-signal-danger border border-signal-danger/20",
  info: "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium
        ${badgeVariants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}