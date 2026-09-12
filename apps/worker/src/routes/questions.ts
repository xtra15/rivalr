import { generateWithGemini } from "../lib/gemini";
import { generateWithGroq } from "../lib/groq";
import type { Question } from "../lib/questions";
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

interface QuestionParams {
  form: number;
  subject: string;
  chapter_number: number;
  chapter_name: string;
  difficulty: string;
  count: number;
}

async function generateWithFallback(env: Env, params: QuestionParams): Promise<{ questions: Question[]; provider: string }> {
  const errors: string[] = [];

  try {
    return { questions: await generateWithGemini(env.GEMINI_API_KEY, params), provider: "gemini" };
  } catch (err) {
    errors.push(`gemini: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    return { questions: await generateWithGroq(env.GROQ_API_KEY, params), provider: "groq" };
  } catch (err) {
    errors.push(`groq: ${err instanceof Error ? err.message : String(err)}`);
  }

  throw new Error(`All providers failed: ${errors.join(" | ")}`);
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

  const key = `q3:${form}:${subject.toLowerCase()}:${chapter_number}:${difficulty.toLowerCase()}:${count}`;

  const cached = await env.QUESTIONS_KV.get(key);
  if (cached) {
    return Response.json({ questions: decompress(cached), cached: true });
  }

  const { questions, provider } = await generateWithFallback(env, {
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