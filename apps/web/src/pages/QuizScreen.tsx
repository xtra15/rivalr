import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { Button, ProgressBar, Card, Icon, LoadingScreen } from "@/components/ui";
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
    const data = await firestore.quizAttempts.get(quizId);
    setAttempt(data as unknown as QuizAttempt);
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
    const coins = Math.round((correct * (difficultyMultiplier[attempt.difficulty] ?? 1)) / 5) * 5;

    await firestore.quizAttempts.update(attempt.id, {
      correct_answers: correct,
      time_taken_seconds: timeElapsed,
      xp_earned: Math.round(baseXP),
      coins_earned: coins,
      questions_data: attempt.questions_data.map((q) => ({
        ...q,
        user_answer: q.user_answer ?? null,
      })),
    });

    await firestore.users.updateXP(user.id, Math.round(baseXP));
    await firestore.users.updateCoins(user.id, coins);

    navigate(`/guild/${guildId}/quiz/${attempt.id}/results`);
  }

  if (loading || !attempt || !currentQuestion) {
    return <LoadingScreen label="Loading question…" />;
  }

  const isCorrect = selected !== null && selected === currentQuestion.correct;

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <div className="mb-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-wash px-3 py-1.5 text-[13px] font-semibold tabular-nums text-ink ring-1 ring-inset ring-line-strong">
            <Icon name="target" size={15} className="text-accent" />
            {currentIndex + 1}
            <span className="font-normal text-ink-muted">/</span>
            {attempt.total_questions}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-wash px-3 py-1.5 text-[13px] font-semibold tabular-nums text-ink ring-1 ring-inset ring-line-strong">
            <Icon name="timer" size={15} className="text-ink-muted" />
            {formatTime(timeElapsed)}
          </span>
        </div>
        {streak >= 3 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-3 py-1.5 text-[13px] font-semibold text-warning ring-1 ring-inset ring-warning/30 animate-scale-in">
            <Icon name="flame" size={15} />
            {streak} streak
          </span>
        ) : null}
      </div>

      <ProgressBar value={currentIndex + 1} max={attempt.total_questions} />

      <Card className="mt-6 p-6 sm:p-7">
        <p className="text-lg font-medium leading-relaxed sm:text-xl">{currentQuestion.question}</p>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {currentQuestion.options.map((opt, i) => {
          const isSelected = selected === i;
          const isRight = showResult && i === currentQuestion.correct;
          const isWrong = showResult && isSelected && i !== currentQuestion.correct;

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={showResult}
              className={`group flex items-start gap-3 rounded-lg border p-4 text-left transition-all duration-150
                ${
                  isRight
                    ? "border-volt/60 bg-volt/10"
                    : isWrong
                      ? "border-danger/60 bg-danger/10"
                      : showResult
                        ? "border-line bg-overpanel opacity-50"
                        : isSelected
                          ? "border-volt bg-volt/10"
                          : "border-line bg-overpanel hover:border-line-strong hover:bg-panel-2 active:scale-[0.99]"
                }`}
            >
              <span
                className={`mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[13px] font-semibold transition-colors ${
                  isRight
                    ? "bg-volt text-field"
                    : isWrong
                      ? "bg-danger text-field"
                      : isSelected || showResult
                        ? "bg-line-strong text-ink"
                        : "bg-overpanel text-ink-muted group-hover:bg-line-strong"
                }`}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="text-[15px] leading-snug">{opt}</span>
              {isRight ? <Icon name="check" size={16} className="mt-1 ml-auto shrink-0 text-volt" /> : null}
              {isWrong ? <Icon name="x" size={16} className="mt-1 ml-auto shrink-0 text-danger" /> : null}
            </button>
          );
        })}
      </div>

      {showResult && (
        <div className="mt-5 animate-slide-up">
          <Card
            className={`p-5 ${
              isCorrect
                ? "border-volt/40 bg-volt/[0.08]"
                : "border-danger/40 bg-danger/[0.08]"
            }`}
          >
            <p className={`flex items-center gap-2 font-semibold ${isCorrect ? "text-volt" : "text-danger"}`}>
              <Icon name={isCorrect ? "check-circle" : "x-circle"} size={19} />
              {isCorrect ? "Correct!" : "Incorrect"}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{currentQuestion.explanation}</p>
          </Card>
          <Button className="mt-3 w-full" size="lg" onClick={nextQuestion}>
            {currentIndex < attempt.total_questions - 1 ? "Next Question" : "See Results"}
            <Icon name="chevron-right" size={17} />
          </Button>
        </div>
      )}
    </div>
  );
}