import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { firestore } from "@/lib/firestore";
import { Card, StatCard, Button, Icon, LoadingScreen, type IconName } from "@/components/ui";
import { formatTime } from "@/utils/format";
import type { QuizAttempt } from "@rivalr/shared";

export default function Results() {
  const { guildId, quizId } = useParams<{ guildId: string; quizId: string }>();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!quizId) return;
    firestore.quizAttempts.get(quizId).then((data) => {
      setAttempt(data as unknown as QuizAttempt);
      setLoading(false);
    });
  }, [quizId]);

  if (loading || !attempt) {
    return <LoadingScreen label="Loading results…" />;
  }

  const accuracy = Math.round((attempt.correct_answers / attempt.total_questions) * 100);

  const result =
    accuracy === 100
      ? { icon: "trophy" as IconName, title: "Perfect score!", tint: "text-amber-300 bg-amber-300/15 ring-amber-300/30" }
      : accuracy >= 80
        ? { icon: "star" as IconName, title: "Great work!", tint: "text-indigo-300 bg-indigo-500/15 ring-indigo-400/30" }
        : accuracy >= 60
          ? { icon: "check" as IconName, title: "Solid effort", tint: "text-signal-success bg-signal-success/15 ring-signal-success/30" }
          : { icon: "book" as IconName, title: "Keep revising", tint: "text-navy-300 bg-navy-800 ring-navy-700" };

  return (
    <div className="mx-auto max-w-xl animate-fade-in">
      <div className="mb-8 text-center">
        <div className={`mx-auto mb-5 inline-flex h-20 w-20 items-center justify-center rounded-3xl ring-1 ${result.tint}`}>
          <Icon name={result.icon} size={38} strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-bold tracking-tight">{result.title}</h1>
        <p className="mt-2 text-lg font-semibold tabular-nums text-navy-200">
          {attempt.correct_answers}/{attempt.total_questions} correct
        </p>
        <p className="mt-0.5 text-sm text-navy-400">
          {attempt.subject} · Ch. {attempt.chapter_number} · {attempt.difficulty}
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Accuracy" value={`${accuracy}%`} icon="target" tint="accent" />
        <StatCard label="Time" value={formatTime(attempt.time_taken_seconds)} icon="timer" />
        <StatCard label="XP Earned" value={`+${attempt.xp_earned}`} icon="zap" tint="warning" />
        <StatCard label="Coins Earned" value={`+${attempt.coins_earned}`} icon="coin" tint="success" />
      </div>

      <h2 className="mb-3 text-base font-semibold">Review Answers</h2>
      <div className="mb-8 space-y-3">
        {attempt.questions_data.map((q, i) => {
          const isRight = q.user_answer === q.correct;
          return (
            <Card key={i} className={`p-4 ${isRight ? "border-signal-success/20" : "border-navy-800"}`}>
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="text-sm font-medium leading-snug">
                  <span className="mr-1.5 text-navy-500">Q{i + 1}.</span>
                  {q.question}
                </p>
                <span
                  className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isRight ? "bg-signal-success/15 text-signal-success" : "bg-signal-danger/15 text-signal-danger"
                  }`}
                >
                  <Icon name={isRight ? "check" : "x"} size={12} />
                  {isRight ? "Correct" : "Mistake"}
                </span>
              </div>
              {q.options.map((opt, oi) => {
                const right = oi === q.correct;
                const wrong = oi === q.user_answer && !right;
                return (
                  <p
                    key={oi}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1 text-[13px] leading-snug ${
                      right ? "bg-signal-success/10 text-signal-success" : wrong ? "bg-signal-danger/10 text-signal-danger" : "text-navy-400"
                    }`}
                  >
                    <span className="text-[11px] font-semibold text-navy-500">{String.fromCharCode(65 + oi)}.</span>
                    <span className="min-w-0 flex-1">{opt}</span>
                    {right ? <Icon name="check" size={13} className="shrink-0" /> : null}
                    {wrong ? <Icon name="x" size={13} className="shrink-0" /> : null}
                  </p>
                );
              })}
              <p className="mt-2.5 border-t border-navy-800 pt-2.5 text-xs italic leading-relaxed text-navy-500">
                {q.explanation}
              </p>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Link to={`/guild/${guildId}/quiz`} className="flex-1">
          <Button className="w-full" variant="secondary">
            <Icon name="refresh" size={16} />
            Play Again
          </Button>
        </Link>
        <Link to={`/guild/${guildId}`} className="flex-1">
          <Button className="w-full">
            <Icon name="users" size={16} />
            Back to Guild
          </Button>
        </Link>
      </div>
    </div>
  );
}