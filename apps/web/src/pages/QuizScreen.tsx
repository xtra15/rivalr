import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Button, ProgressBar, Card } from "@/components/ui";
import { formatTime } from "@/utils/format";
import type { QuizAttempt } from "@rivalr/shared";

export default function QuizScreen() {
  const { guildId, quizId } = useParams<{ guildId: string; quizId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [streak, setStreak] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    loadAttempt();
    return () => clearInterval(timerRef.current);
  }, [quizId]);

  useEffect(() => {
    if (!attempt || showResult) return;
    timerRef.current = setInterval(() => {
      setTimeElapsed((t) => t + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [attempt, showResult]);

  async function loadAttempt() {
    if (!quizId) return;
    const { data } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("id", quizId)
      .single();
    setAttempt(data as QuizAttempt);
    setLoading(false);
  }

  const currentQuestion = attempt?.questions_data[currentIndex];

  const handleAnswer = useCallback(
    (answerIndex: number) => {
      if (!attempt || !currentQuestion || selected !== null) return;
      setSelected(answerIndex);
      setShowResult(true);

      const isCorrect = answerIndex === currentQuestion.correct;
      if (isCorrect) setStreak((s) => s + 1);
      else setStreak(0);

      const updated = [...attempt.questions_data];
      updated[currentIndex] = { ...updated[currentIndex]!, user_answer: answerIndex };
      setAttempt({ ...attempt, questions_data: updated });
    },
    [attempt, currentQuestion, currentIndex, selected],
  );

  function nextQuestion() {
    if (!attempt) return;
    if (currentIndex < attempt.total_questions - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelected(null);
      setShowResult(false);
    } else {
      finishQuiz();
    }
  }

  async function finishQuiz() {
    if (!attempt || !guildId || !user) return;
    clearInterval(timerRef.current);

    const correct = attempt.questions_data.filter((q) => q.user_answer === q.correct).length;

    const difficultyMultiplier: Record<string, number> = {
      Easy: 1,
      Medium: 1.5,
      Hard: 2,
      KBAT: 2.5,
    };
    const baseXP = correct * 10 * (difficultyMultiplier[attempt.difficulty] ?? 1);
    const coins = Math.round(correct * (difficultyMultiplier[attempt.difficulty] ?? 1) / 5) * 5;

    await supabase
      .from("quiz_attempts")
      .update({
        correct_answers: correct,
        time_taken_seconds: timeElapsed,
        xp_earned: Math.round(baseXP),
        coins_earned: coins,
        questions_data: attempt.questions_data,
      })
      .eq("id", attempt.id);

    await supabase.rpc("increment_user_xp", {
      uid: user.id,
      amount: Math.round(baseXP),
    }).then(() =>
      supabase.rpc("increment_user_coins", {
        uid: user.id,
        amount: coins,
      }),
    );

    navigate(`/guild/${guildId}/quiz/${attempt.id}/results`);
  }

  if (loading || !attempt || !currentQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-900">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-navy-600 border-t-indigo-500" />
      </div>
    );
  }

  const isCorrect = selected !== null && selected === currentQuestion.correct;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="text-navy-400">
          {currentIndex + 1} / {attempt.total_questions}
        </span>
        <span className="text-navy-400 tabular-nums">{formatTime(timeElapsed)}</span>
      </div>

      <ProgressBar value={currentIndex + 1} max={attempt.total_questions} />

      {streak >= 3 && (
        <div className="mt-2 text-center text-sm font-medium text-orange-400">
          🔥 {streak} streak
        </div>
      )}

      <Card className="mt-6 p-6 animate-fade-in">
        <p className="text-lg font-medium leading-relaxed">{currentQuestion.question}</p>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {currentQuestion.options.map((opt, i) => {
          let style = "border-navy-700 bg-navy-800 hover:border-navy-600";
          if (showResult) {
            if (i === currentQuestion.correct) style = "border-green-500 bg-green-500/10";
            else if (i === selected) style = "border-red-500 bg-red-500/10";
            else style = "border-navy-700 bg-navy-800 opacity-50";
          } else if (i === selected) {
            style = "border-indigo-500 bg-indigo-500/10";
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={showResult}
              className={`rounded-xl border p-4 text-left transition-all ${style}`}
            >
              <span className="text-sm font-medium text-navy-300">
                {String.fromCharCode(65 + i)}
              </span>
              <p className="mt-1 text-sm">{opt}</p>
            </button>
          );
        })}
      </div>

      {showResult && (
        <div className="mt-4 animate-slide-up">
          <Card className={`p-4 ${isCorrect ? "border-green-500/30" : "border-red-500/30"}`}>
            <p className={`font-semibold ${isCorrect ? "text-green-400" : "text-red-400"}`}>
              {isCorrect ? "Correct!" : "Incorrect"}
            </p>
            <p className="mt-1 text-sm text-navy-300">{currentQuestion.explanation}</p>
          </Card>
          <Button className="mt-3 w-full" onClick={nextQuestion}>
            {currentIndex < attempt.total_questions - 1 ? "Next Question" : "See Results"}
          </Button>
        </div>
      )}
    </div>
  );
}
