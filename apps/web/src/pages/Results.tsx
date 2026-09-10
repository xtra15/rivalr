import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, StatCard, Button } from "@/components/ui";
import { formatTime } from "@/utils/format";
import type { QuizAttempt } from "@rivalr/shared";

export default function Results() {
  const { guildId, quizId } = useParams<{ guildId: string; quizId: string }>();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quizId) return;
    supabase
      .from("quiz_attempts")
      .select("*")
      .eq("id", quizId)
      .single()
      .then(({ data }) => {
        setAttempt(data as QuizAttempt);
        setLoading(false);
      });
  }, [quizId]);

  if (loading || !attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy-600 border-t-indigo-500" />
      </div>
    );
  }

  const accuracy = Math.round((attempt.correct_answers / attempt.total_questions) * 100);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 animate-fade-in">
      <div className="mb-8 text-center">
        <div className="text-5xl mb-4">
          {accuracy === 100 ? "💯" : accuracy >= 80 ? "🎉" : accuracy >= 60 ? "👍" : "📚"}
        </div>
        <h1 className="text-3xl font-bold">
          {attempt.correct_answers}/{attempt.total_questions}
        </h1>
        <p className="mt-2 text-navy-400">
          {attempt.subject} · Ch. {attempt.chapter_number} · {attempt.difficulty}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Accuracy" value={`${accuracy}%`} />
        <StatCard label="Time" value={formatTime(attempt.time_taken_seconds)} />
        <StatCard label="XP Earned" value={attempt.xp_earned} />
        <StatCard label="Coins Earned" value={attempt.coins_earned} />
      </div>

      <h2 className="font-semibold mb-3">Review Answers</h2>
      <div className="space-y-3 mb-8">
        {attempt.questions_data.map((q, i) => {
          return (
            <Card key={i} className="p-4">
              <p className="text-sm font-medium mb-2">
                <span className="text-navy-400">Q{i + 1}.</span> {q.question}
              </p>
              {q.options.map((opt, oi) => (
                <p
                  key={oi}
                  className={`text-xs ml-4 py-0.5 ${
                    oi === q.correct
                      ? "text-green-400"
                      : oi === q.user_answer
                        ? "text-red-400"
                        : "text-navy-400"
                  }`}
                >
                  {String.fromCharCode(65 + oi)}. {opt}
                  {oi === q.correct ? " ✓" : ""}
                  {oi === q.user_answer && oi !== q.correct ? " ✗" : ""}
                </p>
              ))}
              <p className="text-xs text-navy-400 mt-2 italic">{q.explanation}</p>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Link to={`/guild/${guildId}/quiz`} className="flex-1">
          <Button className="w-full" variant="secondary">Play Again</Button>
        </Link>
        <Link to={`/guild/${guildId}`} className="flex-1">
          <Button className="w-full">Back to Guild</Button>
        </Link>
      </div>
    </div>
  );
}
