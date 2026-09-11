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
    <div className="flex min-h-screen items-center justify-center bg-field">
      <div className="flex flex-col items-center gap-4">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
        <p className="text-sm text-ink-faint">{label}</p>
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
  default: "bg-overpanel text-ink-muted",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
  warning: "bg-warning/10 text-warning",
};

export function StatCard({ label, value, icon, tint = "default" }: StatCardProps) {
  return (
    <div className="surface-card p-4">
      {icon ? (
        <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${tintIcon[tint]}`}>
          <Icon name={icon} size={18} />
        </div>
      ) : (
        <p className="eyebrow text-ink-muted">{label}</p>
      )}
      <p className="font-display text-2xl tracking-wide tabular-nums">{value}</p>
      {icon ? <p className="mt-0.5 eyebrow text-ink-muted">{label}</p> : null}
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
        <h1 className="font-display text-3xl font-normal uppercase tracking-wide sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-[15px] text-ink-muted">{subtitle}</p> : null}
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
      <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-overpanel text-ink-muted">
        <Icon name={icon} size={26} />
      </div>
      <p className="text-base font-semibold">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}