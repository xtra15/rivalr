export function LiveBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1 ${className}`}
    >
      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-volt" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-volt">Live</span>
    </span>
  );
}