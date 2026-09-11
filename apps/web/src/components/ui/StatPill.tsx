interface StatPillProps {
  value: string;
  label: string;
  className?: string;
}

export function StatPill({ value, label, className = "" }: StatPillProps) {
  return (
    <div
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-panel px-3 ${className}`}
    >
      <span className="font-mono text-sm font-medium tabular-nums text-ink">{value}</span>
      <span className="text-[11px] font-medium text-ink-muted">{label}</span>
    </div>
  );
}