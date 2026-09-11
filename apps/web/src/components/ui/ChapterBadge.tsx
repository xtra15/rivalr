export function ChapterBadge({
  form,
  chapterNum,
  chapterName,
  className = "",
}: {
  form: number;
  chapterNum: number;
  chapterName?: string;
  className?: string;
}) {
  return (
    <span
      title={chapterName}
      className={`inline-flex items-center rounded-md border border-line bg-panel px-2 py-0.5 text-[11px] font-medium text-ink-muted ${className}`}
    >
      F{form} · Ch {chapterNum}
    </span>
  );
}