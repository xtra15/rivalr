import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { Card, Avatar, Badge, Tabs, StatCard, Icon, Button } from "@/components/ui";
import { formatAccuracy, formatTime, DIFFICULTY_COLORS } from "@/utils/format";
import type { Guild, User, QuizAttempt, UserChapterStats } from "@rivalr/shared";

export default function GuildHome() {
  const { guildId } = useParams<{ guildId: string }>();
  const { user } = useAuth();
  const [guild, setGuild] = useState<Guild | null>(null);
  const [members, setMembers] = useState<User[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [chapterStats, setChapterStats] = useState<UserChapterStats[]>([]);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!guildId) return;
    loadGuild();
  }, [guildId]);

  async function loadGuild() {
    if (!guildId) return;
    setLoadError(null);
    try {
      const g = await firestore.guilds.get(guildId);
      setGuild(g as Guild);

      const memberRows = await firestore.guildMembers.getByGuild(guildId);

      if (memberRows.length) {
        const userIds = memberRows.map((m) => m.user_id as string);
        const users = await firestore.usersBatch.getByIds(userIds);
        setMembers(users as unknown as User[]);
      }

      const quizData = await firestore.quizAttempts.getByGuild(guildId);
      setAttempts(quizData as unknown as QuizAttempt[]);

      const stats = await firestore.userChapterStats.getAll();
      setChapterStats(stats as unknown as UserChapterStats[]);
    } catch (e) {
      console.error("Failed to load guild", e);
      setLoadError("Could not load this guild. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyInvite() {
    if (!guild) return;
    navigator.clipboard.writeText(guild.invite_code);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  if (loading || (!guild && !loadError)) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="skeleton h-10 w-56 mb-4" />
        <div className="skeleton h-72 rounded-3xl" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="surface-card flex flex-col items-center justify-center px-6 py-14 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-wash text-ink-muted">
            <Icon name="info" size={26} />
          </div>
          <p className="text-base font-semibold">{loadError}</p>
          <Button className="mt-5" size="sm" onClick={() => loadGuild()}>
            <Icon name="refresh" size={16} />
            Try again
          </Button>
        </div>
      </div>
    );
  }

  if (!guild) {
    return null;
  }

  const memberMap = new Map(members.map((m) => [m.id, m]));

  const leaderboard = [...members]
    .map((m) => {
      const memberAttempts = attempts.filter((a) => a.user_id === m.id);
      const totalXP = memberAttempts.reduce((s, a) => s + a.xp_earned, 0);
      const totalCorrect = memberAttempts.reduce((s, a) => s + a.correct_answers, 0);
      const totalQuestions = memberAttempts.reduce((s, a) => s + a.total_questions, 0);
      return { user: m, totalXP, totalCorrect, totalQuestions, quizCount: memberAttempts.length };
    })
    .sort((a, b) => b.totalXP - a.totalXP);

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Icon name="users" size={26} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{guild.name}</h1>
            <button
              onClick={copyInvite}
              className="mt-1 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-ink-muted transition-colors hover:text-accent"
            >
              {inviteCopied ? (
                <>
                  <Icon name="check" size={15} className="text-success" />
                  <span className="text-success">Copied</span>
                </>
              ) : (
                <>
                  <Icon name="copy" size={15} />
                  <span className="font-mono tracking-wider">{guild.invite_code}</span>
                </>
              )}
            </button>
          </div>
        </div>
        <Link to={`/guild/${guildId}/quiz`}>
          <Button size="lg" className="w-full sm:w-auto">
            <Icon name="play" size={17} fill />
            Start Quiz
          </Button>
        </Link>
      </div>

      <Tabs
        tabs={[
          { id: "overview", label: "Overview", icon: "grid" },
          { id: "rankings", label: "Rankings", icon: "trophy" },
          { id: "activity", label: "Activity", icon: "zap" },
          { id: "history", label: "History", icon: "book" },
        ]}
      >
        {(activeTab) => (
          <>
            {activeTab === "overview" && (
              <div className="space-y-7 animate-fade-in">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="Members" value={members.length} icon="users" />
                  <StatCard label="Quizzes" value={attempts.length} icon="target" tint="accent" />
                  <StatCard label="Top XP" value={leaderboard[0]?.totalXP ?? 0} icon="zap" tint="warning" />
                  <StatCard
                    label="Accuracy"
                    value={
                      attempts.length
                        ? formatAccuracy(
                            attempts.reduce((s, a) => s + a.correct_answers, 0),
                            attempts.reduce((s, a) => s + a.total_questions, 0),
                          )
                        : "—"
                    }
                    icon="trophy"
                    tint="success"
                  />
                </div>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-base font-semibold">Members</h3>
                    <span className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                      Leaderboard
                    </span>
                  </div>
                  <div className="space-y-2">
                    {leaderboard.map((entry, i) => (
                      <Card key={entry.user.id} className="flex items-center gap-3 p-3.5">
                        <RankBadge rank={i} />
                        <Avatar src={entry.user.avatar_url} name={entry.user.name} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{entry.user.name}</p>
                          <p className="text-xs text-ink-muted">
                            {entry.quizCount} quizzes · {formatAccuracy(entry.totalCorrect, entry.totalQuestions)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-accent">
                          {entry.totalXP}
                          <span className="ml-1 text-xs font-medium text-ink-muted">XP</span>
                        </span>
                      </Card>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "rankings" && (
              <RankingsTab members={members} chapterStats={chapterStats} currentUserId={user?.id ?? ""} />
            )}

            {activeTab === "activity" && (
              <div className="space-y-2.5 animate-fade-in">
                {attempts.length === 0 ? (
                  <Card className="py-10 text-center text-sm text-ink-muted">
                    No activity yet. Start a quiz!
                  </Card>
                ) : (
                  attempts.slice(0, 20).map((a) => {
                    const m = memberMap.get(a.user_id);
                    return (
                      <Card key={a.id} className="p-4">
                        <div className="flex items-center gap-3">
                          <Avatar src={m?.avatar_url ?? null} name={m?.name ?? "?"} size="md" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-snug">
                              <span className="font-medium">{m?.name}</span>{" "}
                              <span className="text-ink-muted">completed</span>{" "}
                              <span className="text-ink">
                                Form {a.form} {a.subject} · Ch.{a.chapter_number}
                              </span>
                            </p>
                            <p className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
                              <span className="inline-flex items-center gap-1">
                                <Icon name="timer" size={13} />
                                {formatTime(a.time_taken_seconds)}
                              </span>
                              · {a.difficulty}
                            </p>
                          </div>
                          <Badge variant={a.correct_answers === a.total_questions ? "success" : "default"}>
                            {a.correct_answers}/{a.total_questions}
                          </Badge>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === "history" && <HistoryTab members={members} attempts={attempts} />}
          </>
        )}
      </Tabs>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 0) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400 text-ink shadow-card">
        <Icon name="crown" size={16} strokeWidth={2.25} />
      </div>
    );
  }
  const styles =
    rank === 1
      ? "bg-line text-ink-soft ring-line-strong"
      : rank === 2
        ? "bg-orange-500/10 text-orange-700 ring-orange-500/30"
        : "bg-wash text-ink-muted ring-line-strong";
  return (
    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums ring-1 ${styles}`}>
      {rank + 1}
    </div>
  );
}

function RankingsTab({
  members,
  chapterStats,
  currentUserId,
}: {
  members: User[];
  chapterStats: UserChapterStats[];
  currentUserId: string;
}) {
  const [subject, setSubject] = useState<string>("Biology");
  const [chapterNum, setChapterNum] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<string | null>(null);

  const filtered = chapterStats.filter(
    (s) =>
      s.subject === subject &&
      (chapterNum === null || s.chapter_number === chapterNum) &&
      (difficulty === null || s.difficulty === difficulty),
  );

  const byUser = new Map<string, { attempts: number; correct: number; xp: number }>();
  for (const s of filtered) {
    const existing = byUser.get(s.user_id) ?? { attempts: 0, correct: 0, xp: 0 };
    existing.attempts += s.attempts;
    existing.correct += s.correct_answers;
    existing.xp += s.xp_earned;
    byUser.set(s.user_id, existing);
  }

  const ranked = [...byUser.entries()]
    .map(([uid, data]) => ({ userId: uid, ...data }))
    .sort((a, b) => b.xp - a.xp);

  const memberMap = new Map(members.map((m) => [m.id, m]));

  const chapters = [...new Set(chapterStats.filter((s) => s.subject === subject).map((s) => s.chapter_number))].sort((a, b) => a - b);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap gap-2">
        {["Biology", "Chemistry", "Physics", "Additional Mathematics"].map((s) => (
          <button
            key={s}
            onClick={() => {
              setSubject(s);
              setChapterNum(null);
              setDifficulty(null);
            }}
            aria-pressed={subject === s}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all
              ${subject === s ? "bg-accent text-white shadow-card" : "bg-wash text-ink-soft hover:bg-line hover:text-ink"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {chapters.length > 0 && (
          <select
            value={chapterNum ?? ""}
            onChange={(e) => setChapterNum(e.target.value ? Number(e.target.value) : null)}
            className="rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20"
          >
            <option value="">All chapters</option>
            {chapters.map((c) => (
              <option key={c} value={c}>Chapter {c}</option>
            ))}
          </select>
        )}

        <div className="flex gap-1.5">
          {["Easy", "Medium", "Hard", "KBAT"].map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(difficulty === d ? null : d)}
              aria-pressed={difficulty === d}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all
                ${difficulty === d ? "bg-ink text-white" : "bg-wash text-ink-soft hover:bg-line"}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {ranked.length === 0 ? (
        <Card className="py-10 text-center text-sm text-ink-muted">
          No data for this selection yet
        </Card>
      ) : (
        <div className="space-y-2">
          {ranked.map((entry, i) => {
            const m = memberMap.get(entry.userId);
            const isMe = entry.userId === currentUserId;
            return (
              <Card
                key={entry.userId}
                className={`flex items-center gap-3 p-3.5 ${
                  isMe ? "border-accent/40 bg-accent/10" : ""
                }`}
              >
                <RankBadge rank={i} />
                <Avatar src={m?.avatar_url ?? null} name={m?.name ?? "?"} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m?.name}
                    {isMe ? <span className="ml-2 text-xs font-medium text-accent">You</span> : null}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {entry.attempts} attempts · {formatAccuracy(entry.correct, entry.attempts * 10)}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-accent">
                  {entry.xp}
                  <span className="ml-1 text-xs font-medium text-ink-muted">XP</span>
                </span>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SELECT_STYLE =
  "rounded-xl border border-line-strong bg-surface px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/20";

function HistoryTab({
  members,
  attempts,
}: {
  members: User[];
  attempts: QuizAttempt[];
}) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const memberMap = new Map(members.map((m) => [m.id, m]));

  const filtered = selectedUser ? attempts.filter((a) => a.user_id === selectedUser) : attempts;

  return (
    <div className="space-y-4 animate-fade-in">
      <select
        value={selectedUser ?? ""}
        onChange={(e) => setSelectedUser(e.target.value || null)}
        className={SELECT_STYLE}
      >
        <option value="">All members</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      <div className="space-y-2.5">
        {filtered.map((a) => {
          const m = memberMap.get(a.user_id);
          const isExpanded = expandedId === a.id;
          return (
            <div key={a.id}>
              <Card
                hover
                className="p-4"
                onClick={() => setExpandedId(isExpanded ? null : a.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar src={m?.avatar_url ?? null} name={m?.name ?? "?"} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      Form {a.form} {a.subject} · Ch.{a.chapter_number}: {a.chapter_name}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {new Date(a.completed_at).toLocaleDateString()} · {formatTime(a.time_taken_seconds)}
                    </p>
                  </div>
                  <Badge className={DIFFICULTY_COLORS[a.difficulty]}>{a.difficulty}</Badge>
                  <span className="text-sm font-semibold tabular-nums text-ink">
                    {a.correct_answers}/{a.total_questions}
                  </span>
                  <Icon
                    name="chevron-down"
                    size={16}
                    className={`shrink-0 text-ink-muted transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  />
                </div>
              </Card>
              {isExpanded && (
                <div className="mt-2 ml-10 space-y-2 animate-slide-down">
                  {a.questions_data.map((q, qi) => (
                    <div
                      key={qi}
                      className="rounded-2xl border border-line bg-wash/60 p-4"
                    >
                      <p className="text-sm font-medium leading-relaxed">
                        <span className="mr-1.5 text-ink-muted">Q{qi + 1}.</span>
                        {q.question}
                      </p>
                      <div className="mt-2 space-y-1">
                        {q.options.map((opt, oi) => {
                          const isRight = oi === q.correct;
                          const isWrong = oi === q.user_answer && !isRight;
                          return (
                            <p
                              key={oi}
                              className={`flex items-start gap-2 rounded-lg px-2 py-1 text-[13px] leading-snug ${
                                isRight ? "bg-success/10 text-success" : isWrong ? "bg-danger/10 text-danger" : "text-ink-muted"
                              }`}
                            >
                              <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-wash text-[10px] font-semibold text-ink-muted">
                                {String.fromCharCode(65 + oi)}
                              </span>
                              <span className="min-w-0 flex-1">{opt}</span>
                              {isRight ? <Icon name="check" size={14} className="mt-0.5 shrink-0" /> : null}
                              {isWrong ? <Icon name="x" size={14} className="mt-0.5 shrink-0" /> : null}
                            </p>
                          );
                        })}
                      </div>
                      <p className="mt-2.5 border-t border-line pt-2.5 text-xs italic leading-relaxed text-ink-muted">
                        {q.explanation}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <Card className="py-10 text-center text-sm text-ink-muted">No quiz history yet</Card>
        )}
      </div>
    </div>
  );
}