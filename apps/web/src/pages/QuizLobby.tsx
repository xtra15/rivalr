import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { fetchQuestions } from "@/lib/api";
import { Card, Button, Icon, LoadingScreen } from "@/components/ui";
import { CHAPTERS, SUBJECTS, DIFFICULTIES } from "@rivalr/shared";
import type { Subject, Difficulty } from "@rivalr/shared";

const STEP_LABELS = ["Form", "Subject", "Chapter", "Difficulty", "Questions"] as const;

export default function QuizLobby() {
  const { guildId } = useParams<{ guildId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<4 | 5>(4);
  const [subject, setSubject] = useState<Subject>("Biology");
  const [chapterNum, setChapterNum] = useState<number>(1);
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy");
  const [count, setCount] = useState(10);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chapters = CHAPTERS[subject][form];
  const selectedChapter = chapters.find((c) => c.number === chapterNum);

  function selectStep(value: unknown) {
    switch (step) {
      case 0: setForm(value as 4 | 5); break;
      case 1: setSubject(value as Subject); setChapterNum(1); break;
      case 2: setChapterNum((value as { number: number }).number); break;
      case 3: setDifficulty(value as Difficulty); break;
      case 4: setCount(value as number); break;
    }
    if (step < 4) setStep(step + 1);
  }

  async function startQuiz() {
    if (!guildId || !user || !selectedChapter) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchQuestions({
        form,
        subject,
        chapter_number: chapterNum,
        chapter_name: selectedChapter.name,
        difficulty,
        count,
      });

      const attempt = await firestore.quizAttempts.create({
        user_id: user.id,
        guild_id: guildId,
        form,
        subject,
        chapter_number: chapterNum,
        chapter_name: selectedChapter.name,
        difficulty,
        total_questions: count,
        correct_answers: 0,
        time_taken_seconds: 0,
        xp_earned: 0,
        coins_earned: 0,
        timer_enabled: timerEnabled,
        questions_data: data.questions.map((q) => ({
          question: q.question,
          options: q.options,
          correct: q.correct,
          explanation: q.explanation ?? "",
          user_answer: null,
        })),
      });

      if (attempt) {
        navigate(`/guild/${guildId}/quiz/${attempt.id}`);
      }
    } catch (e) {
      console.error(e);
      setError("Could not generate questions right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const optionLabel = (opt: unknown) => {
    if (step === 0) return `Form ${opt}`;
    if (step === 2) return `Ch. ${(opt as { number: number; name: string }).number} — ${(opt as { number: number; name: string }).name}`;
    if (step === 4) return `${opt} questions`;
    return String(opt);
  };

  const options = step === 0 ? [4, 5] : step === 1 ? SUBJECTS : step === 2 ? chapters : step === 3 ? DIFFICULTIES : [5, 10, 20];

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <LoadingScreen label="Generating questions…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => (step > 0 ? setStep(step - 1) : navigate(`/guild/${guildId}`))}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-volt"
        >
          <Icon name="arrow-left" size={16} />
          {step > 0 ? "Back" : "Back to guild"}
        </button>
        <p className="text-[13px] text-ink-muted">
          Step {step + 1} of 5
        </p>
      </div>

      <h1 className="font-display text-3xl uppercase tracking-wide">New Quiz</h1>

      <div className="mt-5 grid grid-cols-5 gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex flex-col gap-1.5">
            <div
              className={`h-1 rounded-[2px] ${i < step ? "bg-volt/40" : i === step ? "bg-accent" : "bg-overpanel"}`}
              aria-hidden="true"
            />
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${i === step ? "text-volt" : "text-ink-faint"}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2.5">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => selectStep(opt)}
            className="surface-card group flex items-center justify-between p-4 text-left transition-all duration-150 hover:border-line-strong hover:bg-overpanel active:scale-[0.995]"
          >
            <span className="text-[15px] font-medium text-ink-soft">{optionLabel(opt)}</span>
            <Icon
              name="chevron-right"
              size={18}
              className="text-ink-faint transition-all group-hover:translate-x-0.5 group-hover:text-volt"
            />
          </button>
        ))}
      </div>

      {step === 4 && selectedChapter && (
        <div className="mt-6">
          <Card className="mb-4 flex items-start justify-between gap-4 p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                Ready to Start
              </p>
              <p className="mt-1.5 font-semibold">
                Form {form} {subject}
              </p>
              <p className="mt-0.5 text-sm text-ink-soft">
                Ch. {chapterNum}: {selectedChapter.name}
              </p>
            </div>
            <span className="shrink-0 text-right">
              <p className="text-sm font-medium text-ink">{difficulty}</p>
              <p className="text-sm text-ink-soft">{count} questions</p>
            </span>
          </Card>

          <button
            onClick={() => setTimerEnabled((t) => !t)}
            className={`mb-4 flex w-full items-center justify-between rounded-lg border p-4 text-left transition-colors ${
              timerEnabled ? "border-volt/60 bg-volt/10" : "border-line bg-panel hover:border-line-strong"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Icon name="timer" size={18} className={timerEnabled ? "text-volt" : "text-ink-muted"} />
              <span>
                <span className="block text-sm font-medium">Timed mode</span>
                <span className="block text-xs text-ink-muted">
                  {timerEnabled ? "Per-question timer · 60s each" : "Relaxed, no timer"}
                </span>
              </span>
            </span>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                timerEnabled ? "bg-volt" : "bg-overpanel"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-ink transition-all ${
                  timerEnabled ? "left-[22px] bg-field" : "left-0.5 bg-ink-muted"
                }`}
              />
            </span>
          </button>

          {error ? (
            <p className="mb-4 flex items-center gap-2 text-sm text-danger animate-slide-down">
              <Icon name="info" size={16} />
              {error}
            </p>
          ) : null}

          <Button className="w-full" size="lg" onClick={startQuiz}>
            <Icon name="play" size={18} fill />
            Start Quiz
          </Button>
          <p className="mt-3 text-center text-xs text-ink-faint">
            Questions are AI-generated and checked against the SPM syllabus.
          </p>
        </div>
      )}
    </div>
  );
}