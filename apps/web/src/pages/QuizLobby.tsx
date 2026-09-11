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
        questions_data: data.questions.map((q) => ({ ...q, user_answer: undefined })),
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
      <button
        onClick={() => navigate(`/guild/${guildId}`)}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <Icon name="arrow-left" size={16} />
        Back to guild
      </button>

      <h1 className="text-3xl font-bold tracking-tight">New Quiz</h1>

      <div className="mt-6 grid grid-cols-5 gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex flex-col gap-1.5">
            <div className={`h-1 rounded-full ${i <= step ? "bg-accent" : "bg-wash"}`} aria-hidden="true" />
            <span className={`text-[11px] font-medium uppercase tracking-wide ${i === step ? "text-accent" : "text-ink-muted"}`}>
              {label}
            </span>
          </div>
        ))}
      </div>

      <p className="mb-4 mt-4 text-sm text-ink-muted">
        Step {step + 1} of 5 — {STEP_LABELS[step]}
      </p>

      <div className="grid gap-2.5">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => selectStep(opt)}
            className="surface-card group flex items-center justify-between p-4 text-left transition-all duration-150 hover:border-line-strong hover:bg-wash active:scale-[0.995]"
          >
            <span className="text-[15px] font-medium text-ink">{optionLabel(opt)}</span>
            <Icon
              name="chevron-right"
              size={18}
              className="text-ink-faint transition-all group-hover:translate-x-0.5 group-hover:text-ink-soft"
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
        </div>
      )}
    </div>
  );
}