interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const badgeVariants = {
  default: "bg-navy-700 text-navy-200",
  success: "bg-green-400/10 text-green-400",
  warning: "bg-yellow-400/10 text-yellow-400",
  danger: "bg-red-400/10 text-red-400",
  info: "bg-indigo-500/10 text-indigo-400",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
        ${badgeVariants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
