import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Card, Avatar, StatCard, ProgressBar } from "@/components/ui";
import { getLevel, formatAccuracy } from "@/utils/format";
import type { UserSubjectStats, UserAchievement, Achievement } from "@rivalr/shared";

export default function Profile() {
  const { user } = useAuth();
  const [subjectStats, setSubjectStats] = useState<UserSubjectStats[]>([]);
  const [achievements, setAchievements] = useState<(UserAchievement & { achievement: Achievement })[]>([]);


  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;

    const { data: stats } = await supabase
      .from("user_subject_stats")
      .select("*")
      .eq("user_id", user.id);
    setSubjectStats((stats ?? []) as UserSubjectStats[]);

    const { data: achs } = await supabase
      .from("user_achievements")
      .select("*, achievement:achievements(*)")
      .eq("user_id", user.id);
    setAchievements((achs ?? []) as (UserAchievement & { achievement: Achievement })[]);

  }

  if (!user) return null;

  const level = getLevel(user.xp);
  const totalQuizzes = subjectStats.reduce((s, st) => s + st.quizzes_completed, 0);
  const totalCorrect = subjectStats.reduce((s, st) => s + st.correct_answers, 0);
  const totalQuestions = subjectStats.reduce((s, st) => s + st.total_questions, 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Avatar src={user.avatar_url} name={user.name} size="lg" />
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-sm text-navy-400">{user.email}</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-navy-400">Level {level.level}</span>
          <span className="text-xs text-navy-500">
            {level.currentXP}/{level.nextLevelXP} XP
          </span>
        </div>
        <ProgressBar value={level.currentXP} max={level.nextLevelXP} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <StatCard label="Total Quizzes" value={totalQuizzes} />
        <StatCard label="Accuracy" value={formatAccuracy(totalCorrect, totalQuestions)} />
        <StatCard label="Total XP" value={user.xp} />
        <StatCard label="Coins" value={user.coins} />
      </div>

      <h2 className="font-semibold mb-3">Subject Breakdown</h2>
      <div className="space-y-2 mb-8">
        {subjectStats.length === 0 ? (
          <Card className="text-center py-6 text-navy-400 text-sm">
            No quiz data yet
          </Card>
        ) : (
          subjectStats.map((s) => (
            <Card key={s.subject} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{s.subject}</p>
                  <p className="text-xs text-navy-400">
                    {s.quizzes_completed} quizzes · Best streak: {s.best_streak}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-indigo-400">{s.xp_earned} XP</p>
                  <p className="text-xs text-navy-400">
                    {formatAccuracy(s.correct_answers, s.total_questions)}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <h2 className="font-semibold mb-3">Achievements</h2>
      {achievements.length === 0 ? (
        <Card className="text-center py-6 text-navy-400 text-sm">
          No achievements yet
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {achievements.map((a) => (
            <Card key={a.achievement_id} className="p-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{a.achievement.icon}</span>
                <div>
                  <p className="text-sm font-medium">{a.achievement.name}</p>
                  <p className="text-xs text-navy-400">
                    {new Date(a.unlocked_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
