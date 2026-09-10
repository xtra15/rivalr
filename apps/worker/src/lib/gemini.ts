import { buildPrompt, parseQuestions, type Question } from "./questions";

export const GEMINI_MODEL = "gemini-2.5-flash";

export async function generateWithGemini(
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
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildPrompt(params) }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${body}`);
  }

  const data = (await res.json()) as {
    candidates?: { content: { parts: { text: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) throw new Error("Gemini returned an empty response");

  return parseQuestions(text);
}