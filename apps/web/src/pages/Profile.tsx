import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { Card, Avatar, StatCard, ProgressBar, EmptyState, Icon, achievementIcon } from "@/components/ui";
import { getLevel, formatAccuracy } from "@/utils/format";
import type { UserSubjectStats, UserAchievement } from "@rivalr/shared";

interface EnrichedAchievement {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement: { id: string; icon: string; name: string; description?: string };
}

export default function Profile() {
  const { user } = useAuth();
  const [subjectStats, setSubjectStats] = useState<UserSubjectStats[]>([]);
  const [achievements, setAchievements] = useState<EnrichedAchievement[]>([]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;

    const stats = await firestore.userSubjectStats.get(user.id);
    setSubjectStats(stats as unknown as UserSubjectStats[]);

    const achs = (await firestore.userAchievements.get(user.id)) as unknown as UserAchievement[];
    const allAchievements = (await firestore.achievements.getAll()) as unknown as {
      id: string;
      icon: string;
      name: string;
      description?: string;
    }[];

    const enriched = achs.map((a) => {
      const ach = allAchievements.find((x) => x.id === a.achievement_id);
      return {
        ...a,
        achievement: {
          id: ach?.id ?? "",
          icon: ach?.icon ?? "medal",
          name: ach?.name ?? "Achievement",
          description: ach?.description,
        },
      };
    });
    setAchievements(enriched);
  }

  if (!user) return null;

  const level = getLevel(user.xp);
  const totalQuizzes = subjectStats.reduce((s, st) => s + st.quizzes_completed, 0);
  const totalCorrect = subjectStats.reduce((s, st) => s + st.correct_answers, 0);
  const totalQuestions = subjectStats.reduce((s, st) => s + st.total_questions, 0);

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <div className="mb-8 flex items-center gap-5">
        <Avatar src={user.avatar_url} name={user.name} size="xl" />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
          <p className="text-sm text-navy-400">{user.email}</p>
        </div>
      </div>

      <div className="mb-7">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold">Level {level.level}</span>
          <span className="text-xs tabular-nums text-ink-muted">
            {level.currentXP}/{level.nextLevelXP} XP
          </span>
        </div>
        <ProgressBar value={level.currentXP} max={level.nextLevelXP} />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Quizzes" value={totalQuizzes} icon="book" />
        <StatCard label="Accuracy" value={formatAccuracy(totalCorrect, totalQuestions)} icon="target" tint="accent" />
        <StatCard label="Total XP" value={user.xp} icon="zap" tint="warning" />
        <StatCard label="Coins" value={user.coins} icon="coin" tint="success" />
      </div>

      <h2 className="mb-3 text-base font-semibold">Subject Breakdown</h2>
      <div className="mb-8 space-y-2.5">
        {subjectStats.length === 0 ? (
          <Card className="py-8 text-center text-sm text-ink-muted">No quiz data yet</Card>
        ) : (
          subjectStats.map((s) => {
            const accuracy = formatAccuracy(s.correct_answers, s.total_questions);
            return (
              <Card key={s.subject} className="p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.subject}</p>
                    <p className="text-xs text-ink-muted">
                      {s.quizzes_completed} quizzes · Best streak {s.best_streak}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-accent">
                      {s.xp_earned}
                      <span className="ml-1 text-xs font-medium text-ink-muted">XP</span>
                    </p>
                    <p className="text-xs tabular-nums text-ink-muted">{accuracy}</p>
                  </div>
                </div>
                <ProgressBar value={s.correct_answers} max={Math.max(1, s.total_questions)} color="bg-success" />
              </Card>
            );
          })
        )}
      </div>

      <h2 className="mb-3 text-base font-semibold">Achievements</h2>
      {achievements.length === 0 ? (
        <EmptyState
          icon="medal"
          title="No achievements yet"
          description="Finish quizzes to unlock your first achievement."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {achievements.map((a) => (
            <Card key={a.achievement_id} className="flex items-center gap-3 p-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Icon name={achievementIcon(a.achievement.name)} size={21} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.achievement.name}</p>
                {a.achievement.description ? (
                  <p className="truncate text-xs text-ink-muted">{a.achievement.description}</p>
                ) : null}
                <p className="text-[11px] text-ink-muted">
                  {new Date(a.unlocked_at).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}