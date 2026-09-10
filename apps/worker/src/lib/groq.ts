import { buildPrompt, parseQuestions, type Question } from "./questions";

export const GROQ_MODEL = "qwen/qwen3.8-27b";

export async function generateWithGroq(
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
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.7,
      max_tokens: 8192,
      messages: [{ role: "user", content: buildPrompt(params) }],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Groq API error: ${res.status} ${body}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  const text = data.choices[0]?.message?.content ?? "";
  if (!text) throw new Error("Groq returned an empty response");

  return parseQuestions(text);
}