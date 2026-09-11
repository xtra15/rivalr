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
    return `<span class="text-danger text-xs">[formula error]</span>`;
  }
}

function processInline(text: string): string {
  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => renderKaTeX(tex.trim(), true))
    .replace(/\$([^\$]+?)\$/g, (_, tex) => renderKaTeX(tex.trim(), false))
    .replace(/\\\((.+?)\\\)/g, (_, tex) => renderKaTeX(tex.trim(), false))
    .replace(/\\\[[\s\S]*?\\\]/g, (match) => {
      const tex = match.slice(2, -2).trim();
      return renderKaTeX(tex, true);
    });
}

export function FormulaText({ text, className = "", display = false }: FormulaTextProps) {
  const html = useMemo(() => {
    if (!text) return "";
    return processInline(text);
  }, [text]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: display ? `<div>${html}</div>` : html }}
    />
  );
}