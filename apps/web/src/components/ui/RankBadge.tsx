import { Icon } from "./Icon";

export function RankBadge({ rank, className = "" }: { rank: number; className?: string }) {
  const styles =
    rank === 0
      ? "bg-volt text-field shadow-card"
      : rank === 1
        ? "bg-silver/15 text-silver ring-silver/30"
        : rank === 2
          ? "bg-bronze/15 text-bronze ring-bronze/30"
          : "bg-overpanel text-ink-muted ring-line-strong";

  return (
    <div
      aria-label={rank === 0 ? "Rank 1" : `Rank ${rank + 1}`}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm tabular-nums ring-1 ${styles} ${className}`}
    >
      {rank === 0 ? <Icon name="crown" size={16} strokeWidth={2.25} /> : rank + 1}
    </div>
  );
}