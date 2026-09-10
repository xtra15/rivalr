export interface Question {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export async function generateQuestions(
  apiKey: string,
  params: {
    subject: string;
    form: number;
    chapter_number: number;
    chapter_name: string;
    difficulty: string;
    count: number;
  },
): Promise<Question[]> {
  const prompt = `You are an expert SPM (Sijil Pelajaran Malaysia) examiner for ${params.subject}.
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

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = (await res.json()) as { content: { type: string; text: string }[] };
  const text = data.content[0]?.text ?? "[]";

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("No JSON array found in Claude response");

  return JSON.parse(jsonMatch[0]) as Question[];
}
