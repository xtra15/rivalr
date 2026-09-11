import { useMemo } from "react";
import katex from "katex";

interface FormulaTextProps {
  text: string;
  className?: string;
  display?: boolean;
}

function renderKaTeX(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true,
    });
  } catch {
    return tex;
  }
}

export function FormulaText({ text, className = "", display = false }: FormulaTextProps) {
  const html = useMemo(() => {
    if (!text) return "";
    const displayParts = text.split(/\$\$/);
    return displayParts
      .map((part, i) => {
        if (i % 2 === 1) return renderKaTeX(part.trim(), true);
        return part.replace(/\$([^$]+?)\$/g, (_, tex) => renderKaTeX(tex, false));
      })
      .join("");
  }, [text, display]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: display ? `<div>${html}</div>` : html }}
    />
  );
}