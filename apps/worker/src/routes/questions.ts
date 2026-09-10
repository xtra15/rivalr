import { generateQuestions } from "../lib/claude";
import { decompress, compress } from "../lib/compress";
import type { Env } from "../types";

interface QuestionRequest {
  form: number;
  subject: string;
  chapter_number: number;
  chapter_name: string;
  difficulty: string;
  count: number;
}

export async function handleQuestions(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = (await request.json()) as QuestionRequest;
  const { form, subject, chapter_number, chapter_name, difficulty, count } = body;

  if (!form || !subject || !chapter_number || !chapter_name || !difficulty || !count) {
    return new Response("Missing required fields", { status: 400 });
  }

  const key = `questions:${form}:${subject.toLowerCase()}:${chapter_number}:${difficulty.toLowerCase()}:${count}`;

  const cached = await env.QUESTIONS_KV.get(key);
  if (cached) {
    return Response.json({ questions: decompress(cached), cached: true });
  }

  const questions = await generateQuestions(env.ANTHROPIC_API_KEY, {
    form,
    subject,
    chapter_number,
    chapter_name,
    difficulty,
    count,
  });

  await env.QUESTIONS_KV.put(key, compress(questions), {
    expirationTtl: 60 * 60 * 24 * 7,
  });

  return Response.json({ questions, cached: false });
}
