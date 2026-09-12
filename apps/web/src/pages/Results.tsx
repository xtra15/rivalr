import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { Card, Button, Icon, StatPill, LoadingScreen, FormulaText, QuestionTable, type IconName } from "@/components/ui";
import { UserCard, resolveEquipped, type EquippedSlots } from "@/components/UserCard";
import { formatTime, formatCoins, formatAccuracy } from "@/utils/format";
import type { QuizAttempt, ShopItem } from "@rivalr/shared";

export default function Results() {
  const { guildId, quizId } = useParams<{ guildId: string; quizId: string }>();
  const { user } = useAuth();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [flexSlots, setFlexSlots] = useState<EquippedSlots | null>(null);

  useEffect(() => {
    if (!quizId) return;
    firestore.quizAttempts.get(quizId).then((data) => {
      setAttempt(data as unknown as QuizAttempt);
      setLoading(false);
    });
  }, [quizId]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [inv, items] = await Promise.all([
        firestore.userInventory.getForUsers([user.id]),
        firestore.shopItems.getAll() as Promise<ShopItem[]>,
      ]);
      setFlexSlots(
        resolveEquipped(inv as unknown as { item_id: string; is_equipped: boolean }[], items),
      );
    })();
  }, [user]);

  if (loading || !attempt) {
    return <LoadingScreen label="Loading results…" />;
  }

  const accuracy = formatAccuracy(attempt.correct_answers, attempt.total_questions);

  const result =
    accuracy === "100%"
      ? { icon: "trophy" as IconName, title: "Perfect score!", tint: "text-volt bg-volt/10 ring-volt/30" }
      : attempt.correct_answers / attempt.total_questions >= 0.8
        ? { icon: "star" as IconName, title: "Great work!", tint: "text-volt bg-volt/10 ring-volt/30" }
        : attempt.correct_answers / attempt.total_questions >= 0.6
          ? { icon: "check" as IconName, title: "Solid effort", tint: "text-success bg-success/10 ring-success/30" }
          : { icon: "book" as IconName, title: "Keep revising", tint: "text-ink-muted bg-overpanel ring-line-strong" };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <div className="mb-8 text-center">
        {user ? (
          <div className="mb-4 flex justify-center">
            <UserCard name={user.name} avatarUrl={user.avatar_url} size="lg" slots={flexSlots ?? undefined} />
          </div>
        ) : null}
        <div className={`mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-lg ring-1 ${result.tint}`}>
          <Icon name={result.icon} size={30} strokeWidth={1.5} />
        </div>
        <h1 className="font-display text-4xl uppercase tracking-wide">{result.title}</h1>
        <p className="mt-3 font-display text-7xl tabular-nums leading-none text-ink">
          {attempt.correct_answers}/{attempt.total_questions}
        </p>
        <p className="mt-3 font-mono text-lg tabular-nums text-ink-muted">{accuracy}</p>
        <p className="mt-1.5 text-sm text-ink-muted">
          {attempt.subject} · Ch. {attempt.chapter_number} · {attempt.difficulty}
        </p>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
        <StatPill value={formatTime(attempt.time_taken_seconds)} label="time" />
        <StatPill value={`+${attempt.xp_earned}`} label="xp" />
        <StatPill value={`+${formatCoins(attempt.coins_earned)}`} label="coins" />
      </div>

      <div className="mb-6">
        <button
          onClick={() => setReviewOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg border border-line bg-panel px-5 py-4 text-left transition-colors hover:border-line-strong"
        >
          <span className="text-sm font-semibold">Review answers</span>
          <Icon
            name="chevron-down"
            size={16}
            className={`text-ink-muted transition-transform duration-200 ${reviewOpen ? "rotate-180" : ""}`}
          />
        </button>
        {reviewOpen && (
          <div className="mt-3 space-y-3 animate-slide-down">
            {attempt.questions_data.map((q, i) => {
              const isRight = q.user_answer === q.correct;
              return (
                <Card key={i} className={`p-4 ${isRight ? "border-success/20" : "border-line"}`}>
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
                      <span className="mr-1.5 text-ink-muted">Q{i + 1}.</span>
                      <FormulaText text={q.question} />
                    </p>
                    <QuestionTable table={q.table} className="mt-2" />
                    <span
                      className={`mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        isRight ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
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
                        className={`flex items-center gap-2 rounded-md px-2 py-1 text-[13px] leading-snug ${
                          right ? "bg-success/10 text-success" : wrong ? "bg-danger/10 text-danger" : "text-ink-muted"
                        }`}
                      >
                        <span className="text-[11px] font-semibold text-ink-muted">{String.fromCharCode(65 + oi)}.</span>
                        <FormulaText text={opt} className="min-w-0 flex-1" />
                        {right ? <Icon name="check" size={13} className="shrink-0" /> : null}
                        {wrong ? <Icon name="x" size={13} className="shrink-0" /> : null}
                      </p>
                    );
                  })}
                  {q.explanation ? (
                    <p className="mt-2.5 border-t border-line pt-2.5 text-xs italic leading-relaxed text-ink-muted">
                      <FormulaText text={q.explanation} />
                    </p>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Link to={`/guild/${guildId}/quiz`} className="flex-1">
          <Button className="w-full" variant="secondary">
            <Icon name="refresh" size={16} />
            Quiz again
          </Button>
        </Link>
        <Link to={`/guild/${guildId}`} className="flex-1">
          <Button className="w-full">
            <Icon name="users" size={16} />
            Back to guild
          </Button>
        </Link>
      </div>
    </div>
  );
}