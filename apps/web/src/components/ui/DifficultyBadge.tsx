import { DIFFICULTY_COLORS } from "@/utils/format";

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        DIFFICULTY_COLORS[difficulty] ?? "border-line bg-overpanel text-ink-muted"
      }`}
    >
      {difficulty}
    </span>
  );
}