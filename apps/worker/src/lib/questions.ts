export interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  table?: { columns: string[]; rows: string[][] };
}

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
- Arrows in equations: use \\rightarrow (\\rightarrow).
- Scientific notation: $3.0 \\times 10^8$.
- Greek letters: use \\alpha, \\beta, \\gamma, \\theta, \\lambda, etc.
- Units: use \\text{...} inside math mode, e.g. $100\\,\\text{mL}$, $37^\\circ\\text{C}$.
- Every question, option, and explanation MUST use these delimiters wherever a formula, equation, chemical species, or scientific notation appears.
- Questions must be visually rich — include balanced chemical equations, labelled diagrams described in text, data tables described inline, and scenario-based prompts with real-world context.

SPM EXAM STYLE:
- Frame questions around Malaysian context where relevant (e.g. local flora, rivers, industries, food).
- Use scenario-based stems: "A student conducted an experiment...", "Study the diagram below...", "Table 1 shows...".
- Each question should test understanding, not just memorization.
- Explanations should reference the specific concept or principle tested.

Rules:
- Questions must be accurate and strictly aligned to the Malaysian SPM syllabus.
- Cover a variety of subtopics within the chapter — do not repeat the same concept.
- Each question must have exactly 4 options (A, B, C, D).
- Only one option is correct. The other three must be plausible distractors.
- Provide a brief explanation (1-2 sentences) for why the correct answer is right.
- Do not repeat questions or options.
- Return ONLY a valid JSON array, no markdown, no preamble, no trailing comma.

Format:
[
  {
    "question": "Question text here with $LaTeX$ formulas",
    "options": ["Option A with $formula$", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Explanation with $formula$."
  }
]`;
}

export function parseQuestions(text: string): Question[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found in model response");

  const questions = JSON.parse(jsonMatch[0]) as Question[];
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("Model returned an empty or invalid question list");
  }
  return questions;
}