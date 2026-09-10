export interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
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
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Brief explanation."
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