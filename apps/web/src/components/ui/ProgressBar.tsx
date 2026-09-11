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
  color = "bg-volt",
  showLabel = false,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const blocks = Math.min(Math.max(Math.round(max), 1), 20);
  const filled = Math.round(pct * blocks);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="flex flex-1 gap-1"
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {Array.from({ length: blocks }).map((_, i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-[2px] transition-colors duration-300 ${
              i < filled ? color : "bg-overpanel"
            }`}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-xs tabular-nums text-ink-muted">
          {value}/{max}
        </span>
      )}
    </div>
  );
}