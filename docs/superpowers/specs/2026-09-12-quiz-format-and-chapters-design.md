---
title: "Quiz Format Fixes + Chapter Corrections"
date: 2026-09-12
scope: "KSSM chapter data, question prompt/table support, options grid, KV cache"
---

# Quiz Format + Chapter Corrections — Design Spec

## Summary

Three user-reported issues in the quiz experience:
1. Questions promise diagrams ("Study the diagram below…") that never render.
2. Option text bakes in A/B/C/D prefixes, duplicating the UI's own letter badges.
3. KSSM chapter lists in `CHAPTERS` are wrong — several chapters are missing, misnamed, or from the old (pre-KSSM) syllabus.

This design fixes all three, adds structured data-table support, switches options to a 2×2 grid, and corrects every chapter list against the current KSSM syllabus.

---

## 1. No Images — Make Questions Self-Contained

**Why not images?** AI-generated diagrams hallucinate; curated image hosting doesn't exist yet; true image-gen costs storage and tokens. The honest, correct fix: no diagrams at all, ever.

**Prompt change (`apps/worker/src/lib/questions.ts`):**
- Model is **forbidden** from referencing "diagram", "figure", "image", or "Study the illustration".
- Model **may** describe a scenario in prose ("A student connected a resistor…", "Table 1 shows…").
- For any data-driven question, model fills an optional `table` field (structured JSON).

---

## 2. Structured Data Tables

New optional field on `QuestionData`:

```ts
table?: { columns: string[]; rows: string[][] };
```

**Prompt instructs:** when the question involves experiment results, measurements, rates, periodic data, or any tabular data, populate `table` and refer to it as "Table below shows…". The UI renders a real HTML table.

**Render rules (QuizScreen + Results):**
- `<table>` styled with the app's dark-theme tokens: `border-line`, `bg-panel-2` header, mono-spaced data cells.
- Maximum table size: 15 rows × 8 columns — larger outputs are rejected by `parseQuestions`.

---

## 3. Strip Letter Prefixes from Options

**Prompt instructs:** options must contain bare text only. No `A.`, `B)`, `(C)`, `D:` prefix.

**Defensive strip in `parseQuestions`:** regex strip leading `[A-D][\.\)\:]\s*` from each option string.

**Result:** UI letter badges (the `span` at `QuizScreen.tsx:267`) remain the sole source of the A/B/C/D label. No duplication.

---

## 4. Options → 2×2 Card Grid

Replace the vertical `<button>` list (`QuizScreen.tsx:230`) with a 2-column grid:

```tsx
<div className="grid grid-cols-2 gap-2.5">
  {options.map((opt, i) => (
    <button ...>
      <span className="...">{String.fromCharCode(65 + i)}</span>
      <FormulaText text={opt} ... />
    </button>
  ))}
</div>
```

On small screens (`<640px`), keep 1 column to avoid truncation; on `sm:` breakpoint, switch to 2 columns. Each card gets the same border/color logic as today; the letter badge stays as a small rounded-mark, same visual weight.

**Results.tsx review:** renders the question's `table` (if present) inline above the options. Options keep the current vertical lettered list — that's the only letter shown and the live-quiz duplication is what the user objected to.

---

## 5. KV Cache Bump

Key prefix changes from `q2:` to `q3:` in `apps/worker/src/routes/questions.ts:55`.

Old cached questions (with diagram lies, letter prefixes, no table field) stop being served. 7-day TTL means old entries auto-expire.

---

## 6. KSSM Chapter Corrections

All changes in `packages/shared/src/types.ts` `CHAPTERS` const:

### Biology Form 4 (13 → 15 chapters)
| # | Old | New |
|---|-----|-----|
| 2 | Cell Biology and Cell Organisation | Cell Biology and Organisation |
| 4 | Chemical Composition of the Cell | Chemical Composition in a Cell |
| 8 | Respiratory System in Humans and Animals | Respiratory Systems in Humans and Animals |
| 11 | Defence in Humans and Animals | Immunity in Humans |
| 12 | Dynamic Ecosystem | Coordination and Response in Humans |
| 13 | Endangered Ecosystem | Homeostasis and the Human Urinary System |
| 14 | — | Support and Movement in Humans and Animals |
| 15 | — | Sexual Reproduction, Development and Growth in Humans and Animals |

### Biology Form 5 (7 → 13 chapters)
| # | Old | New |
|---|-----|-----|
| 2 | Structure and Leaf Function | Leaf Structure and Function |
| 7 | Adaptation of Plants to the Environment | Adaptations of Plants in Different Habitats |
| 8–13 | — | Biodiversity; Ecosystem; Environmental Sustainability; Inheritance; Variation; Genetic Technology |

### Chemistry Form 4
| # | Old | New |
|---|-----|-----|
| 3 | Chemical Formulae and Equations | Mole Concept, Chemical Formulae and Equations |
| 6 | Electrochemistry | Acids, Bases and Salts |
| 7 | Acids, Bases and Salts | Rate of Reaction |

### Chemistry Form 5
| # | Old | New |
|---|-----|-----|
| 5 | Chemicals for Consumers | Consumer and Industrial Chemistry |

### Physics Form 4 (7 → 6 chapters)
| # | Old | New |
|---|-----|-----|
| 7 | Force and Pressure | *(removed — not in KSSM)* |

### Physics Form 5 — no change (confirmed correct).

### Additional Mathematics — no change (confirmed correct).

---

## 7. Landing Chapter Count

`apps/web/src/pages/Landing.tsx` line 15: update "47 chapters covered" → "72 chapters covered" (28 Bio + 13 Chem + 13 Phys + 18 AddMath).

---

## Out of Scope

- Real image hosting (R2/external) — no pipeline exists.
- AI image generation — storage cost + hallucination risk.
- Result format changes beyond adding table rendering.
- Shop item creation (user deferred).

---

## Files Touched

| File | Change |
|------|--------|
| `packages/shared/src/types.ts` | CHAPTERS rewrite; `QuestionData.table` |
| `apps/worker/src/lib/questions.ts` | Prompt rewrite + table in Question + `parseQuestions` strip |
| `apps/worker/src/routes/questions.ts` | KV key `q2:` → `q3:` |
| `apps/web/src/pages/QuizScreen.tsx` | Table rendering + 2×2 options grid |
| `apps/web/src/pages/Results.tsx` | Table rendering in review |
| `apps/web/src/pages/Landing.tsx` | Chapter count 47 → 72 |
