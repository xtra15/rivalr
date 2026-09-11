import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { Card, Icon, StatPill, SubjectPill, DifficultyBadge } from "@/components/ui";
import { formatCoins } from "@/utils/format";

type StatRow = { id: string } & Record<string, unknown>;
type ChapterRow = Record<string, unknown>;

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<StatRow[]>([]);
  const [guilds, setGuilds] = useState<StatRow[]>([]);
  const [attempts, setAttempts] = useState<StatRow[]>([]);
  const [chapterStats, setChapterStats] = useState<ChapterRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isAdmin) return;
    loadData();
  }, [user, isAdmin]);

  async function loadData() {
    const [usersData, guildsData, attemptsData, chapterData] = await Promise.all([
      firestore.usersBatch.getAll(),
      firestore.guilds.getAll(),
      firestore.quizAttempts.getAll(),
      firestore.userChapterStats.getAll(),
    ]);
    setUsers(usersData);
    setGuilds(guildsData);
    setAttempts(attemptsData);
    setChapterStats(chapterData);
    setLoading(false);
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-4xl animate-fade-in">
        <div className="surface-card flex flex-col items-center justify-center px-6 py-14 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-overpanel text-ink-muted">
            <Icon name="shield" size={26} />
          </div>
          <h1 className="font-display text-xl uppercase tracking-wide">Access denied</h1>
          <p className="mt-2 text-sm text-ink-muted">This page is restricted to admins.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 skeleton h-10 w-48" />
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const totalXP = attempts.reduce((s, a) => s + Number(a.xp_earned ?? 0), 0);
  const totalCoins = users.reduce((s, u) => s + Number(u.coins ?? 0), 0);
  const totalCorrect = attempts.reduce((s, a) => s + Number(a.correct_answers ?? 0), 0);
  const totalQuestions = attempts.reduce((s, a) => s + Number(a.total_questions ?? 0), 0);

  const attemptCounts = new Map<string, number>();
  for (const a of chapterStats) {
    const g = a.guild_id as string | undefined;
    if (g) attemptCounts.set(g, (attemptCounts.get(g) ?? 0) + 1);
  }

  const topGuilds = [...guilds]
    .map((g) => {
      const count = attemptCounts.get(g.id) ?? 0;
      return { guild: g, attempts: count };
    })
    .sort((a, b) => b.attempts - a.attempts)
    .slice(0, 5);

  const recentAttempts = [...attempts]
    .sort((a, b) =>
      String(b.completed_at ?? "").localeCompare(String(a.completed_at ?? "")),
    )
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-6xl animate-fade-in">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-volt/10 text-volt">
          <Icon name="shield" size={20} />
        </div>
        <div>
          <p className="eyebrow text-ink-muted">Admin</p>
          <h1 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">Overview</h1>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <StatPill value={String(users.length)} label="users" />
        <StatPill value={String(guilds.length)} label="guilds" />
        <StatPill value={String(attempts.length)} label="attempts" />
        <StatPill value={formatCoins(totalCoins)} label="coins" />
        <StatPill value={`${totalXP.toLocaleString()} XP`} label="xp given" />
        <StatPill
          value={totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) + "%" : "—"}
          label="accuracy"
        />
      </div>

      <div className="mb-8">
        <p className="mb-3 text-[13px] text-ink-muted">Top guilds by activity</p>
        <div className="space-y-2">
          {topGuilds.map(({ guild, attempts: count }, i) => (
            <Card key={guild.id} className={`flex items-center gap-3 p-3.5 ${i === 0 ? "border-volt/50 bg-volt/10" : ""}`}>
              <span className="w-6 shrink-0 text-center font-display text-lg text-ink-muted">
                {i + 1}
              </span>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-overpanel text-volt">
                <Icon name="users" size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{String(guild.name)}</p>
                <p className="text-xs text-ink-muted">ID: {guild.id}</p>
              </div>
              <span className="font-mono text-sm tabular-nums text-volt">
                {count}
                <span className="ml-1 text-xs text-ink-muted">quizzes</span>
              </span>
            </Card>
          ))}
          {topGuilds.length === 0 ? (
            <Card className="py-8 text-center text-sm text-ink-muted">No guild activity yet.</Card>
          ) : null}
        </div>
      </div>

      <div>
        <p className="mb-3 text-[13px] text-ink-muted">Recent attempts</p>
        <div className="overflow-hidden rounded-lg border border-line">
          {recentAttempts.map((a) => (
            <div key={a.id} className="flex items-center gap-3 border-b border-line bg-panel px-4 py-3 last:border-0">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span className="text-sm text-ink">
                  <span className="font-medium">{String(a.user_name ?? a.user_id ?? "…")}</span>
                  <span className="text-ink-muted"> scored {Number(a.correct_answers ?? 0)}/{Number(a.total_questions ?? 0)}</span>
                </span>
                <SubjectPill subject={String(a.subject)} />
                <DifficultyBadge difficulty={String(a.difficulty)} />
              </div>
              <span className="shrink-0 text-xs tabular-nums text-ink-faint">
                {a.completed_at ? new Date(String(a.completed_at)).toLocaleString() : ""}
              </span>
            </div>
          ))}
          {recentAttempts.length === 0 ? (
            <div className="bg-panel py-10 text-center text-sm text-ink-muted">No attempts yet.</div>
          ) : null}
        </div>
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] font-medium text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">XP</th>
              <th className="px-4 py-2.5 font-medium">Coins</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium">{String(u.name)}</td>
                <td className="px-4 py-3 text-ink-muted">{String(u.email)}</td>
                <td className="px-4 py-3 font-mono tabular-nums">{Number(u.xp ?? 0).toLocaleString()}</td>
                <td className="px-4 py-3 font-mono tabular-nums">{formatCoins(Number(u.coins ?? 0))}</td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-ink-muted">
                  No users yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}