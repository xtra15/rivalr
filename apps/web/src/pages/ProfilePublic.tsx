import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { firestore } from "@/lib/firestore";
import { Card, StatPill, EmptyState, LoadingScreen } from "@/components/ui";
import { UserCard, resolveEquipped, type EquippedSlots, type ItemWithCustomColor } from "@/components/UserCard";
import { getLevel, formatAccuracy } from "@/utils/format";
import type { PublicUser, ShopItem, UserSubjectStats } from "@rivalr/shared";

export default function ProfilePublic() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [stats, setStats] = useState<UserSubjectStats[]>([]);
  const [slots, setSlots] = useState<EquippedSlots | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const p = await firestore.users.getPublic(userId);
      if (!p) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setProfile(p);
      const [inv, items] = await Promise.all([
        firestore.userInventory.getForUsers([userId]),
        firestore.shopItems.getAll() as Promise<ShopItem[]>,
      ]);
      setSlots(resolveEquipped(inv as unknown as ItemWithCustomColor[], items));
      const s = (await firestore.userSubjectStats.get(userId)) as unknown as UserSubjectStats[];
      setStats(s);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <LoadingScreen label="Loading profile…" />;

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <EmptyState
          icon="user"
          title="User not found"
          description="This user does not exist or has no public profile."
        />
      </div>
    );
  }

  if (!profile) return null;

  const level = getLevel(profile.xp);
  const totalQuizzes = stats.reduce((s, x) => s + x.quizzes_completed, 0);
  const totalCorrect = stats.reduce((s, x) => s + x.correct_answers, 0);
  const totalQuestions = stats.reduce((s, x) => s + x.total_questions, 0);

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <Card className="flex flex-col items-center gap-4 p-6 text-center">
        <UserCard name={profile.name} avatarUrl={profile.avatar_url} size="xl" slots={slots ?? undefined} />
        {profile.status ? <p className="text-sm text-ink-muted">{profile.status}</p> : null}
        <p className="font-mono text-sm text-ink-muted">Level {level.level}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <StatPill value={String(profile.coins)} label="coins" />
          <StatPill value={String(totalQuizzes)} label="quizzes" />
          <StatPill value={formatAccuracy(totalCorrect, totalQuestions)} label="accuracy" />
        </div>
      </Card>

      {stats.length === 0 ? (
        <Card className="mt-4 py-10 text-center text-sm text-ink-muted">No statistics yet.</Card>
      ) : (
        <Card className="mt-4 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-medium text-ink-muted">
                <th className="px-4 py-2.5 font-medium">Subject</th>
                <th className="px-4 py-2.5 font-medium">Quizzes</th>
                <th className="px-4 py-2.5 font-medium">Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.subject} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{s.subject}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">{s.quizzes_completed}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-ink">
                    {formatAccuracy(s.correct_answers, s.total_questions)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}