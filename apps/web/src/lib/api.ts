const API_BASE = import.meta.env.VITE_API_URL as string;

export async function fetchQuestions(params: {
  form: number;
  subject: string;
  chapter_number: number;
  chapter_name: string;
  difficulty: string;
  count: number;
}) {
  const res = await fetch(`${API_BASE}/api/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error("Failed to fetch questions");
  return res.json() as Promise<{
    questions: {
      question: string;
      options: string[];
      correct: number;
      explanation: string;
    }[];
    cached: boolean;
  }>;
}
