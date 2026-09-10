import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { fetchQuestions } from "@/lib/api";
import { Card, Button } from "@/components/ui";
import { CHAPTERS, SUBJECTS, DIFFICULTIES } from "@rivalr/shared";
import type { Subject, Difficulty } from "@rivalr/shared";

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

  const chapters = CHAPTERS[subject][form];
  const selectedChapter = chapters.find((c) => c.number === chapterNum);

  const steps = [
    { label: "Form", options: [4, 5] },
    { label: "Subject", options: SUBJECTS },
    { label: "Chapter", options: chapters },
    { label: "Difficulty", options: DIFFICULTIES },
    { label: "Questions", options: [5, 10, 20] },
  ];

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

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">New Quiz</h1>
        <p className="mt-1 text-sm text-navy-400">
          Step {step + 1} of 5 — {steps[step]?.label}
        </p>
      </div>

      <div className="mb-6 flex gap-1">
        {steps.map((s, i) => (
          <div
            key={s.label}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-indigo-500" : "bg-navy-700"
            }`}
          />
        ))}
      </div>

      {step < 4 ? (
        <div className="space-y-2 animate-fade-in">
          {(steps[step]?.options ?? []).map((opt, i) => (
            <Card
              key={i}
              hover
              className="p-4 text-center"
              onClick={() => selectStep(opt)}
            >
              <span className="font-medium">{optionLabel(opt)}</span>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2 animate-fade-in">
          {[5, 10, 20].map((n) => (
            <Card
              key={n}
              hover
              className="p-4 text-center"
              onClick={() => selectStep(n)}
            >
              <span className="font-medium">{n} questions</span>
            </Card>
          ))}
        </div>
      )}

      {step === 4 && selectedChapter && (
        <div className="mt-6">
          <Card className="mb-4 p-4 text-center">
            <p className="text-sm text-navy-400">Ready to start</p>
            <p className="mt-1 font-semibold">
              Form {form} {subject}
            </p>
            <p className="text-sm text-navy-300">
              Ch. {chapterNum}: {selectedChapter.name}
            </p>
            <p className="text-sm text-navy-300">
              {difficulty} · {count} questions
            </p>
          </Card>
          <Button className="w-full" size="lg" onClick={startQuiz} disabled={loading}>
            {loading ? "Loading questions..." : "Start Quiz"}
          </Button>
        </div>
      )}

      {step > 0 && (
        <button
          onClick={() => setStep(step - 1)}
          className="mt-4 text-sm text-navy-400 hover:text-navy-200 transition-colors"
        >
          ← Back
        </button>
      )}
    </div>
  );
}
