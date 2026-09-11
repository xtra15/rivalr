import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import {
  Card,
  Avatar,
  StatPill,
  Tabs,
  CoinBalance,
  Icon,
  Button,
  EmptyState,
  achievementIcon,
  type IconName,
} from "@/components/ui";
import { getLevel, formatAccuracy, formatCoins } from "@/utils/format";
import { CustomTauntManager } from "@/components/CustomTauntManager";
import { AvatarUploadManager } from "@/components/AvatarUploadManager";
import type { UserSubjectStats, UserAchievement, ShopItem } from "@rivalr/shared";

interface EnrichedAchievement {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement: { id: string; icon: string; name: string; description?: string };
}

interface CatalogAchievement {
  id: string;
  icon: string;
  name: string;
  description?: string;
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [subjectStats, setSubjectStats] = useState<UserSubjectStats[]>([]);
  const [achievements, setAchievements] = useState<EnrichedAchievement[]>([]);
  const [catalog, setCatalog] = useState<CatalogAchievement[]>([]);
  const [status, setStatus] = useState(user?.status ?? "");
  const [statusSaved, setStatusSaved] = useState(false);
  const [equipped, setEquipped] = useState<
    { item: ShopItem; purchased_at: string }[]
  >([]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;

    const stats = await firestore.userSubjectStats.get(user.id);
    setSubjectStats(stats as unknown as UserSubjectStats[]);

    const achs = (await firestore.userAchievements.get(user.id)) as unknown as UserAchievement[];
    const allAchievements = (await firestore.achievements.getAll()) as unknown as CatalogAchievement[];
    setCatalog(allAchievements);

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

    const inv = (await firestore.userInventory.get(user.id)) as unknown as {
      item_id: string;
      is_equipped: boolean;
      purchased_at: string;
    }[];
    const shopItems = (await firestore.shopItems.getAll()) as unknown as ShopItem[];
    const eqItems = inv
      .filter((i) => i.is_equipped)
      .map((i) => ({ item: shopItems.find((s) => s.id === i.item_id), purchased_at: i.purchased_at }))
      .filter((x): x is { item: ShopItem; purchased_at: string } => x.item !== undefined);
    setEquipped(eqItems);
  }

  if (!user) return null;

  async function saveStatus() {
    if (!user) return;
    const trimmed = status.trim().slice(0, 60);
    await firestore.users.updateStatus(user.id, trimmed);
    await refreshUser();
    setStatus(trimmed);
    setStatusSaved(true);
    setTimeout(() => setStatusSaved(false), 1500);
  }

  const level = getLevel(user.xp);
  const totalQuizzes = subjectStats.reduce((s, st) => s + st.quizzes_completed, 0);
  const totalCorrect = subjectStats.reduce((s, st) => s + st.correct_answers, 0);
  const totalQuestions = subjectStats.reduce((s, st) => s + st.total_questions, 0);

  const unlockedIds = new Set(achievements.map((a) => a.achievement_id));
  const locked =
    catalog.length > 0 ? catalog.filter((c) => !unlockedIds.has(c.id)) : [];

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:border-r lg:border-line lg:pr-8">
          <Avatar src={user.avatar_url} name={user.name} size="lg" />
          <AvatarUploadManager />
          <h1 className="mt-4 font-display text-2xl uppercase tracking-wide">{user.name}</h1>
          <p className="mt-1 text-sm text-ink-muted">{user.email}</p>

          <div className="mt-4">
            <div className="flex items-center gap-2">
              <input
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                maxLength={60}
                placeholder="Add a status…"
                aria-label="Profile status"
                className="min-w-0 flex-1 rounded-md border border-line-strong bg-field px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-volt/20"
              />
              <Button
                size="sm"
                variant={statusSaved ? "secondary" : "primary"}
                disabled={status === (user.status ?? "") || statusSaved}
                onClick={saveStatus}
              >
                {statusSaved ? "Saved" : "Set status"}
              </Button>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-sm font-medium text-ink-soft">Level {level.level}</span>
              <CoinBalance coins={user.coins} className="text-xs" />
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-overpanel">
              <div
                className="h-full rounded-full bg-volt transition-all duration-300"
                style={{ width: `${Math.min((level.currentXP / level.nextLevelXP) * 100, 100)}%` }}
              />
            </div>
            <p className="mt-2 font-mono text-xs tabular-nums text-ink-muted">
              {level.currentXP.toLocaleString()} / {level.nextLevelXP.toLocaleString()} XP
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <StatPill value={String(totalQuizzes)} label="quizzes" />
            <StatPill value={formatAccuracy(totalCorrect, totalQuestions)} label="accuracy" />
          </div>
        </div>

        <div className="min-w-0 lg:col-span-2">
          <Tabs
            tabs={[
              { id: "stats", label: "Stats", icon: "grid" },
              { id: "achievements", label: "Achievements", icon: "medal" },
              { id: "equipped", label: "Equipped", icon: "bag" },
            ]}
          >
            {(activeTab) => (
              <>
                {activeTab === "stats" && <StatsTab subjectStats={subjectStats} />}
                {activeTab === "achievements" && (
                  <AchievementsTab achievements={achievements} locked={locked} />
                )}
                {activeTab === "equipped" && <EquippedTab equipped={equipped} onChanged={() => loadData()} />}
              </>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function StatsTab({ subjectStats }: { subjectStats: UserSubjectStats[] }) {
  return (
    <div className="animate-fade-in">
      {subjectStats.length === 0 ? (
        <EmptyState
          icon="book"
          title="No statistics yet"
          description="Complete your first quiz to see your per-subject breakdown."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-medium text-ink-muted">
                <th className="px-4 py-2.5 font-medium">Subject</th>
                <th className="px-4 py-2.5 font-medium">Quizzes</th>
                <th className="px-4 py-2.5 font-medium">Accuracy</th>
                <th className="px-4 py-2.5 font-medium">Best streak</th>
                <th className="px-4 py-2.5 font-medium">XP</th>
              </tr>
            </thead>
            <tbody>
              {subjectStats.map((s) => (
                <tr key={s.subject} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{s.subject}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">{s.quizzes_completed}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-ink">
                    {formatAccuracy(s.correct_answers, s.total_questions)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">{s.best_streak}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-volt">{s.xp_earned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AchievementsTab({
  achievements,
  locked,
}: {
  achievements: EnrichedAchievement[];
  locked: CatalogAchievement[];
}) {
  if (achievements.length === 0 && locked.length === 0) {
    return (
      <div className="animate-fade-in">
        <EmptyState
          icon="medal"
          title="No achievements yet"
          description="Complete your first quiz to earn achievements."
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 animate-fade-in">
      {achievements.map((a) => (
        <div key={a.achievement_id} className="rounded-lg border border-line bg-panel p-3.5 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-volt/10 text-volt">
            <Icon name={achievementIcon(a.achievement.name)} size={22} />
          </div>
          <p className="text-[13px] font-medium leading-tight">{a.achievement.name}</p>
          {a.achievement.description ? (
            <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{a.achievement.description}</p>
          ) : null}
          <p className="mt-1.5 font-mono text-[11px] text-ink-faint">
            {new Date(a.unlocked_at).toLocaleDateString()}
          </p>
        </div>
      ))}
      {locked.map((c) => (
        <div key={c.id} className="rounded-lg border border-line bg-overpanel/60 p-3.5 text-center opacity-50">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-panel text-ink-faint">
            <Icon name={achievementIcon(c.name)} size={22} />
          </div>
          <p className="text-[13px] font-medium leading-tight text-ink-muted">{c.name}</p>
          {c.description ? (
            <p className="mt-0.5 text-[11px] leading-snug text-ink-faint">{c.description}</p>
          ) : null}
          <p className="mt-1.5 text-[11px] text-ink-faint">Locked</p>
        </div>
      ))}
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = {
  avatar_frame: "Avatar frame",
  sound_effect: "Sound effect",
  quiz_theme: "Quiz theme",
  taunt: "Taunt",
  title: "Title",
  name_glow: "Name glow",
};

const ALL_CATEGORIES = ["avatar_frame", "name_glow", "title", "taunt", "quiz_theme", "sound_effect"] as const;

function EquippedTab({
  equipped,
  onChanged,
}: {
  equipped: { item: ShopItem; purchased_at: string }[];
  onChanged?: () => void;
}) {
  const byCat = new Map(equipped.map((e) => [e.item.category, e]));
  return (
    <div className="space-y-2.5 animate-fade-in">
      <CustomTauntManager onChanged={onChanged} />
      {ALL_CATEGORIES.map((cat) => {
        const entry = byCat.get(cat);
        const icon: IconName =
          cat === "taunt" ? "flame" : cat === "quiz_theme" ? "target" : cat === "sound_effect" ? "play" : cat === "title" ? "star" : cat === "name_glow" ? "crown" : "user";
        return (
          <Card key={cat} className="flex items-center gap-4 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-overpanel text-volt">
              <Icon name={icon} size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{CATEGORY_LABELS[cat]}</p>
              {entry ? (
                <>
                  <p className="text-xs text-ink-muted">
                    {entry.item.name} · {formatCoins(entry.item.coin_cost)}
                  </p>
                  {entry.item.preview_data && (cat === "taunt" || cat === "title") ? (
                    <p className="mt-1 text-lg leading-none">{entry.item.preview_data}</p>
                  ) : null}
                  {entry.item.preview_data && cat === "name_glow" ? (
                    <p
                      className="mt-1 text-lg font-bold"
                      style={{ color: entry.item.preview_data.startsWith("#") ? entry.item.preview_data : "inherit" }}
                    >
                      {entry.item.preview_data.startsWith("#") ? "Aa" : entry.item.preview_data}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-ink-faint">Not equipped</p>
              )}
            </div>
            <Link
              to="/shop"
              className="shrink-0 text-sm font-medium text-volt transition-colors hover:text-volt-soft"
            >
              Change
            </Link>
          </Card>
        );
      })}
    </div>
  );
}