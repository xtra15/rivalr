import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import {
  Card,
  Avatar,
  Tabs,
  StatPill,
  RankBadge,
  SubjectPill,
  DifficultyBadge,
  ChapterBadge,
  LiveBadge,
  Icon,
  Button,
  FormulaText,
  useToast,
  type IconName,
} from "@/components/ui";
import { formatAccuracy, formatTime, getLevel } from "@/utils/format";
import { GuildSettings } from "@/components/GuildSettings";
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
  const { toast } = useToast();

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
    toast("Invite code copied.", "success");
    setTimeout(() => setInviteCopied(false), 1500);
  }

  if (loading || (!guild && !loadError)) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="skeleton h-10 w-56 mb-4" />
        <div className="skeleton h-72 rounded-lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="surface-card flex flex-col items-center justify-center px-6 py-14 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-overpanel text-ink-muted">
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

  const sortedAttempts = [...attempts].sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime(),
  );

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="mb-8 flex flex-col gap-4 rounded-lg border border-line bg-panel p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-overpanel text-volt">
            <Icon name={(guild.icon as IconName) || "users"} size={24} />
          </div>
          <div>
            <p className="eyebrow text-ink-muted">Guild</p>
            <h1 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">{guild.name}</h1>
            {guild.description ? (
              <p className="mt-0.5 max-w-md text-sm text-ink-muted">{guild.description}</p>
            ) : null}
            <button
              onClick={copyInvite}
              className="mt-1 inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-ink-muted transition-colors hover:text-volt"
            >
              {inviteCopied ? (
                <>
                  <Icon name="check" size={14} className="text-success" />
                  <span className="text-success">Copied</span>
                </>
              ) : (
                <>
                  <Icon name="copy" size={14} />
                  <span className="font-mono tracking-wider text-ink-soft">{guild.invite_code}</span>
                </>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LiveBadge />
          <Link to={`/guild/${guildId}/quiz`}>
            <Button size="lg" className="w-full sm:w-auto">
              <Icon name="play" size={17} fill />
              Start Quiz
            </Button>
          </Link>
        </div>
      </div>

      <GuildSettings
        guildId={guildId!}
        guildName={guild.name}
        guildDescription={guild.description}
        guildIcon={guild.icon}
        createdBy={guild.created_by}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <StatPill value={String(members.length)} label={members.length === 1 ? "member" : "members"} />
        <StatPill value={String(attempts.length)} label="quizzes" />
        <StatPill value={String(leaderboard[0]?.totalXP ?? 0)} label="top xp" />
        <StatPill
          value={
            attempts.length
              ? formatAccuracy(
                  attempts.reduce((s, a) => s + a.correct_answers, 0),
                  attempts.reduce((s, a) => s + a.total_questions, 0),
                )
              : "—"
          }
          label="accuracy"
        />
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
              <OverviewTab leaderboard={leaderboard} memberMap={memberMap} currentUserId={user?.id ?? ""} />
            )}

            {activeTab === "rankings" && (
              <RankingsTab members={members} chapterStats={chapterStats} currentUserId={user?.id ?? ""} />
            )}

            {activeTab === "activity" && (
              <ActivityTab attempts={sortedAttempts} memberMap={memberMap} />
            )}

            {activeTab === "history" && (
              <HistoryTab members={members} attempts={sortedAttempts} memberMap={memberMap} />
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}

function OverviewTab({
  leaderboard,
  memberMap,
  currentUserId,
}: {
  leaderboard: { user: User; totalXP: number; totalCorrect: number; totalQuestions: number; quizCount: number }[];
  memberMap: Map<string, User>;
  currentUserId: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? leaderboard : leaderboard.slice(0, 8);

  return (
    <div className="grid gap-6 animate-fade-in lg:grid-cols-5">
      <section>
        <p className="mb-3 text-[13px] text-ink-muted">Members</p>
        <div className="space-y-3">
          {leaderboard.map((entry, i) => {
            const level = getLevel(entry.user.xp).level;
            return (
              <div
                key={entry.user.id}
                className={`flex items-center gap-3 border-l-[3px] px-2 py-1 ${
                  i === 0 ? "border-gold" : "border-transparent"
                }`}
              >
                <Avatar src={entry.user.avatar_url} name={entry.user.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {entry.user.name}
                    {entry.user.id === currentUserId ? (
                      <span className="ml-1.5 text-xs text-ink-muted">(you)</span>
                    ) : null}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md border border-line bg-panel px-1.5 py-0.5 text-[11px] font-medium text-ink-soft">
                      Lv {level}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-ink-muted">
                      {formatAccuracy(entry.totalCorrect, entry.totalQuestions)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="lg:col-span-3">
        <p className="mb-3 text-[13px] text-ink-muted">Overall standings</p>
        <div className="space-y-2">
          {visible.map((entry, i) => (
            <Card
              key={entry.user.id}
              className={`flex items-center gap-3 p-3.5 ${
                i === 0 ? "border-volt/50 bg-volt/10" : ""
              }`}
            >
              <RankBadge rank={i} />
              <Avatar src={entry.user.avatar_url} name={entry.user.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.user.name}</p>
                <p className="text-xs text-ink-muted">
                  {entry.quizCount} quizzes · {formatAccuracy(entry.totalCorrect, entry.totalQuestions)}
                </p>
              </div>
              <span className="font-mono text-sm font-medium tabular-nums text-volt">
                {entry.totalXP}
                <span className="ml-1 text-xs font-medium text-ink-muted">XP</span>
              </span>
            </Card>
          ))}
        </div>
        {leaderboard.length > 8 ? (
          <button
            onClick={() => setShowAll((s) => !s)}
            className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-volt transition-colors hover:text-volt-soft"
          >
            {showAll ? "Show less" : `See all ${leaderboard.length}`}
            <Icon name={showAll ? "chevron-down" : "chevron-right"} size={14} />
          </button>
        ) : null}
        {memberMap.size === 0 ? (
          <Card className="py-10 text-center text-sm text-ink-muted">
            No members yet. Share your invite code to bring your squad in.
          </Card>
        ) : null}
      </section>
    </div>
  );
}

function RankedTable({
  rows,
  currentUserId,
}: {
  rows: {
    userId: string;
    user?: User;
    attempts: number;
    accuracy: string;
    bestScore: number;
    bestTime: number | null;
    xp: number;
  }[];
  currentUserId: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-[11px] font-medium text-ink-muted">
            <th className="px-4 py-2.5 font-medium">Rank</th>
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="px-4 py-2.5 font-medium">Attempts</th>
            <th className="px-4 py-2.5 font-medium">Accuracy</th>
            <th className="px-4 py-2.5 font-medium">Best score</th>
            <th className="px-4 py-2.5 font-medium">Fastest</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isMe = row.userId === currentUserId;
            return (
              <tr
                key={row.userId}
                className={`border-b border-line last:border-0 ${
                  isMe ? "border-l-2 border-l-volt bg-panel-2" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <RankBadge rank={i} />
                </td>
                <td className="px-4 py-3 font-medium">
                  {row.user?.name ?? "—"}
                  {isMe ? <span className="ml-1.5 text-xs text-volt">(you)</span> : null}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">{row.attempts}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-ink">{row.accuracy}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-volt">{row.bestScore}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">
                  {row.bestTime !== null ? formatTime(row.bestTime) : "—"}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-sm text-ink-muted">
                No data for this selection yet
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
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

  const memberMap = new Map(members.map((m) => [m.id, m]));

  const chapters = [
    ...new Set(chapterStats.filter((s) => s.subject === subject).map((s) => s.chapter_number)),
  ].sort((a, b) => a - b);

  const filtered = chapterStats.filter(
    (s) =>
      s.subject === subject &&
      (chapterNum === null || s.chapter_number === chapterNum) &&
      (difficulty === null || s.difficulty === difficulty),
  );

  const byUser = new Map<
    string,
    { attempts: number; correct: number; total: number; bestScore: number; bestTime: number | null; xp: number }
  >();
  for (const s of filtered) {
    const existing = byUser.get(s.user_id) ?? {
      attempts: 0,
      correct: 0,
      total: 0,
      bestScore: 0,
      bestTime: null,
      xp: 0,
    };
    existing.attempts += s.attempts;
    existing.correct += s.correct_answers;
    existing.total += s.total_questions;
    existing.bestScore = Math.max(existing.bestScore, s.best_score);
    existing.bestTime =
      s.best_time_seconds !== null && s.best_time_seconds !== undefined
        ? existing.bestTime === null
          ? s.best_time_seconds
          : Math.min(existing.bestTime, s.best_time_seconds)
        : existing.bestTime;
    existing.xp += s.xp_earned;
    byUser.set(s.user_id, existing);
  }

  const ranked = [...byUser.entries()]
    .map(([userId, data]) => ({
      userId,
      user: memberMap.get(userId),
      attempts: data.attempts,
      accuracy: formatAccuracy(data.correct, data.total),
      bestScore: data.bestScore,
      bestTime: data.bestTime,
      xp: data.xp,
    }))
    .sort((a, b) => b.xp - a.xp);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <p className="mb-2 text-[13px] text-ink-muted">Subject</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {["Biology", "Chemistry", "Physics", "Additional Mathematics"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setSubject(s);
                setChapterNum(null);
                setDifficulty(null);
              }}
              className={`relative pb-1 text-sm font-medium transition-colors ${
                subject === s ? "text-volt" : "text-ink-muted hover:text-ink"
              }`}
            >
              {s}
              {subject === s ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-volt" /> : null}
            </button>
          ))}
        </div>
      </div>

      {chapters.length > 0 ? (
        <div>
          <p className="mb-2 text-[13px] text-ink-muted">Chapter</p>
          <div className="flex gap-2 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
            {chapters.map((c) => {
              const name = chapterStats.find(
                (s) => s.subject === subject && s.chapter_number === c,
              )?.chapter_name;
              return (
                <button
                  key={c}
                  title={name}
                  onClick={() => setChapterNum(c)}
                  className={`shrink-0 rounded-md border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                    chapterNum === c
                      ? "border-volt bg-volt text-field"
                      : "border-line bg-panel text-ink-muted hover:border-line-strong hover:text-ink"
                  }`}
                >
                  Ch {c}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {chapterNum !== null ? (
        <div>
          <p className="mb-2 text-[13px] text-ink-muted">Difficulty</p>
          <div className="flex gap-2">
            {["Easy", "Medium", "Hard", "KBAT"].map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(difficulty === d ? null : d)}
                className={`rounded-md border px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  difficulty === d
                    ? "border-volt bg-volt text-field"
                    : "border-line bg-panel text-ink-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {chapterNum !== null && difficulty !== null ? (
        <RankedTable rows={ranked} currentUserId={currentUserId} />
      ) : chapterNum !== null ? (
        <p className="text-sm text-ink-muted">Pick a difficulty to see rankings.</p>
      ) : (
        <p className="text-sm text-ink-muted">Pick a chapter to see rankings.</p>
      )}
    </div>
  );
}

function ActivityTab({
  attempts,
  memberMap,
}: {
  attempts: QuizAttempt[];
  memberMap: Map<string, User>;
}) {
  const [visible, setVisible] = useState(20);

  if (attempts.length === 0) {
    return (
      <Card className="py-10 text-center text-sm text-ink-muted">
        No activity yet. Start a quiz!
      </Card>
    );
  }

  return (
    <div className="animate-fade-in">
      <div>
        {attempts.slice(0, visible).map((a) => {
          const m = memberMap.get(a.user_id);
          return (
            <div key={a.id} className="flex items-center gap-3 border-b border-line py-3 first:pt-0 last:border-0">
              <Avatar src={m?.avatar_url ?? null} name={m?.name ?? "?"} size="sm" />
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <p className="text-sm text-ink">
                  <span className="font-medium">{m?.name}</span>{" "}
                  <span className="text-ink-muted">
                    scored {a.correct_answers}/{a.total_questions} on
                  </span>
                </p>
                <SubjectPill subject={a.subject} />
                <ChapterBadge form={a.form} chapterNum={a.chapter_number} chapterName={a.chapter_name} />
                <DifficultyBadge difficulty={a.difficulty} />
              </div>
              <span className="ml-auto shrink-0 text-xs tabular-nums text-ink-faint">
                {new Date(a.completed_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        })}
      </div>
      {visible < attempts.length ? (
        <Button variant="secondary" size="sm" className="mt-5" onClick={() => setVisible((v) => v + 20)}>
          Load more
        </Button>
      ) : null}
    </div>
  );
}

const SELECT_STYLE =
  "rounded-md border border-line-strong bg-panel px-3.5 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-volt/20";

function HistoryTab({
  members,
  attempts,
  memberMap,
}: {
  members: User[];
  attempts: QuizAttempt[];
  memberMap: Map<string, User>;
}) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [subject, setSubject] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const subjects = [...new Set(attempts.map((a) => a.subject))];
  const difficulties = [...new Set(attempts.map((a) => a.difficulty))];

  const filtered = attempts.filter(
    (a) =>
      (selectedUser === null || a.user_id === selectedUser) &&
      (subject === "all" || a.subject === subject) &&
      (difficulty === "all" || a.difficulty === difficulty),
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap gap-2">
        <select value={selectedUser ?? ""} onChange={(e) => setSelectedUser(e.target.value || null)} className={SELECT_STYLE}>
          <option value="">All members</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        {subjects.length > 0 ? (
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className={SELECT_STYLE}>
            <option value="all">All subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        ) : null}
        {difficulties.length > 0 ? (
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={SELECT_STYLE}>
            <option value="all">All difficulties</option>
            {difficulties.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <Card className="py-10 text-center text-sm text-ink-muted">
          No quizzes match. Change the filters or start a quiz.
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line">
          {filtered.map((a) => {
            const isExpanded = expandedId === a.id;
            const m = memberMap.get(a.user_id);
            return (
              <div key={a.id} className="border-b border-line last:border-0">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-overpanel"
                >
                  <span className="w-24 shrink-0 text-xs tabular-nums text-ink-muted">
                    {new Date(a.completed_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="w-9 shrink-0 text-xs text-ink-muted">F{a.form}</span>
                  <SubjectPill subject={a.subject} />
                  <ChapterBadge form={a.form} chapterNum={a.chapter_number} chapterName={a.chapter_name} />
                  <DifficultyBadge difficulty={a.difficulty} />
                  <span className="ml-auto shrink-0 font-mono text-sm tabular-nums text-ink">{a.correct_answers}/{a.total_questions}</span>
                  <span className="hidden shrink-0 font-mono text-xs tabular-nums text-ink-muted sm:inline">
                    {formatAccuracy(a.correct_answers, a.total_questions)}
                  </span>
                  <span className="hidden shrink-0 font-mono text-xs tabular-nums text-ink-faint md:inline">
                    {formatTime(a.time_taken_seconds)}
                  </span>
                  <Icon
                    name="chevron-down"
                    size={16}
                    className={`shrink-0 text-ink-muted transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>
                {isExpanded && (
                  <div className="space-y-2 border-t border-line bg-panel px-4 py-3 animate-slide-down">
                    <p className="text-xs text-ink-muted">
                      {m?.name ?? "Member"} · {new Date(a.completed_at).toLocaleString()}
                    </p>
                    {a.questions_data.map((q, qi) => (
                      <div key={qi} className="rounded-lg border border-line bg-overpanel/60 p-3">
                        <p className="text-sm font-medium leading-relaxed">
                          <span className="mr-1.5 text-ink-muted">Q{qi + 1}.</span>
                          <FormulaText text={q.question} />
                        </p>
                        <div className="mt-2 space-y-1">
                          {q.options.map((opt, oi) => {
                            const isRight = oi === q.correct;
                            const isWrong = oi === q.user_answer && !isRight;
                            return (
                              <p
                                key={oi}
                                className={`flex items-start gap-2 rounded-md px-2 py-1 text-[13px] leading-snug ${
                                  isRight
                                    ? "bg-success/10 text-success"
                                    : isWrong
                                      ? "bg-danger/10 text-danger"
                                      : "text-ink-muted"
                                }`}
                              >
                                <span className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-panel text-[10px] font-semibold text-ink-muted">
                                  {String.fromCharCode(65 + oi)}
                                </span>
                                <span className="min-w-0 flex-1"><FormulaText text={opt} /></span>
                                {isRight ? <Icon name="check" size={14} className="mt-0.5 shrink-0" /> : null}
                                {isWrong ? <Icon name="x" size={14} className="mt-0.5 shrink-0" /> : null}
                              </p>
                            );
                          })}
                        </div>
                        {q.explanation ? (
                          <p className="mt-2.5 border-t border-line pt-2 text-xs italic leading-relaxed text-ink-muted">
                            <FormulaText text={q.explanation} />
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}