import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { hexToProgressClass, playCorrectSfx } from "@/lib/theme";
import { api } from "@/lib/api";
import { ProgressBar, Icon, LoadingScreen, FormulaText } from "@/components/ui";
import { formatTime } from "@/utils/format";
import type { QuizAttempt, ShopItem } from "@rivalr/shared";

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
  const [remaining, setRemaining] = useState(60);
  const [loading, setLoading] = useState(true);
  const [themeHex, setThemeHex] = useState<string | null>(null);
  const [sfxUrl, setSfxUrl] = useState<string | null>(null);
  const sfxAudio = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const finishedRef = useRef(false);

  useEffect(() => {
    loadAttempt();
    return () => clearInterval(timerRef.current);
  }, [quizId]);

  useEffect(() => {
    if (!user) return;
    Promise.all([firestore.shopItems.getAll() as Promise<ShopItem[]>, firestore.userInventory.get(user.id)]).then(
      ([items, inv]) => {
        const equipped = new Set(
          (inv as unknown as { item_id: string; is_equipped: boolean }[])
            .filter((i) => i.is_equipped)
            .map((i) => i.item_id),
        );
        for (const item of items) {
          if (!equipped.has(item.id)) continue;
          if (item.category === "quiz_theme" && item.preview_data?.startsWith("#")) setThemeHex(item.preview_data);
          if (item.category === "sound_effect" && item.preview_data) setSfxUrl(api.sfxUrl(item.preview_data));
        }
      },
    );
  }, [user?.id]);

  useEffect(() => {
    if (!attempt || showResult) return;
    timerRef.current = setInterval(() => {
      setTimeElapsed((t) => t + 1);
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [attempt, showResult]);

  useEffect(() => {
    if (attempt?.timer_enabled) setRemaining(60);
  }, [currentIndex, attempt?.id]);

  useEffect(() => {
    if (!attempt?.timer_enabled || showResult) return;
    const t = setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [attempt?.timer_enabled, showResult, currentIndex]);

  useEffect(() => {
    if (attempt?.timer_enabled && remaining === 0 && !showResult) {
      setShowResult(true);
      setSelected(null);
    }
  }, [remaining, attempt?.timer_enabled, showResult]);

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
      if (isCorrect) {
        setStreak((s) => s + 1);
        if (sfxUrl) {
          if (!sfxAudio.current) sfxAudio.current = new Audio();
          playCorrectSfx(sfxAudio.current, sfxUrl);
        }
      } else {
        setStreak(0);
      }

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
    if (!attempt || !guildId || !user || finishedRef.current) return;
    finishedRef.current = true;
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
  const isLast = currentIndex >= attempt.total_questions - 1;

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-6 sm:px-6 animate-fade-in"
      style={themeHex ? { ["--quiz-accent" as string]: themeHex } : undefined}
    >
      <div className="flex items-center justify-between text-sm">
        <p className="text-[13px] text-ink-muted">
          Question {currentIndex + 1} of {attempt.total_questions}
        </p>
        <div className="flex items-center gap-4">
          {attempt.timer_enabled ? (
            <span
              className={`inline-flex items-center gap-1.5 font-mono text-[15px] tabular-nums ${
                remaining <= 10 ? "text-danger" : "text-ink"
              }`}
            >
              <Icon name="timer" size={16} />
              {formatTime(remaining)}
            </span>
          ) : (
            <span className="font-mono text-[15px] tabular-nums text-ink">
              {formatTime(timeElapsed)}
            </span>
          )}
          <Link
            to={`/guild/${guildId}`}
            className="text-[13px] text-ink-faint transition-colors hover:text-ink-muted"
          >
            Leave
          </Link>
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar value={currentIndex + 1} max={attempt.total_questions} color={hexToProgressClass(themeHex)} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
        <p className="mb-3 text-xs text-ink-muted">
          Form {attempt.form} {attempt.subject} · Ch {attempt.chapter_number}
        </p>
        <FormulaText
          text={currentQuestion.question}
          className="max-w-xl text-lg font-medium leading-relaxed text-ink sm:text-xl"
          display
        />
      </div>

      <div className="flex flex-col gap-2.5">
        {currentQuestion.options.map((opt, i) => {
          const isSelected = selected === i;
          const isRight = showResult && i === currentQuestion.correct;
          const isWrong = showResult && isSelected && i !== currentQuestion.correct;

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={showResult}
              className={`group flex min-h-14 items-start gap-3 rounded-lg border px-3 text-left transition-all duration-150 sm:min-h-16 ${
                isRight
                  ? "border-success/60 bg-success/10"
                  : isWrong
                    ? "border-danger/60 bg-danger/10"
                    : showResult
                      ? "border-line bg-overpanel opacity-50"
                      : isSelected
                        ? "bg-panel-2"
                        : "border-line bg-panel hover:border-line-strong hover:bg-panel-2 active:scale-[0.99]"
              }`}
              style={
                isSelected && !showResult
                  ? { borderColor: themeHex ?? "#C9F73A" }
                  : undefined
              }
            >
              <span
                className={`mt-3 flex h-7 w-8 shrink-0 items-center justify-center rounded-md text-[13px] font-semibold sm:mt-4 ${
                  isRight
                    ? "bg-success/15 text-success"
                    : isWrong
                      ? "bg-danger/15 text-danger"
                      : "text-ink-faint"
                }`}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <FormulaText text={opt} className="flex-1 py-3.5 text-[15px] leading-snug text-ink sm:py-4" />
              {isRight ? <Icon name="check" size={18} className="mt-4 shrink-0 text-success" /> : null}
              {isWrong ? <Icon name="x" size={18} className="mt-4 shrink-0 text-danger" /> : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex h-8 items-center justify-between">
        <div>
          {streak >= 2 ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-ink">
              <Icon name="flame" size={16} className="text-volt" />
              {streak}
            </span>
          ) : null}
        </div>
      </div>

      {showResult && (
        <div
          className={`mt-2 overflow-hidden rounded-lg border border-l-[3px] bg-panel animate-slide-up ${
            isCorrect ? "border-l-success" : "border-l-danger"
          }`}
        >
          <div className="space-y-1.5 px-4 pb-4 pt-3.5">
            <p className={`text-sm font-semibold ${isCorrect ? "text-success" : "text-danger"}`}>
              {isCorrect ? "Correct" : "Incorrect"}
            </p>
            <FormulaText text={currentQuestion.explanation} className="text-sm leading-relaxed text-ink-muted" display />
          </div>
          <button
            onClick={nextQuestion}
            className="flex w-full items-center justify-end gap-1.5 border-t border-line bg-panel-2 px-4 py-3 text-sm font-semibold text-volt transition-colors hover:bg-overpanel"
          >
            {isLast ? "See results" : "Next"}
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}