# Quiz Format + Chapter Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix quiz question rendering (no fake diagram references, real structured data tables, clean options without A/B/C/D prefixes, 2×2 options grid) and correct the KSSM chapter lists so every chapter is real, correctly named, and count-checked.

**Architecture:** The `Question`/`QuestionData` model gains an optional `table` field. The worker prompt is rewritten to (a) forbid diagram/figure/image references, (b) emit data-driven questions with a structured `table`, (c) require bare option text. `parseQuestions` defensively strips stray option-letter prefixes and normalizes/sizes table data. The UI renders a shared `QuestionTable` component in both the quiz screen and results review, and switches quiz options to a 2×2 card grid. `CHAPTERS` is rewritten to the verified KSSM lists.

**Tech Stack:** Cloudflare Worker (Gemini + Groq, KV cache), React + Vite + TypeScript web app, Tailwind tokens, shared `@rivalr/shared` types.

## Global Constraints

- No unit-test framework exists. Verification per task = repo-root `npm run typecheck --workspace=apps/web` (exit 0) and, where noted, `npm run build --workspace=apps/web`.
- Web deploy (repo root): `npx vercel deploy --prod --yes --scope xtra15s-projects` (the linked Vercel org is unauthorized; the personal `xtra15s-projects` scope works, alias `https://rivalr-phi.vercel.app`).
- Worker deploy: `npx wrangler deploy` run with working directory `apps/worker`.
- No comments in code unless asked. Follow existing file style (two-space indent, no semicolons, double quotes, trailing commas).
- Existing quiz attempts and any KV-cached questions are old-format and remain as-is; new quizzes get the new format (KV key bump in Task 3 makes the server regen).
- Options in the live quiz show letter badges ONLY from the UI (`String.fromCharCode(65 + i)`); the model must never include letters in option text.

---

### Task 1: Extend the question model with `table`

**Files:**
- Modify: `packages/shared/src/types.ts:49-55` (`QuestionData`)
- Modify: `apps/worker/src/lib/questions.ts:1-6` (`Question`)
- Modify: `apps/web/src/pages/QuizLobby.tsx:71-77` (attempt creation mapping)

**Interfaces:**
- Produces: `QuestionData.table?: { columns: string[]; rows: string[][] }` (shared type) and matching `Question.table` (worker type). `QuizLobby` passes `table` through into `questions_data`. Task 3 writes `table`; Tasks 4-5 render it.

- [ ] **Step 1: Add `table` to the worker `Question` interface**

In `apps/worker/src/lib/questions.ts`, replace lines 1-6:

```ts
export interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  table?: { columns: string[]; rows: string[][] };
}
```

- [ ] **Step 2: Add `table` to shared `QuestionData`**

In `packages/shared/src/types.ts`, replace lines 49-55:

```ts
export interface QuestionData {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  user_answer?: number;
  table?: { columns: string[]; rows: string[][] };
}
```

- [ ] **Step 3: Pass `table` through in `QuizLobby`**

In `apps/web/src/pages/QuizLobby.tsx`, replace lines 71-77:

```ts
        questions_data: data.questions.map((q) => ({
          question: q.question,
          options: q.options,
          correct: q.correct,
          explanation: q.explanation ?? "",
          user_answer: null,
          table: q.table,
        })),
```

- [ ] **Step 4: Typecheck**

Run (repo root): `npm run typecheck --workspace=apps/web`
Expected: exit 0 (optional `table` on both types keeps existing call sites valid).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/types.ts apps/worker/src/lib/questions.ts apps/web/src/pages/QuizLobby.tsx
git commit -m "feat: add optional structured table to question model"
```

---

### Task 2: Rewrite CHAPTERS to verified KSSM lists

**Files:**
- Modify: `packages/shared/src/types.ts:154-244` (the whole `CHAPTERS` const)

**Interfaces:**
- Produces: corrected chapter arrays consumed by `QuizLobby.tsx:27` (`CHAPTERS[subject][form]`), the worker's `chapter_name` param, and results/review. Task 6 updates the Landing count to match.

- [ ] **Step 1: Replace the entire `CHAPTERS` const**

Replace lines 154-244 with:

```ts
export const CHAPTERS: Record<Subject, Record<4 | 5, { number: number; name: string }[]>> = {
  Biology: {
    4: [
      { number: 1, name: "Introduction to Biology and Laboratory Rules" },
      { number: 2, name: "Cell Biology and Organisation" },
      { number: 3, name: "Movement of Substances across a Plasma Membrane" },
      { number: 4, name: "Chemical Composition in a Cell" },
      { number: 5, name: "Metabolism and Enzymes" },
      { number: 6, name: "Cell Division" },
      { number: 7, name: "Cellular Respiration" },
      { number: 8, name: "Respiratory Systems in Humans and Animals" },
      { number: 9, name: "Nutrition and the Human Digestive System" },
      { number: 10, name: "Transport in Humans and Animals" },
      { number: 11, name: "Immunity in Humans" },
      { number: 12, name: "Coordination and Response in Humans" },
      { number: 13, name: "Homeostasis and the Human Urinary System" },
      { number: 14, name: "Support and Movement in Humans and Animals" },
      { number: 15, name: "Sexual Reproduction, Development and Growth in Humans and Animals" },
    ],
    5: [
      { number: 1, name: "Organisation of Plant Tissues and Growth" },
      { number: 2, name: "Leaf Structure and Function" },
      { number: 3, name: "Nutrition in Plants" },
      { number: 4, name: "Transport in Plants" },
      { number: 5, name: "Response in Plants" },
      { number: 6, name: "Sexual Reproduction in Flowering Plants" },
      { number: 7, name: "Adaptations of Plants in Different Habitats" },
      { number: 8, name: "Biodiversity" },
      { number: 9, name: "Ecosystem" },
      { number: 10, name: "Environmental Sustainability" },
      { number: 11, name: "Inheritance" },
      { number: 12, name: "Variation" },
      { number: 13, name: "Genetic Technology" },
    ],
  },
  Chemistry: {
    4: [
      { number: 1, name: "Introduction to Chemistry" },
      { number: 2, name: "Matter and Atomic Structure" },
      { number: 3, name: "Mole Concept, Chemical Formulae and Equations" },
      { number: 4, name: "Periodic Table of Elements" },
      { number: 5, name: "Chemical Bonds" },
      { number: 6, name: "Acids, Bases and Salts" },
      { number: 7, name: "Rate of Reaction" },
      { number: 8, name: "Manufactured Substances in Industry" },
    ],
    5: [
      { number: 1, name: "Redox Equilibrium" },
      { number: 2, name: "Carbon Compound" },
      { number: 3, name: "Thermochemistry" },
      { number: 4, name: "Polymer" },
      { number: 5, name: "Consumer and Industrial Chemistry" },
    ],
  },
  Physics: {
    4: [
      { number: 1, name: "Measurement" },
      { number: 2, name: "Force and Motion I" },
      { number: 3, name: "Gravitation" },
      { number: 4, name: "Heat" },
      { number: 5, name: "Waves" },
      { number: 6, name: "Light and Optics" },
    ],
    5: [
      { number: 1, name: "Force and Motion II" },
      { number: 2, name: "Pressure" },
      { number: 3, name: "Electricity" },
      { number: 4, name: "Electromagnetism" },
      { number: 5, name: "Electronics" },
      { number: 6, name: "Nuclear Physics" },
      { number: 7, name: "Quantum Physics" },
    ],
  },
  "Additional Mathematics": {
    4: [
      { number: 1, name: "Functions" },
      { number: 2, name: "Quadratic Functions" },
      { number: 3, name: "Systems of Equations" },
      { number: 4, name: "Indices, Surds and Logarithms" },
      { number: 5, name: "Progressions" },
      { number: 6, name: "Linear Law" },
      { number: 7, name: "Coordinate Geometry" },
      { number: 8, name: "Vectors" },
      { number: 9, name: "Solution of Triangles" },
      { number: 10, name: "Index Numbers" },
    ],
    5: [
      { number: 1, name: "Circular Measure" },
      { number: 2, name: "Differentiation" },
      { number: 3, name: "Integration" },
      { number: 4, name: "Permutations and Combinations" },
      { number: 5, name: "Probability Distributions" },
      { number: 6, name: "Trigonometric Functions" },
      { number: 7, name: "Linear Programming" },
      { number: 8, name: "Kinematics of Linear Motion" },
    ],
  },
};
```

Note: `Additional Mathematics` stays byte-identical; Physics 5 stays identical.

- [ ] **Step 2: Sanity-check totals**

Counts after this task: Biology 15+13=28, Chemistry 8+5=13, Physics 6+7=13, AddMath 10+8=18 → **72 chapters**. Confirm `CHAPTERS.Biology[4].length === 15`, `CHAPTERS.Biology[5].length === 13`, `CHAPTERS.Physics[4].length === 6`.

- [ ] **Step 3: Typecheck**

Run (repo root): `npm run typecheck --workspace=apps/web`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "fix: correct KSSM chapter lists for biology, chemistry, physics"
```

---

### Task 3: Rewrite worker prompt + defensive `parseQuestions` + KV bump

**Files:**
- Modify: `apps/worker/src/lib/questions.ts` (`buildPrompt` + `parseQuestions`)
- Modify: `apps/worker/src/routes/questions.ts:55` (KV key)

**Interfaces:**
- Consumes: `Question.table` from Task 1.
- Produces: `buildPrompt(params)` — the prompt that forbids diagram references, requires bare options, and requests a structured `table`; `parseQuestions(text): Question[]` — strips option letter prefixes and normalizes/sizes tables. Task 4/5 consume the emitted `table` shape.

- [ ] **Step 1: Replace `buildPrompt`**

Replace the `buildPrompt` function (lines 8-62) with:

```ts
export function buildPrompt(params: {
  subject: string;
  form: number;
  chapter_number: number;
  chapter_name: string;
  difficulty: string;
  count: number;
}): string {
  return `You are an expert SPM (Sijil Pelajaran Malaysia) examiner for ${params.subject}.
Generate ${params.count} multiple choice questions for Form ${params.form}, Chapter ${params.chapter_number}: ${params.chapter_name}, at difficulty level "${params.difficulty}".

Difficulty definitions:
- Easy: Recall and basic understanding (Bloom's Level 1-2)
- Medium: Application and analysis (Bloom's Level 3-4)
- Hard: Synthesis and evaluation (Bloom's Level 5-6)
- KBAT: Higher Order Thinking — complex multi-step scenarios, real-world application, data interpretation

CRITICAL FORMATTING RULES:
- Use KaTeX LaTeX delimiters for ALL scientific notation, formulas, chemical equations, and mathematical expressions.
- Inline formulas: wrap in single dollar signs, e.g. $CO_2$, $F = ma$, $\\Delta G = -237\\,\\text{kJ/mol}$.
- Display (standalone) formulas: wrap in double dollar signs, e.g. $$2H_2 + O_2 \\rightarrow 2H_2O$$.
- Chemical subscripts use underscore: $H_2O$, $C_6H_{12}O_6$, $Ca^{2+}$.
- Chemical superscripts (ions) use caret: $Na^+$, $Fe^{3+}$, $SO_4^{2-}$.
- Arrows in equations: use \\rightarrow.
- Scientific notation: $3.0 \\times 10^8$.
- Greek letters: use \\alpha, \\beta, \\gamma, \\theta, \\lambda, etc.
- Units: use \\text{...} inside math mode, e.g. $100\\,\\text{mL}$, $37^\\circ\\text{C}$.

DATA TABLES:
- If the question involves any data (experiment results, measurements, rates, periodic data, class records, etc.), provide the data in the optional "table" field and reference it in the question as "Table below shows...".
- "table" shape: { "columns": ["heading1", "heading2"], "rows": [["value", "value"], ["value", "value"]] }.
- Max 8 columns and 15 rows. Use plain text inside cells (no LaTeX).
- Never describe the data in prose when a table fits — put it in "table".
- If the question has no data, omit the "table" field entirely.

NEVER REFERENCE IMAGES:
- It is forbidden to write "diagram", "figure", "illustration", "image", "pictured below", "as shown in the diagram", or any reference to a visual that is not actually present.
- There are NO images in this quiz. Any reference to one is an ERROR.
- Describe apparatus and setups in prose instead, e.g. "A student connected a battery, a switch and a resistor in series."

SPM EXAM STYLE:
- Frame questions around Malaysian context where relevant (e.g. local flora, rivers, industries, food).
- Use scenario-based stems: "A student conducted an experiment...", "Table below shows...", "A trolley of mass 2 kg...".
- Each question should test understanding, not just memorization.
- Explanations should reference the specific concept or principle tested.

Rules:
- Questions must be accurate and strictly aligned to the Malaysian SPM syllabus.
- Cover a variety of subtopics within the chapter — do not repeat the same concept.
- Each question must have exactly 4 options.
- Options contain BARE text only — never prefix them with "A.", "B)", "(C)", or "D:".
- Only one option is correct. The other three must be plausible distractors.
- Provide a brief explanation (1-2 sentences) for why the correct answer is right.
- Include the "table" field only when the question needs data.
- Do not repeat questions or options.
- Return ONLY a valid JSON array, no markdown, no preamble, no trailing comma.

Format:
[
  {
    "question": "Question text here with $LaTeX$ formulas",
    "options": ["Bare option text", "Bare option text", "Bare option text", "Bare option text"],
    "correct": 0,
    "explanation": "Explanation with $formula$.",
    "table": { "columns": ["Distance (m)", "Time (s)"], "rows": [["10", "2"], ["20", "4"]] }
  }
]`;
}
```

- [ ] **Step 2: Replace `parseQuestions` (and add helpers)**

Replace the `parseQuestions` function (lines 64-73) with:

```ts
function cleanOption(opt: string): string {
  return opt.replace(/^\s*[A-D][\.\)\:]\s+/, "").trim();
}

function normalizeTable(table: Question["table"]): Question["table"] {
  if (!table) return undefined;
  const columns = (table.columns ?? []).slice(0, 8).map(String);
  const rows = (table.rows ?? []).slice(0, 15).map((r) => r.slice(0, 8).map(String));
  if (columns.length === 0 || rows.length === 0) return undefined;
  return { columns, rows };
}

export function parseQuestions(text: string): Question[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found in model response");

  const questions = JSON.parse(jsonMatch[0]) as Question[];
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("Model returned an empty or invalid question list");
  }
  return questions.map((q) => ({
    ...q,
    options: q.options.map(cleanOption),
    table: normalizeTable(q.table),
  }));
}
```

- [ ] **Step 3: Bump the KV cache key**

In `apps/worker/src/routes/questions.ts:55`, change the key prefix:

```ts
  const key = `q3:${form}:${subject.toLowerCase()}:${chapter_number}:${difficulty.toLowerCase()}:${count}`;
```

(Old `q2:` entries auto-expire at their 7-day TTL and are never read again.)

- [ ] **Step 4: Typecheck the web workspace**

Run (repo root): `npm run typecheck --workspace=apps/web`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/worker/src/lib/questions.ts apps/worker/src/routes/questions.ts
git commit -m "feat: forbid diagram references, add structured tables, strip option prefixes"
```

---

### Task 4: `QuestionTable` shared component

**Files:**
- Create: `apps/web/src/components/ui/QuestionTable.tsx`

**Interfaces:**
- Consumes: `QuestionData.table` shape from Task 1.
- Produces: `<QuestionTable table?: { columns: string[]; rows: string[][] } className?: string />` — returns `null` when `table` is missing; rendered by Task 5 (quiz) and Task 6 (results).

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Typecheck**

Run (repo root): `npm run typecheck --workspace=apps/web`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/QuestionTable.tsx
git commit -m "feat: shared question data table component"
```

---

### Task 5: QuizScreen — render table + 2×2 options grid

**Files:**
- Modify: `apps/web/src/pages/QuizScreen.tsx` (import line 7; question body ~line 223; options block lines 230-275)

**Interfaces:**
- Consumes: `QuestionTable` from Task 4; `currentQuestion.table` (from stored `questions_data`).

- [ ] **Step 1: Import `QuestionTable`**

Change line 7:

```tsx
import { ProgressBar, Icon, LoadingScreen, FormulaText, QuestionTable } from "@/components/ui";
```

Then add the named export to `apps/web/src/components/ui/index.ts` (after line 15, the `FormulaText` export):

```ts
export { QuestionTable } from "./QuestionTable";
```

- [ ] **Step 2: Render the table under the question text**

After the `FormulaText` for the question (lines 223-227), add:

```tsx
        <QuestionTable table={currentQuestion.table} className="mt-4 mx-auto max-w-xl" />
```

(The block is inside the `text-center` flex column, so the table stays centered and width-capped like the question text.)

- [ ] **Step 3: Switch options to a 2×2 grid**

Change the options container at line 230 from:

```tsx
      <div className="flex flex-col gap-2.5">
```

to:

```tsx
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
```

(The option buttons and their styling stay unchanged — letter badges remain the UI-generated `String.fromCharCode(65 + i)`; the model no longer adds letters, so no duplication.)

- [ ] **Step 4: Typecheck + build**

Run (repo root): `npm run typecheck --workspace=apps/web; if ($?) { npm run build --workspace=apps/web }`
Expected: typecheck exit 0, then `✓ built in ...` with only the pre-existing chunk-size warning.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/QuizScreen.tsx apps/web/src/components/ui/index.ts
git commit -m "feat: render question tables and 2x2 options grid in quiz"
```

---

### Task 6: Results review — render question tables

**Files:**
- Modify: `apps/web/src/pages/Results.tsx` (import line 5; review card at ~line 102)

**Interfaces:**
- Consumes: `QuestionTable` from Task 4; `q.table` on each review question.

- [ ] **Step 1: Import `QuestionTable`**

Change line 5:

```tsx
import { Card, Button, Icon, StatPill, LoadingScreen, FormulaText, QuestionTable, type IconName } from "@/components/ui";
```

- [ ] **Step 2: Render the table inside each review card**

After the question `FormulaText` (line 102), add:

```tsx
                      <QuestionTable table={q.table} className="mt-2" />
```

(The table appears between the prompt and the option list; `min-w-0` on the wrapping `<p>` already permits overflow-x scroll on small screens.)

- [ ] **Step 3: Typecheck + build**

Run (repo root): `npm run typecheck --workspace=apps/web; if ($?) { npm run build --workspace=apps/web }`
Expected: typecheck exit 0, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/Results.tsx
git commit -m "feat: render question data tables in results review"
```

---

### Task 7: Landing chapter count

**Files:**
- Modify: `apps/web/src/pages/Landing.tsx:15`

**Interfaces:**
- Consumes: new chapter total from Task 2 (72).

- [ ] **Step 1: Update the stat**

Change line 15 from `stat: "47"` to:

```tsx
  { stat: "72", title: "chapters covered", body: "Every Form 4 and Form 5 chapter across the science stream.", icon: "book" },
```

- [ ] **Step 2: Typecheck + build**

Run (repo root): `npm run typecheck --workspace=apps/web; if ($?) { npm run build --workspace=apps/web }`
Expected: both green.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/Landing.tsx
git commit -m "fix: update landing chapter count to 72"
```

---

### Task 8: Deploy and push

**Files:**
- No code changes.

**Interfaces:**
- Verifies the whole plan end-to-end.

- [ ] **Step 1: Final typecheck + build**

Run (repo root): `npm run typecheck --workspace=apps/web; if ($?) { npm run build --workspace=apps/web }`
Expected: both green.

- [ ] **Step 2: Deploy worker**

Run (workdir `apps/worker`): `npx wrangler deploy`
Expected: `Uploaded ... (N bytes)` → `Current Version ID: ...` → `Deployed ... (N% soft limit)`.

- [ ] **Step 3: Deploy web**

Run (repo root): `npx vercel deploy --prod --yes --scope xtra15s-projects`
Expected: `✓ Production` + `Production: https://rivalr-phi.vercel.app [...]`.

- [ ] **Step 4: Push**

```bash
git push origin main
```

- [ ] **Step 5: Manual smoke test**

On https://rivalr-phi.vercel.app: start a new quiz — options render as a 2×2 grid with single letter badges and no "A A." duplication; data-driven questions (rates, tables) show a real rendered table; NO question references a diagram/figure/image; chapter picker in the lobby shows the corrected chapter names (Biology Form 4 now 15 entries, Physics Form 4 now 6).