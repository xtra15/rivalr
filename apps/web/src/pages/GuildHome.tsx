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

  useEffect(() => {
    if (!guildId) return;
    loadGuild();
  }, [guildId]);

  async function loadGuild() {
    if (!guildId) return;

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

    setLoading(false);
  }

  function copyInvite() {
    if (!guild) return;
    navigator.clipboard.writeText(guild.invite_code);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  if (loading || !guild) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="skeleton h-10 w-56 mb-4" />
        <div className="skeleton h-72 rounded-3xl" />
      </div>
    );
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
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-white/10">
            <Icon name="users" size={26} />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{guild.name}</h1>
            <button
              onClick={copyInvite}
              className="mt-1 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-navy-400 transition-colors hover:text-indigo-300"
            >
              {inviteCopied ? (
                <>
                  <Icon name="check" size={15} className="text-signal-success" />
                  <span className="text-signal-success">Copied</span>
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
                    <span className="text-xs font-medium uppercase tracking-wider text-navy-500">
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
                          <p className="text-xs text-navy-400">
                            {entry.quizCount} quizzes · {formatAccuracy(entry.totalCorrect, entry.totalQuestions)}
                          </p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-indigo-300">
                          {entry.totalXP}
                          <span className="ml-1 text-xs font-medium text-navy-500">XP</span>
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
                  <Card className="py-10 text-center text-sm text-navy-400">
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
                              <span className="text-navy-400">completed</span>{" "}
                              <span className="text-navy-200">
                                Form {a.form} {a.subject} · Ch.{a.chapter_number}
                              </span>
                            </p>
                            <p className="mt-0.5 flex items-center gap-2 text-xs text-navy-500">
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 text-navy-950 shadow-card">
        <Icon name="crown" size={16} strokeWidth={2.25} />
      </div>
    );
  }
  const styles =
    rank === 1
      ? "bg-slate-300/20 text-slate-200 ring-slate-300/40"
      : rank === 2
        ? "bg-orange-400/15 text-orange-300 ring-orange-400/40"
        : "bg-navy-800 text-navy-400 ring-navy-700";
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
              ${subject === s ? "bg-indigo-500 text-white shadow-card" : "bg-navy-800 text-navy-300 hover:bg-navy-700 hover:text-navy-100"}`}
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
            className="rounded-xl border border-navy-700 bg-navy-850 px-3.5 py-2 text-sm text-navy-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
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
                ${difficulty === d ? "bg-white text-navy-950" : "bg-navy-800 text-navy-300 hover:bg-navy-700"}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {ranked.length === 0 ? (
        <Card className="py-10 text-center text-sm text-navy-400">
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
                  isMe ? "border-indigo-500/40 bg-indigo-500/10" : ""
                }`}
              >
                <RankBadge rank={i} />
                <Avatar src={m?.avatar_url ?? null} name={m?.name ?? "?"} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m?.name}
                    {isMe ? <span className="ml-2 text-xs font-medium text-indigo-300">You</span> : null}
                  </p>
                  <p className="text-xs text-navy-400">
                    {entry.attempts} attempts · {formatAccuracy(entry.correct, entry.attempts * 10)}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-indigo-300">
                  {entry.xp}
                  <span className="ml-1 text-xs font-medium text-navy-500">XP</span>
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
  "rounded-xl border border-navy-700 bg-navy-850 px-3.5 py-2 text-sm text-navy-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/25";

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
                    <p className="mt-0.5 text-xs text-navy-500">
                      {new Date(a.completed_at).toLocaleDateString()} · {formatTime(a.time_taken_seconds)}
                    </p>
                  </div>
                  <Badge className={DIFFICULTY_COLORS[a.difficulty]}>{a.difficulty}</Badge>
                  <span className="text-sm font-semibold tabular-nums text-navy-200">
                    {a.correct_answers}/{a.total_questions}
                  </span>
                  <Icon
                    name="chevron-down"
                    size={16}
                    className={`shrink-0 text-navy-500 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  />
                </div>
              </Card>
              {isExpanded && (
                <div className="mt-2 ml-10 space-y-2 animate-slide-down">
                  {a.questions_data.map((q, qi) => (
                    <div
                      key={qi}
                      className="rounded-2xl border border-navy-800 bg-navy-850/60 p-4"
                    >
                      <p className="text-sm font-medium leading-relaxed">
                        <span className="mr-1.5 text-navy-500">Q{qi + 1}.</span>
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
                                isRight ? "bg-signal-success/10 text-signal-success" : isWrong ? "bg-signal-danger/10 text-signal-danger" : "text-navy-400"
                              }`}
                            >
                              <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-navy-800 text-[10px] font-semibold">
                                {String.fromCharCode(65 + oi)}
                              </span>
                              <span className="min-w-0 flex-1">{opt}</span>
                              {isRight ? <Icon name="check" size={14} className="mt-0.5 shrink-0" /> : null}
                              {isWrong ? <Icon name="x" size={14} className="mt-0.5 shrink-0" /> : null}
                            </p>
                          );
                        })}
                      </div>
                      <p className="mt-2.5 border-t border-navy-800 pt-2.5 text-xs italic leading-relaxed text-navy-500">
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
          <Card className="py-10 text-center text-sm text-navy-400">No quiz history yet</Card>
        )}
      </div>
    </div>
  );
}