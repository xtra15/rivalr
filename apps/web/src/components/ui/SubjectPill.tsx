const SUBJECT_DOT: Record<string, string> = {
  Biology: "bg-subject-bio",
  Chemistry: "bg-subject-chem",
  Physics: "bg-subject-phys",
  "Additional Mathematics": "bg-subject-math",
};

export function SubjectPill({ subject, className = "" }: { subject: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-2 py-0.5 text-[11px] font-medium text-ink-soft ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${SUBJECT_DOT[subject] ?? "bg-ink-muted"}`} />
      {subject === "Additional Mathematics" ? "Add Math" : subject}
    </span>
  );
}