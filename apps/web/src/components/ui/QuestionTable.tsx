import type { QuestionData } from "@rivalr/shared";

export function QuestionTable({
  table,
  className = "",
}: {
  table: QuestionData["table"];
  className?: string;
}) {
  if (!table || table.columns.length === 0) return null;
  return (
    <div className={`overflow-x-auto rounded-lg border border-line bg-panel ${className}`}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            {table.columns.map((col, i) => (
              <th
                key={i}
                className="whitespace-nowrap border-b border-line bg-panel-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 1 ? "bg-overpanel/40" : undefined}>
              {row.map((cell, ci) => (
                <td key={ci} className="whitespace-nowrap px-3 py-2 font-mono text-[13px] tabular-nums text-ink-soft">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
