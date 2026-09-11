interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  color?: string;
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max,
  className = "",
  color = "bg-accent",
  showLabel = false,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {showLabel && (
        <span className="text-xs tabular-nums text-navy-400">
          {value}/{max}
        </span>
      )}
    </div>
  );
}