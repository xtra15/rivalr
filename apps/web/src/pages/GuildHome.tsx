import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { Card, Avatar, Badge, Tabs, StatCard } from "@/components/ui";
import { Button } from "@/components/ui/Button";
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
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="skeleton h-8 w-48 mb-4" />
        <div className="skeleton h-64 rounded-xl" />
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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{guild.name}</h1>
          <button
            onClick={copyInvite}
            className="mt-1 text-sm text-navy-400 hover:text-indigo-400 transition-colors font-mono"
          >
            {inviteCopied ? "Copied!" : `Invite: ${guild.invite_code}`}
          </button>
        </div>
        <Link to={`/guild/${guildId}/quiz`}>
          <Button>Start Quiz</Button>
        </Link>
      </div>

      <Tabs
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "rankings", label: "Rankings" },
          { id: "activity", label: "Activity" },
          { id: "history", label: "History" },
        ]}
      >
        {(activeTab) => (
          <>
            {activeTab === "overview" && (
              <div className="space-y-6 animate-fade-in">
                <div className="grid gap-3 sm:grid-cols-4">
                  <StatCard label="Members" value={members.length} />
                  <StatCard label="Total Quizzes" value={attempts.length} />
                  <StatCard label="Top XP" value={leaderboard[0]?.totalXP ?? 0} />
                  <StatCard label="Avg Accuracy" value={attempts.length ? formatAccuracy(
                    attempts.reduce((s, a) => s + a.correct_answers, 0),
                    attempts.reduce((s, a) => s + a.total_questions, 0),
                  ) : "—"} />
                </div>

                <h3 className="font-semibold">Members</h3>
                <div className="space-y-2">
                  {leaderboard.map((entry, i) => (
                    <Card key={entry.user.id} className="flex items-center gap-3 p-3">
                      <span className="w-6 text-center text-sm font-bold text-navy-400">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                      </span>
                      <Avatar src={entry.user.avatar_url} name={entry.user.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{entry.user.name}</p>
                        <p className="text-xs text-navy-400">
                          {entry.quizCount} quizzes · {formatAccuracy(entry.totalCorrect, entry.totalQuestions)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-indigo-400">
                        {entry.totalXP} XP
                      </span>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "rankings" && (
              <RankingsTab
                members={members}
                chapterStats={chapterStats}
                currentUserId={user?.id ?? ""}
              />
            )}

            {activeTab === "activity" && (
              <div className="space-y-2 animate-fade-in">
                {attempts.length === 0 ? (
                  <Card className="text-center py-8 text-navy-400">
                    No activity yet. Start a quiz!
                  </Card>
                ) : (
                  attempts.slice(0, 20).map((a) => {
                    const m = memberMap.get(a.user_id);
                    return (
                      <Card key={a.id} className="p-3">
                        <div className="flex items-center gap-2">
                          <Avatar src={m?.avatar_url ?? null} name={m?.name ?? "?"} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-medium">{m?.name}</span>{" "}
                              completed{" "}
                              <span className="text-navy-300">
                                Form {a.form} {a.subject} · Ch.{a.chapter_number}
                              </span>
                            </p>
                            <p className="text-xs text-navy-400">
                              {a.correct_answers}/{a.total_questions} · {a.difficulty} · {formatTime(a.time_taken_seconds)}
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

            {activeTab === "history" && (
              <HistoryTab
                members={members}
                attempts={attempts}
              />
            )}
          </>
        )}
      </Tabs>
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

  const byUser = new Map<string, { attempts: number; correct: number; xp: number; bestScore: number; bestTime: number | null }>();
  for (const s of filtered) {
    const existing = byUser.get(s.user_id) ?? { attempts: 0, correct: 0, xp: 0, bestScore: 0, bestTime: null };
    existing.attempts += s.attempts;
    existing.correct += s.correct_answers;
    existing.xp += s.xp_earned;
    if (s.best_score > existing.bestScore) existing.bestScore = s.best_score;
    if (s.best_time_seconds !== null && (existing.bestTime === null || s.best_time_seconds < existing.bestTime)) {
      existing.bestTime = s.best_time_seconds;
    }
    byUser.set(s.user_id, existing);
  }

  const ranked = [...byUser.entries()]
    .map(([uid, data]) => ({ userId: uid, ...data }))
    .sort((a, b) => b.xp - a.xp);

  const memberMap = new Map(members.map((m) => [m.id, m]));

  const chapters = [...new Set(chapterStats.filter((s) => s.subject === subject).map((s) => s.chapter_number))].sort((a, b) => a - b);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap gap-2">
        {["Biology", "Chemistry", "Physics", "Additional Mathematics"].map((s) => (
          <button
            key={s}
            onClick={() => { setSubject(s); setChapterNum(null); setDifficulty(null); }}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors
              ${subject === s ? "bg-indigo-500 text-white" : "bg-navy-800 text-navy-300 hover:bg-navy-700"}`}
          >
            {s}
          </button>
        ))}
      </div>

      {chapters.length > 0 && (
        <select
          value={chapterNum ?? ""}
          onChange={(e) => setChapterNum(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm"
        >
          <option value="">All chapters</option>
          {chapters.map((c) => (
            <option key={c} value={c}>Chapter {c}</option>
          ))}
        </select>
      )}

      {chapterNum !== null && (
        <div className="flex gap-1">
          {["Easy", "Medium", "Hard", "KBAT"].map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(difficulty === d ? null : d)}
              className={`rounded-lg px-3 py-1.5 text-xs transition-colors
                ${difficulty === d ? "bg-indigo-500 text-white" : "bg-navy-800 text-navy-300 hover:bg-navy-700"}`}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {ranked.length === 0 ? (
          <Card className="text-center py-8 text-navy-400">
            No data for this selection yet
          </Card>
        ) : (
          ranked.map((entry, i) => {
            const m = memberMap.get(entry.userId);
            return (
              <Card
                key={entry.userId}
                className={`flex items-center gap-3 p-3 ${entry.userId === currentUserId ? "border-indigo-500/50 bg-indigo-500/5" : ""}`}
              >
                <span className="w-6 text-center text-sm font-bold text-navy-400">{i + 1}</span>
                <Avatar src={m?.avatar_url ?? null} name={m?.name ?? "?"} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m?.name}</p>
                  <p className="text-xs text-navy-400">
                    {entry.attempts} attempts · {formatAccuracy(entry.correct, entry.attempts * 10)}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-indigo-400">
                  {entry.xp} XP
                </span>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

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
        className="rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm"
      >
        <option value="">All members</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      <div className="space-y-2">
        {filtered.map((a) => {
          const m = memberMap.get(a.user_id);
          const isExpanded = expandedId === a.id;
          return (
            <div key={a.id}>
              <Card
                hover
                className="p-3"
                onClick={() => setExpandedId(isExpanded ? null : a.id)}
              >
                <div className="flex items-center gap-3">
                  <Avatar src={m?.avatar_url ?? null} name={m?.name ?? "?"} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      Form {a.form} {a.subject} · Ch.{a.chapter_number}: {a.chapter_name}
                    </p>
                    <p className="text-xs text-navy-400">
                      {new Date(a.completed_at).toLocaleDateString()} · {formatTime(a.time_taken_seconds)}
                    </p>
                  </div>
                  <Badge className={DIFFICULTY_COLORS[a.difficulty]}>{a.difficulty}</Badge>
                  <span className="text-sm font-semibold tabular-nums">
                    {a.correct_answers}/{a.total_questions}
                  </span>
                </div>
              </Card>
              {isExpanded && (
                <div className="mt-2 ml-8 space-y-2 animate-slide-down">
                  {a.questions_data.map((q, qi) => (
                    <div key={qi} className="rounded-lg border border-navy-700 bg-navy-800/50 p-3">
                      <p className="text-sm font-medium mb-1">Q{qi + 1}. {q.question}</p>
                      {q.options.map((opt, oi) => (
                        <p
                          key={oi}
                          className={`text-xs ml-4 py-0.5 ${
                            oi === q.correct
                              ? "text-green-400"
                              : oi === q.user_answer
                                ? "text-red-400"
                                : "text-navy-400"
                          }`}
                        >
                          {String.fromCharCode(65 + oi)}. {opt}
                          {oi === q.correct ? " ✓" : ""}
                          {oi === q.user_answer && oi !== q.correct ? " ✗" : ""}
                        </p>
                      ))}
                      <p className="text-xs text-navy-400 mt-1 italic">{q.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <Card className="text-center py-8 text-navy-400">No quiz history yet</Card>
        )}
      </div>
    </div>
  );
}
