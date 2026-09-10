import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

export function LoadingScreen({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900">
      <div className="flex flex-col items-center gap-4">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-navy-700 border-t-indigo-400" />
        <p className="text-sm text-navy-500">{label}</p>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: IconName;
  tint?: "default" | "accent" | "success" | "danger" | "warning";
}

const tintIcon = {
  default: "bg-navy-800 text-navy-300",
  accent: "bg-indigo-500/15 text-indigo-300",
  success: "bg-signal-success/15 text-signal-success",
  danger: "bg-signal-danger/15 text-signal-danger",
  warning: "bg-signal-warning/15 text-signal-warning",
};

export function StatCard({ label, value, icon, tint = "default" }: StatCardProps) {
  return (
    <div className="surface-card p-4">
      {icon ? (
        <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${tintIcon[tint]}`}>
          <Icon name={icon} size={18} />
        </div>
      ) : (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-navy-400">{label}</p>
      )}
      <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      {icon ? <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-navy-400">{label}</p> : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-[15px] text-navy-400">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-800 text-navy-400">
        <Icon name={icon} size={26} />
      </div>
      <p className="text-base font-semibold">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-navy-400">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}