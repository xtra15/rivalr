title: "Social Flex Shop — Full Accessory Expansion"
date: 2026-09-11
plan-file: 2026-09-11-social-flex-shop.md
spec: ../../specs/2026-09-11-social-flex-shop-design.md
---

# Social Flex Shop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the rivalr shop into a six-category social flex system with public profiles, custom WebP taunt uploads validated and stored in Cloudflare R2, and global image compression.

**Architecture:** Three phases. (A) Display layer: public profiles, a shared `UserCard` that renders equipped frame/glow/title everywhere, and two new shop categories (`title`, `name_glow`). (B) Upload pipeline: browser re-encodes GIF→WebP (static v1), worker verifies the Firebase ID token via jose + Google certs, validates magic bytes/dims/size, stores in R2, client writes its own `user_custom_taunts` Firestore doc (rules-scoped to `request.auth.uid`). (C) Quiz accessories: CSS-var theme + Web-Audio sound effects. Asset pipeline uses one shared `compressImage()` util.

**Tech Stack:** React 19 + Vite + Firebase (web), Cloudflare Workers + R2 + KV (worker), `jose` for token verification, Firestore rules.

## Global Constraints

- **No test framework in this repo.** Verification for each task = `npm run typecheck --workspace=apps/web`, `npm run build --workspace=apps/web`, and `npx wrangler deploy --dry-run` (in `apps/worker`) + a manual smoke step. Do not invent a test harness unless the repo already has one.
- **Custom taunt v1 is STATIC WebP** — browsers cannot natively encode animated WebP. `compressImage` re-encodes a single frame via `canvas.toBlob("image/webp")`. Animated GIFs show their first frame. Animated taunts remain shop-bought assets only.
- **Custom taunt hard limits:** input file ≤ 8 MB, output ≤ 512 KB, output dims ≤ 512×512, output format `image/webp` (JPEG fallback if WebP unsupported).
- **Firestore rules additions** must be merged into `firestore.rules` with the existing `service cloud.firestore` block; publish live via `npx firebase deploy --only firestore:rules --project rivalr-f5436`.
- **Worker auth:** every mutating taunt endpoint requires `Authorization: Bearer <Firebase ID token>`; the worker verifies with jose against Google's securetoken certs. Custom taunt metadata is written by the **web client** (already Firebase-authenticated), NOT the worker, to avoid adding a service account.
- **R2 bucket:** binding name `TAUNTS_R2`, bucket name `rivalr-taunts`. Create once: `npx wrangler r2 bucket create rivalr-taunts` (in `apps/worker`).
- **Icons available for new categories:** `title` → `"star"`, `name_glow` → `"crown"` (both exist in `Icon.tsx`).
- **Quick reference:** worker API base is `VITE_API_URL` in web (`.env`). Console = Firebase Console.

---

# Phase A — Display & Flex Layer

### Task 1: Shared types — new categories, `PublicUser`, `CustomTaunt`

**Files:**
- Modify: `packages/shared/src/types.ts:72-79`
- Test: none (type-shared change; verified via web typecheck)

**Interfaces:**
- Produces: `ShopItem.category` union now includes `"title" | "name_glow"`; new `PublicUser`, `CustomTaunt` interfaces used by later tasks.

- [ ] **Step 1: Widen the `ShopItem.category` union and add new types**

```ts
export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: "avatar_frame" | "sound_effect" | "quiz_theme" | "taunt" | "title" | "name_glow";
  coin_cost: number;
  preview_data: string | null;
}
```

Add after the `UserInventory` interface (line ~88):

```ts
export interface PublicUser {
  id: string;
  name: string;
  avatar_url: string | null;
  xp: number;
  coins: number;
  status?: string;
  created_at: string;
}

export interface CustomTaunt {
  user_id: string;
  asset_key: string;
  sha256: string;
  is_equipped: boolean;
  created_at: string;
}
```

- [ ] **Step 2: Verify web still typechecks**

Run: `npm run typecheck --workspace=apps/web`
Expected: PASS (widening a union is non-breaking; the web app compiles unchanged).

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "feat: widen shop categories, add PublicUser and CustomTaunt types"
```

---

### Task 2: Firestore data layer additions

**Files:**
- Modify: `apps/web/src/lib/firestore.ts`

**Interfaces:**
- Consumes: `PublicUser`, `CustomTaunt` from Task 1.
- Produces: `users.getPublic(userId): Promise<PublicUser | null>`, `customTaunts.get(userId)`, `customTaunts.set(userId, data)`, `customTaunts.delete`, `userInventory.getForUsers(userIds): Promise<(Record<string, unknown> & { id: string })[]>`.

- [ ] **Step 1: Add `users.getPublic` (privacy gate)**

Insert inside the `users: { ... }` object, after `get` (line 51):

```ts
async getPublic(userId: string) {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  const data = snap.data() as Record<string, unknown>;
  const { google_id, email, ...pub } = data;
  return { id: snap.id, ...pub } as PublicUser;
},
```

Add `PublicUser` to the imports: `import type { PublicUser, CustomTaunt } from "@rivalr/shared";` (top of file).

- [ ] **Step 2: Add `customTaunts` + `userInventory.getForUsers`**

Append after the `userInventory` object (end of the `firestore` export, before the closing `};` at line 278):

```ts
  customTaunts: {
    async get(userId: string) {
      const snap = await getDoc(doc(db, "user_custom_taunts", userId));
      return snap.exists()
        ? ({ user_id: userId, ...toPlain(snap.data()) } as unknown as CustomTaunt)
        : null;
    },
    async set(userId: string, data: { asset_key: string; sha256: string }) {
      const ref = doc(db, "user_custom_taunts", userId);
      await setDoc(
        ref,
        { user_id: userId, ...data, is_equipped: true, created_at: new Date().toISOString() },
        { merge: true },
      );
    },
    async remove(userId: string) {
      const ref = doc(db, "user_custom_taunts", userId);
      await deleteDoc(ref);
    },
  },

  userInventory: {
    // ...existing methods...
    async getForUsers(userIds: string[]) {
      const results: (Record<string, unknown> & { id: string })[] = [];
      for (const id of userIds) {
        const q = query(collection(db, "user_inventory"), where("user_id", "==", id));
        const snap = await getDocs(q);
        for (const d of snap.docs) results.push({ id: d.id, ...toPlain(d.data() as Record<string, unknown>) });
      }
      return results;
    },
  },
```

Note: `userInventory` already exists (line 250); add `getForUsers` inside its existing `{ }` block rather than creating a duplicate key.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck --workspace=apps/web`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/firestore.ts
git commit -m "feat: add getPublic, customTaunts and bulk inventory reads"
```

---

### Task 3: `UserCard` — unified flex rendering

**Files:**
- Create: `apps/web/src/components/UserCard.tsx`
- Modify: `apps/web/src/components/ui/index.ts` (export `UserCard`)

**Interfaces:**
- Consumes: `firestore.userInventory.getForUsers`, `firestore.shopItems.getAll`, `useAuth`.
- Produces: `export function UserCard(props)` and `export type EquippedSlots` used by Tasks 4, 5, 10, 11.

```ts
export interface EquippedSlots {
  frameColor?: string;
  glowColor?: string;
  title?: string;
}
```

- [ ] **Step 1: Write the component**

`apps/web/src/components/UserCard.tsx`:

```tsx
import { useEffect, useState } from "react";
import { firestore } from "@/lib/firestore";
import { Avatar } from "@/components/ui";
import type { ShopItem } from "@rivalr/shared";

export interface EquippedSlots {
  frameColor?: string;
  glowColor?: string;
  title?: string;
  tauntPreview?: string | null;
}

export function resolveEquipped(
  inventory: { item_id: string; is_equipped: boolean }[],
  items: ShopItem[],
): EquippedSlots {
  const slots: EquippedSlots = {};
  for (const inv of inventory) {
    if (!inv.is_equipped) continue;
    const item = items.find((s) => s.id === inv.item_id);
    if (!item) continue;
    if (item.category === "avatar_frame" || item.category === "name_glow") {
      const color = item.preview_data?.startsWith("#") ? item.preview_data : undefined;
      if (item.category === "avatar_frame") slots.frameColor = color;
      if (item.category === "name_glow") slots.glowColor = color;
    }
    if (item.category === "title") slots.title = item.preview_data ?? undefined;
    if (item.category === "taunt") slots.tauntPreview = item.preview_data;
  }
  return slots;
}

interface UserCardProps {
  name: string;
  avatarUrl: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  slots?: EquippedSlots;
  userId?: string;
  showTauntOnAvatar?: boolean;
}

function useSlots(userId: string | undefined, slots?: EquippedSlots) {
  const [loaded, setLoaded] = useState<EquippedSlots | null>(slots ?? null);
  useEffect(() => {
    if (slots || !userId) {
      setLoaded(slots ?? null);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const [inv, items] = await Promise.all([
          firestore.userInventory.getForUsers([userId]),
          firestore.shopItems.getAll() as Promise<ShopItem[]>,
        ]);
        if (alive) setLoaded(resolveEquipped(inv, items));
      } catch {
        if (alive) setLoaded({});
      }
    })();
    return () => {
      alive = false;
    };
  }, [userId, slots]);
  return loaded;
}

export function UserCard({ name, avatarUrl, size = "md", slots, userId, showTauntOnAvatar }: UserCardProps) {
  const resolved = useSlots(userId, slots);
  const frameColor = resolved?.frameColor;
  const glowColor = resolved?.glowColor;
  const title = resolved?.title;
  const taunt = resolved?.tauntPreview;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`relative shrink-0 rounded-full ${frameColor ? "ring-[3px]" : ""}`}
        style={frameColor ? ({ "--tw-ring-color": frameColor, boxShadow: `0 0 10px ${frameColor}66` } as React.CSSProperties) : undefined}
      >
        <Avatar src={avatarUrl} name={name} size={size} />
        {showTauntOnAvatar && taunt ? (
          <span className="absolute -bottom-1 -right-1 text-base leading-none drop-shadow">{taunt}</span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <span
            className="truncate text-sm font-medium"
            style={glowColor ? { color: glowColor, textShadow: `0 0 8px ${glowColor}aa` } : undefined}
          >
            {name}
          </span>
          {title ? (
            <span className="inline-flex shrink-0 items-center rounded-md border border-volt/30 bg-volt/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-volt">
              {title}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Export from the UI barrel**

In `apps/web/src/components/ui/index.ts`, add `export { UserCard } from "@/components/UserCard";` (check existing barrel export style first and match it, e.g. relative path like the other `.tsx` exports).

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck --workspace=apps/web; if ($?) { npm run lint --workspace=apps/web }`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/UserCard.tsx apps/web/src/components/ui/index.ts
git commit -m "feat: add UserCard flex rendering (frame, glow, title)"
```

---

### Task 4: Public profile page + route

**Files:**
- Create: `apps/web/src/pages/ProfilePublic.tsx`
- Modify: `apps/web/src/App.tsx:22-44`

**Interfaces:**
- Consumes: `firestore.users.getPublic`, `firestore.userInventory.getForUsers`, `firestore.shopItems.getAll`, `resolveEquipped`, `UserCard`.
- Produces: `/profile/:userId` route (used by Task 5 links).

- [ ] **Step 1: Write the page**

`apps/web/src/pages/ProfilePublic.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { firestore } from "@/lib/firestore";
import { Card, StatPill, EmptyState, Icon, LoadingScreen } from "@/components/ui";
import { UserCard, resolveEquipped } from "@/components/UserCard";
import { getLevel, formatAccuracy } from "@/utils/format";
import type { PublicUser, ShopItem, UserSubjectStats } from "@rivalr/shared";

export default function ProfilePublic() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [stats, setStats] = useState<UserSubjectStats[]>([]);
  const [slots, setSlots] = useState<Record<string, string> | null>(null);
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
      setSlots(resolveEquipped(inv, items));
      const s = (await firestore.userSubjectStats.get(userId)) as unknown as UserSubjectStats[];
      setStats(s);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <LoadingScreen label="Loading profile…" />;

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <EmptyState icon="user" title="User not found" description="This user does not exist or has no public profile." />
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
        <UserCard name={profile.name} avatarUrl={profile.avatar_url} size="xl" slots={slots} />
        {profile.status ? <p className="text-sm text-ink-muted">{profile.status}</p> : null}
        <p className="font-mono text-sm text-ink-muted">Level {level.level}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <StatPill value={String(profile.coins)} label="coins" />
          <StatPill value={String(totalQuizzes)} label="quizzes" />
          <StatPill value={formatAccuracy(totalCorrect, totalQuestions)} label="accuracy" />
        </div>
      </Card>

      {stats.length === 0 ? (
        <Card className="mt-4 py-10 text-center text-sm text-ink-muted">
          <Icon name="book" size={22} className="mx-auto mb-2 text-ink-muted" />
          No statistics yet.
        </Card>
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
```

- [ ] **Step 2: Add the route to `App.tsx`**

```tsx
<Route path="/profile/:userId" element={<ProfilePublic />} />
```

placed next to `<Route path="/profile" element={<Profile />} />` (line 29). Add `import ProfilePublic from "@/pages/ProfilePublic";`.

- [ ] **Step 3: Typecheck + build**

Run: `npm run typecheck --workspace=apps/web; if ($?) { npm run build --workspace=apps/web }`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/ProfilePublic.tsx apps/web/src/App.tsx
git commit -m "feat: add public profile page at /profile/:userId"
```

---

### Task 5: Wire `UserCard` + profile links into guild surfaces and results

**Files:**
- Modify: `apps/web/src/pages/GuildHome.tsx`
- Modify: `apps/web/src/pages/Results.tsx`

**Interfaces:**
- Consumes: `UserCard`, `resolveEquipped`, `EquippedSlots`.
- Produces: name links to `/profile/:userId` from Overview members list, Overview standings, Rankings table, Activity feed.

- [ ] **Step 1: Batch-load slots in `GuildHome`**

Import `UserCard, resolveEquipped` and add state:

```tsx
const [slotsMap, setSlotsMap] = useState<Record<string, EquippedSlots>>({});
```

In `loadGuild()` after `setMembers(...)`:

```tsx
if (memberRows.length) {
  const userIds = memberRows.map((m) => m.user_id as string);
  // ...existing usersBatch fetch...
  const [inv, items] = await Promise.all([
    firestore.userInventory.getForUsers(userIds),
    firestore.shopItems.getAll() as Promise<ShopItem[]>,
  ]);
  const map: Record<string, EquippedSlots> = {};
  for (const id of userIds) {
    map[id] = resolveEquipped(inv.filter((i) => i.user_id === id), items);
  }
  setSlotsMap(map);
}
```

- [ ] **Step 2: Replace avatars/names with `UserCard` and links**

Overview members list (lines 258-284): replace the `<Avatar …/>` + name `<p>` block with:

```tsx
<Link to={`/profile/${entry.user.id}`} className="min-w-0 flex-1">
  <UserCard
    name={entry.user.name}
    avatarUrl={entry.user.avatar_url}
    slots={slotsMap[entry.user.id]}
    showTauntOnAvatar
  />
</Link>
```

Add level/accuracy row back beneath the `UserCard` using the existing styling (keep the `(you)` marker inside the name line where it was). Remove the standalone `<Avatar>` next to it.

Overview standings card (lines 291-310): keep `RankBadge`, replace `<Avatar …/>` and the name `<p>` with `<UserCard …/>` inside a `<Link to={`/profile/${entry.user.id}`}>`; keep the quiz-count line and XP column.

Rankings table name cell (lines 373-375): replace with:

```tsx
<td className="px-4 py-3">
  <Link to={`/profile/${row.userId}`} className="min-w-0">
    <UserCard name={row.user?.name ?? "—"} avatarUrl={row.user?.avatar_url ?? null} slots={slotsMap[row.userId]} />
  </Link>
</td>
```

Activity feed (Task 5, but the `img` custom taunt comes in Task 11): replace the `<Avatar …>` + name `<p>` (lines 571-574) with a `UserCard` wrapped in `<Link to={`/profile/${(m?.id ?? a.user_id)}`}>` using `slotsMap`, keep the rest of the row.

Add `import { Link }` is already imported. Add `import type { EquippedSlots } from "@/components/UserCard";`.

- [ ] **Step 3: Add `UserCard` to the Results page header**

In `Results.tsx`, above the main score heading, render the current user's flex (no identity fields needed — quiz attempt has no name):

```tsx
import { useAuth } from "@/lib/auth";
import { UserCard, resolveEquipped } from "@/components/UserCard";
// inside component:
const { user } = useAuth();
const [flexSlots, setFlexSlots] = useState<EquippedSlots | null>(null);
useEffect(() => {
  if (!user) return;
  (async () => {
    const [inv, items] = await Promise.all([
      firestore.userInventory.getForUsers([user.id]),
      firestore.shopItems.getAll() as Promise<ShopItem[]>,
    ]);
    setFlexSlots(resolveEquipped(inv, items));
  })();
}, [user]);
```

Then render in the results header (before the `<h1>`):

```tsx
<div className="mb-4 flex justify-center">
  <UserCard name={attempt.user_id ? (user?.name ?? "You") : "You"} avatarUrl={user?.avatar_url ?? null} slots={flexSlots ?? undefined} />
</div>
```

- [ ] **Step 4: Typecheck + build**

Run: `npm run typecheck --workspace=apps/web; if ($?) { npm run build --workspace=apps/web }`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/GuildHome.tsx apps/web/src/pages/Results.tsx
git commit -m "feat: apply flex rendering and profile links across guild surfaces"
```

---

### Task 6: Shop + Profile support for title / name_glow categories

**Files:**
- Modify: `apps/web/src/pages/Shop.tsx`
- Modify: `apps/web/src/pages/Profile.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `title`/`name_glow` tabs in Shop, preview rendering, and 6-slot equipped list in Profile.

- [ ] **Step 1: Shop category labels/icons**

Replace `CATEGORY_LABELS` + `CATEGORY_ICONS` (lines 8-20):

```tsx
const CATEGORY_LABELS: Record<string, string> = {
  avatar_frame: "Avatar Frames",
  sound_effect: "Sound Effects",
  quiz_theme: "Quiz Themes",
  taunt: "Taunt Stickers",
  title: "Titles",
  name_glow: "Name Glow",
};

const CATEGORY_ICONS: Record<string, "user" | "play" | "target" | "flame" | "star" | "crown"> = {
  avatar_frame: "user",
  sound_effect: "play",
  quiz_theme: "target",
  taunt: "flame",
  title: "star",
  name_glow: "crown",
};
```

- [ ] **Step 2: Shop `Preview` for new categories**

In `Preview`, before the final `else` fallback, add:

```tsx
) : item.category === "title" ? (
  <span className="text-xs font-semibold uppercase tracking-wide text-volt">
    {item.preview_data || "Title"}
  </span>
) : item.category === "name_glow" ? (
  <span
    className="text-sm font-bold"
    style={{ color: item.preview_data ?? "#C9F73A", textShadow: `0 0 10px ${item.preview_data ?? "#C9F73A"}66` }}
  >
    Sample name
  </span>
) : (
```

- [ ] **Step 3: Profile equipped list — 6 fixed slots + labels**

Replace `CATEGORY_LABELS` in `Profile.tsx` (line 275):

```tsx
const CATEGORY_LABELS: Record<string, string> = {
  avatar_frame: "Avatar frame",
  sound_effect: "Sound effect",
  quiz_theme: "Quiz theme",
  taunt: "Taunt",
  title: "Title",
  name_glow: "Name glow",
};
```

Replace the `EquippedTab` empty-state (lines 283-298) with a "All 6 slots" grid that always shows 6 rows (empty → "Not equipped" muted row):

```tsx
const ALL_CATEGORIES = ["avatar_frame", "name_glow", "title", "taunt", "quiz_theme", "sound_effect"] as const;

function EquippedTab({ equipped }: { equipped: { item: ShopItem; purchased_at: string }[] }) {
  const byCat = new Map(equipped.map((e) => [e.item.category, e]));
  return (
    <div className="space-y-2.5 animate-fade-in">
      {ALL_CATEGORIES.map((cat) => {
        const entry = byCat.get(cat);
        return (
          <Card key={cat} className="flex items-center gap-4 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-overpanel text-volt">
              <Icon name={entry?.item.category === "taunt" ? "flame" : entry?.item.category === "quiz_theme" ? "target" : entry?.item.category === "sound_effect" ? "play" : entry?.item.category === "title" ? "star" : entry?.item.category === "name_glow" ? "crown" : "user"} size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{CATEGORY_LABELS[cat]}</p>
              {entry ? (
                <>
                  <p className="text-xs text-ink-muted">{entry.item.name} · {formatCoins(entry.item.coin_cost)}</p>
                  {entry.item.preview_data && (cat === "taunt" || cat === "title") ? (
                    <p className="mt-1 text-lg leading-none">{entry.item.preview_data}</p>
                  ) : null}
                  {entry.item.preview_data && cat === "name_glow" ? (
                    <p className="mt-1 text-lg font-bold" style={{ color: entry.item.preview_data }}>
                      {entry.item.preview_data.startsWith("#") ? "Aa" : entry.item.preview_data}
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-xs text-ink-faint">Not equipped</p>
              )}
            </div>
            <Link to="/shop" className="shrink-0 text-sm font-medium text-volt transition-colors hover:text-volt-soft">
              Change
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
```

Delete the old empty `EquippedTab` branch and old map body (lines 300-326).

- [ ] **Step 4: Typecheck + build**

Run: `npm run typecheck --workspace=apps/web; if ($?) { npm run build --workspace=apps/web }`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/Shop.tsx apps/web/src/pages/Profile.tsx
git commit -m "feat: add title and name glow categories to shop and profile"
```

**Phase A complete milestone:** deploy web — `npm run deploy --workspace=apps/web` is not defined; use `npx vercel --prod` from `apps/web` if the project has remote configured, otherwise `npm run build --workspace=apps/web` and note manual deploy. (Consult repo history for the exact web deploy command and reuse it.)

---

# Phase B — Custom Taunt Upload Pipeline

### Task 7: Worker — Firebase token verification + R2 binding

**Files:**
- Modify: `apps/worker/package.json` (add `jose`)
- Modify: `apps/worker/wrangler.toml`
- Modify: `apps/worker/src/types.ts`
- Create: `apps/worker/src/lib/verify.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `verifyFirebaseToken(token: string, projectId: string): Promise<{ uid: string }>` used by Task 8; `Env.TAUNTS_R2`, `Env.FIREBASE_PROJECT_ID`.

- [ ] **Step 1: Add the `jose` dependency**

Run (in `apps/worker`): `npm i jose`
Expected: added to `dependencies`.

- [ ] **Step 2: R2 binding + project id var**

`apps/worker/wrangler.toml` — append:

```toml
[[r2_buckets]]
binding = "TAUNTS_R2"
bucket_name = "rivalr-taunts"

[vars]
FIREBASE_PROJECT_ID = "rivalr-f5436"
```

- [ ] **Step 3: Env type**

`apps/worker/src/types.ts`:

```ts
export interface Env {
  QUESTIONS_KV: KVNamespace;
  GEMINI_API_KEY: string;
  GROQ_API_KEY: string;
  TAUNTS_R2: R2Bucket;
  FIREBASE_PROJECT_ID: string;
}
```

- [ ] **Step 4: Token verifier**

`apps/worker/src/lib/verify.ts`:

```ts
import { importX509, jwtVerify, base64url } from "jose";

const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

interface CachedKey {
  key: CryptoKey;
  expires: number;
}

const certCache = new Map<string, CachedKey>();

async function getCertKey(kid: string): Promise<CryptoKey> {
  const hit = certCache.get(kid);
  if (hit && hit.expires > Date.now()) return hit.key;

  const res = await fetch(CERTS_URL, { cf: { cacheTtl: 3600 } });
  if (!res.ok) throw new Error(`Failed to fetch Google certs: ${res.status}`);
  const cacheControl = res.headers.get("cache-control") ?? "";
  const maxAge = Number(/max-age=(\d+)/.exec(cacheControl)?.[1] ?? 3600);
  const certs = (await res.json()) as Record<string, string>;
  const pem = certs[kid];
  if (!pem) throw new Error("Unknown key id in token header");
  const key = await importX509(pem, "RS256");
  certCache.set(kid, { key, expires: Date.now() + maxAge * 1000 });
  return key;
}

export async function verifyFirebaseToken(token: string, projectId: string): Promise<{ uid: string }> {
  const [headerB64] = token.split(".");
  if (!headerB64) throw new Error("Malformed token");
  const header = JSON.parse(new TextDecoder().decode(base64url.decode(headerB64))) as { kid?: string };
  if (!header.kid) throw new Error("Token missing kid");
  const key = await getCertKey(header.kid);
  const { payload } = await jwtVerify(token, key, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  if (!payload.sub) throw new Error("Token missing subject");
  return { uid: payload.sub };
}
```

- [ ] **Step 5: Create the bucket**

Run (in `apps/worker`): `npx wrangler r2 bucket create rivalr-taunts`
Expected: `Created bucket 'rivalr-taunts'`.

- [ ] **Step 6: Dry-run deploy**

Run: `npx wrangler deploy --dry-run` (in `apps/worker`)
Expected: Bundling succeeds, no TS errors.

- [ ] **Step 7: Commit**

```bash
git add apps/worker/package.json apps/worker/wrangler.toml apps/worker/src/types.ts apps/worker/src/lib/verify.ts
git commit -m "feat: worker firebase token verification and R2 binding"
```

---

### Task 8: Worker — WebP validator, taunts route, sfx route, routing

**Files:**
- Create: `apps/worker/src/lib/webp.ts`
- Create: `apps/worker/src/routes/taunts.ts`
- Create: `apps/worker/src/routes/sfx.ts`
- Modify: `apps/worker/src/index.ts`

**Interfaces:**
- Consumes: `verifyFirebaseToken`, `Env.TAUNTS_R2`, `Env.FIREBASE_PROJECT_ID`.
- Produces:
  - `POST /api/taunts` (Authorization) → `{ sha256, size, asset_key }`
  - `DELETE /api/taunts` (Authorization) → `{ ok: true }`
  - `GET /api/taunts/:uid/:file` → WebP bytes with `Content-Type: image/webp`, `X-Content-Type-Options: nosniff`, `Cache-Control: public, max-age=604800`
  - `GET /api/sfx/:key` → `audio/mpeg` bytes (404 if absent)

- [ ] **Step 1: WebP validator**

`apps/worker/src/lib/webp.ts`:

```ts
export interface ValidationResult {
  ok: boolean;
  reason?: string;
  width?: number;
  height?: number;
}

export function validateWebP(bytes: Uint8Array, maxDim = 512): ValidationResult {
  if (bytes.length < 20) return { ok: false, reason: "File too small to be a WebP" };
  const sig = new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF";
  const webp = new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP";
  if (!sig || !webp) return { ok: false, reason: "Not a WebP image" };

  const chunk = new TextDecoder().decode(bytes.subarray(12, 16));
  if (chunk === "VP8X") {
    let width = bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16);
    let height = bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16);
    width += 1;
    height += 1;
    if (width > maxDim || height > maxDim) return { ok: false, reason: "Dimensions too large" };
    return { ok: true, width, height };
  }
  if (chunk === "VP8L") {
    const b0 = bytes[21]!; const b1 = bytes[22]!; const b2 = bytes[23]!; const b3 = bytes[24]!;
    const width = (((b1 & 0x3f) << 8) | b0) + 1;
    const height = ((((b3 & 0x0f) << 6) | (b2 >> 2)) << 8 | ((b2 & 0x03) << 6) | (b1 >> 6)) + 1;
    if (width > maxDim || height > maxDim) return { ok: false, reason: "Dimensions too large" };
    return { ok: true, width, height };
  }
  if (chunk === "VP8 ") {
    const width = bytes[26]! | (bytes[27]! << 8);
    const height = bytes[28]! | (bytes[29]! << 8);
    if (width > maxDim || height > maxDim) return { ok: false, reason: "Dimensions too large" };
    return { ok: true, width, height };
  }
  return { ok: false, reason: "Unsupported WebP variant" };
}
```

- [ ] **Step 2: Taunts route**

`apps/worker/src/routes/taunts.ts`:

```ts
import type { Env } from "../types";
import { verifyFirebaseToken } from "../lib/verify";
import { validateWebP } from "../lib/webp";

const MAX_BYTES = 512 * 1024;

export async function handleTaunts(request: Request, env: Env, path: string): Promise<Response> {
  if (request.method === "GET") {
    return handleServe(request, env, path);
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return Response.json({ error: "Missing authorization" }, { status: 401 });

  let uid: string;
  try {
    ({ uid } = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID));
  } catch (err) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  if (request.method === "DELETE") {
    const listed = await env.TAUNTS_R2.list({ prefix: `taunts/${uid}/` });
    await Promise.all(listed.objects.map((o) => env.TAUNTS_R2.delete(o.key)));
    return Response.json({ ok: true });
  }

  if (request.method === "POST") {
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.length === 0) return Response.json({ error: "Empty body" }, { status: 400 });
    if (bytes.length > MAX_BYTES) return Response.json({ error: "File too large" }, { status: 413 });
    const check = validateWebP(bytes);
    if (!check.ok) return Response.json({ error: check.reason }, { status: 422 });

    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha256 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    const assetKey = `taunts/${uid}/${sha256}.webp`;

    await env.TAUNTS_R2.put(assetKey, bytes, {
      httpMetadata: { contentType: "image/webp" },
    });

    return Response.json({
      sha256,
      size: bytes.length,
      asset_key: assetKey,
    });
  }

  return new Response("Method not allowed", { status: 405 });
}

async function handleServe(request: Request, env: Env, path: string): Promise<Response> {
  const m = /^\/api\/taunts\/([^/]+)\/(.+)$/.exec(path);
  if (!m) return new Response("Not found", { status: 404 });
  const [, , file] = m;
  const key = `taunts/${decodeURIComponent(file)}`;
  const obj = await env.TAUNTS_R2.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const body = (await obj.arrayBuffer()) as ArrayBuffer;
  return new Response(body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
```

Wait — the `file` in `key` already contains `{uid}/{sha}.webp`, so `taunts/${uid}/${sha}` double-prefixes. Fix: parse uid and file, then key = `taunts/${uid}/${file}`:

```ts
  const m = /^\/api\/taunts\/([^/]+)\/(.+)$/.exec(path);
  if (!m) return new Response("Not found", { status: 404 });
  const [, uid, file] = m;
  const key = `taunts/${decodeURIComponent(uid)}/${decodeURIComponent(file)}`;
```

Use this version in the final file.

- [ ] **Step 3: SFX route**

`apps/worker/src/routes/sfx.ts`:

```ts
import type { Env } from "../types";

export async function handleSfx(request: Request, env: Env, path: string): Promise<Response> {
  const m = /^\/api\/sfx\/(.+)$/.exec(path);
  if (!m || request.method !== "GET") return new Response("Not found", { status: 404 });
  const key = decodeURIComponent(m[1]!);
  const obj = await env.TAUNTS_R2.get(`sfx/${key}`);
  if (!obj) return new Response("Not found", { status: 404 });
  const body = (await obj.arrayBuffer()) as ArrayBuffer;
  return new Response(body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=604800",
    },
  });
}
```

- [ ] **Step 4: Wire routing + CORS in `index.ts`**

```ts
import { handleTaunts } from "./routes/taunts";
import { handleSfx } from "./routes/sfx";
```

CORS (lines 10-14 →):

```ts
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
```

Routing block (lines 23-28 →):

```ts
if (path === "/api/questions" && request.method === "POST") {
  response = await handleQuestions(request, env);
} else if (path === "/api/health") {
  response = handleHealth();
} else if (path.startsWith("/api/taunts")) {
  response = await handleTaunts(request, env, path);
} else if (path.startsWith("/api/sfx")) {
  response = await handleSfx(request, env, path);
} else {
  response = new Response("Not found", { status: 404 });
}
```

Note: the GET serve path must not be caught by the 404 for `/api/health`... it isn't; order is fine.

- [ ] **Step 5: Dry-run deploy**

Run: `npx wrangler deploy --dry-run` (in `apps/worker`)
Expected: Bundling succeeds.

- [ ] **Step 6: Live deploy + commit**

```bash
npx wrangler deploy
git add apps/worker/src/lib/webp.ts apps/worker/src/routes/taunts.ts apps/worker/src/routes/sfx.ts apps/worker/src/index.ts
git commit -m "feat: worker taunt upload/serve and sfx routes with R2"
```

---

### Task 9: Web — `compressImage` + taunt API client

**Files:**
- Create: `apps/web/src/lib/compressImage.ts`
- Modify: `apps/web/src/lib/api.ts`

**Interfaces:**
- Consumes: `VITE_API_URL`.
- Produces: `compressImage(file: File): Promise<Blob>` (throws `Error` with a `code` on `"too-large"` / `"unsupported"` / `"unreadable"`), `api.uploadTaunt(blob: Blob): Promise<{ sha256: string; size: number; asset_key: string }>`, `api.deleteTaunt()`, `api.tauntAssetUrl(uid: string, file: string): string`, `api.sfxUrl(key: string): string`. Uses the current Firebase ID token.

- [ ] **Step 1: Write `compressImage`**

`apps/web/src/lib/compressImage.ts`:

```ts
const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_DIM = 512;
const MAX_OUTPUT_BYTES = 512 * 1024;

export class CompressError extends Error {
  code: "too-large" | "unsupported" | "unreadable";
  constructor(code: CompressError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

async function decodeToCanvas(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new CompressError("unreadable", "Could not decode this image."));
      el.src = url;
    });
    const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new CompressError("unreadable", "Canvas unavailable.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function canvasToWebP(canvas: HTMLCanvasElement, maxBytes: number): Promise<Blob> {
  const types = ["image/webp", "image/jpeg"];
  for (let quality = 0.85; quality >= 0.4; quality -= 0.15) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, types[0], quality),
    );
    const candidate = blob && blob.type === "image/webp" ? blob : await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, types[1], quality),
    );
    if (candidate && candidate.size <= maxBytes) return candidate;
  }
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, types[1], 0.4),
  );
  if (!blob) throw new CompressError("unreadable", "Encoding failed.");
  return blob;
}

export async function compressImage(file: File): Promise<Blob> {
  if (!["image/gif", "image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new CompressError("unsupported", "Unsupported format — use GIF, PNG, JPG, or WebP.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new CompressError("too-large", "File too large — please use a file under 8 MB.");
  }
  const canvas = await decodeToCanvas(file);
  const blob = await canvasToWebP(canvas, MAX_OUTPUT_BYTES);
  if (blob.size > MAX_OUTPUT_BYTES) {
    throw new CompressError("too-large", "Re-encoded image is still too large after compression.");
  }
  return blob;
}
```

- [ ] **Step 2: Taunt API client in `api.ts`**

Append to `apps/web/src/lib/api.ts`:

```ts
import { auth } from "./firebase";

export const api = {
  async uploadTaunt(blob: Blob) {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`${API_BASE}/api/taunts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: blob,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Upload failed — please try again.");
    }
    return res.json() as Promise<{ sha256: string; size: number; asset_key: string }>;
  },

  async deleteTaunt() {
    const token = await auth.currentUser?.getIdToken();
    await fetch(`${API_BASE}/api/taunts`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  tauntAssetUrl(uid: string, file: string) {
    return `${API_BASE}/api/taunts/${encodeURIComponent(uid)}/${encodeURIComponent(file)}`;
  },

  sfxUrl(key: string) {
    return `${API_BASE}/api/sfx/${encodeURIComponent(key)}`;
  },
};
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck --workspace=apps/web`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/compressImage.ts apps/web/src/lib/api.ts
git commit -m "feat: browser GIF-to-WebP compressor and taunt API client"
```

---

### Task 10: Web — custom taunt manager UI + Firestore rules

**Files:**
- Create: `apps/web/src/components/CustomTauntManager.tsx`
- Modify: `apps/web/src/pages/Shop.tsx` (add manager to `taunt` category view)
- Modify: `apps/web/src/pages/Profile.tsx` (show custom taunt row in Equipped tab)
- Modify: `firestore.rules`

**Interfaces:**
- Consumes: `compressImage`, `api.uploadTaunt/deleteTaunt/tauntAssetUrl`, `firestore.customTaunts`, `useAuth`.
- Produces: reusable `CustomTauntManager` with upload / replace / delete UI; `user_custom_taunts` rules.

- [ ] **Step 1: Firestore rules**

In `firestore.rules`, inside the `service cloud.firestore { match /databases/{database}/documents {` block, add near the `user_inventory` rule:

```firestore
match /user_custom_taunts/{userId} {
  allow read: if isSignedIn();
  allow create, update, delete: if request.auth.uid == userId;
}
```

- [ ] **Step 2: Write the manager**

`apps/web/src/components/CustomTauntManager.tsx`:

```tsx
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { api } from "@/lib/api";
import { compressImage, CompressError } from "@/lib/compressImage";
import { Button, Icon, useToast } from "@/components/ui";
import { UserCard } from "@/components/UserCard";
import type { CustomTaunt } from "@rivalr/shared";

export function CustomTauntManager({ onChanged }: { onChanged?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [taunt, setTaunt] = useState<CustomTaunt | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    firestore.customTaunts.get(user.id).then(setTaunt);
  }, [user]);

  async function handleFile(file: File | undefined) {
    if (!user || !file || busy) return;
    setBusy(true);
    try {
      const webp = await compressImage(file);
      const { asset_key } = await api.uploadTaunt(webp);
      await firestore.customTaunts.set(user.id, { asset_key, sha256: asset_key.split("/").pop()!.split(".")[0]! });
      setTaunt({ user_id: user.id, asset_key, sha256: asset_key.split("/").pop()!.split(".")[0]!, is_equipped: true, created_at: new Date().toISOString() });
      toast("Custom taunt uploaded.", "success");
      onChanged?.();
    } catch (e) {
      const msg = e instanceof CompressError || e instanceof Error ? e.message : "Upload failed — please try again.";
      toast(msg, "error");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!user || busy) return;
    setBusy(true);
    try {
      await api.deleteTaunt();
      await firestore.customTaunts.remove(user.id);
      setTaunt(null);
      toast("Custom taunt deleted.", "info");
      onChanged?.();
    } catch {
      toast("Could not delete taunt.", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Custom taunt</p>
        <span className="text-[11px] text-ink-faint">GIF → WebP · 512 KB max</span>
      </div>

      {taunt ? (
        <div className="flex items-center gap-3">
          <img
            src={api.tauntAssetUrl(user.id, `${taunt.sha256}.webp`)}
            alt="Custom taunt"
            className="h-16 w-16 rounded-lg border border-line bg-overpanel object-cover"
          />
          <div className="flex flex-1 flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
              Replace
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={handleDelete}>
              <Icon name="trash" size={14} />
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Uploading…" : "Upload your own"}
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/gif,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="text-[11px] leading-relaxed text-ink-faint">
        Shown on all your scores in guild activity. Frame/glow/title still apply. Animated GIFs are shown as their first frame.
      </p>
    </Card>
  );
}
```

Add `Card` to the `/components/ui` import list — check the barrel exports `Card` (yes). The `UserCard` import is unused in this draft — remove it.

- [ ] **Step 3: Wire into Shop taunt category**

In `Shop.tsx`, in the tab content render, after the item grid add (inside the same `{(activeCat) => (...)}` block, when `activeCat === "taunt"`):

```tsx
{activeCat === "taunt" ? (
  <div className="mt-3 animate-fade-in">
    <CustomTauntManager />
  </div>
) : null}
```

Add `import { CustomTauntManager } from "@/components/CustomTauntManager";`.

- [ ] **Step 4: Wire into Profile Equipped tab**

In `Profile.tsx` `EquippedTab`, add a `taunt` row slot variant with the manager below the slots grid when `cat === "taunt"`:

```tsx
{CAT === "taunt" && (
  <CustomTauntManager onChanged={() => loadData()} />
)}
```

Simplest correct version: render `<div className="space-y-2.5 animate-fade-in"><CustomTauntManager onChanged={() => loadData()} /></div>` above the slots grid in `EquippedTab`. Accept slight duplicate (custom taunt + "taunt" slot row both visible).

- [ ] **Step 5: Typecheck + build**

Run: `npm run typecheck --workspace=apps/web; if ($?) { npm run build --workspace=apps/web }`
Expected: PASS.

- [ ] **Step 6: Publish rules + commit**

```bash
npx firebase deploy --only firestore:rules --project rivalr-f5436
git add apps/web/src/components/CustomTauntManager.tsx apps/web/src/pages/Shop.tsx apps/web/src/pages/Profile.tsx firestore.rules
git commit -m "feat: custom taunt upload manager with rules"
```

---

### Task 11: Web — render custom taunts in the activity feed

**Files:**
- Modify: `apps/web/src/pages/GuildHome.tsx`

**Interfaces:**
- Consumes: `firestore.customTaunts.get` (per member), `api.tauntAssetUrl`.
- Produces: `<img>` under the score row when the taunting user has a custom taunt equipped.

- [ ] **Step 1: Batch-load custom taunts in `loadGuild`**

Add state: `const [customTaunts, setCustomTaunts] = useState<Record<string, CustomTaunt>>({});`

In `loadGuild()`, after the slots-map block:

```tsx
const ctMap: Record<string, CustomTaunt> = {};
for (const id of userIds) {
  const ct = await firestore.customTaunts.get(id);
  if (ct) ctMap[id] = ct;
}
setCustomTaunts(ctMap);
```

Import `CustomTaunt` type and `api`.

- [ ] **Step 2: Render in `ActivityTab`**

Change `ActivityTab` to accept `customTaunts: Record<string, CustomTaunt>` and render after the row content (below the flex row's timestamp line, still inside the row):

```tsx
{ctMap[a.user_id] ? (
  <img
    src={api.tauntAssetUrl(a.user_id, `${ctMap[a.user_id].sha256}.webp`)}
    alt="Taunt"
    className="mt-1.5 max-h-16 max-w-28 rounded-lg border border-line bg-overpanel object-cover"
  />
) : null}
```

Rename prop locally to `ctMap` for brevity. Pass `customTaunts={customTaunts}` from the `activity` tab render (line 226).

- [ ] **Step 3: Typecheck + build**

Run: `npm run typecheck --workspace=apps/web; if ($?) { npm run build --workspace=apps/web }`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/GuildHome.tsx
git commit -m "feat: show custom taunt WebP in activity feed"
```

**Phase B complete milestone:** live deploy worker (already deployed in Task 8) + web (same command used at Phase A milestone). Manual smoke: upload a GIF in shop taunt tab → see it in the feed.

---

# Phase C — Quiz Accessories

### Task 12: Quiz screen theme vars + sound effects

**Files:**
- Modify: `apps/web/src/pages/QuizScreen.tsx`
- Create: `apps/web/src/lib/sound.ts`

**Interfaces:**
- Consumes: `firestore.userInventory.getForUsers`, `firestore.shopItems.getAll`, `api.sfxUrl`.
- Produces: CSS vars `--quiz-accent`, `--quiz-bg` on the quiz root; correct/wrong sfx playback from equipped `sound_effect` item.

- [ ] **Step 1: Sound lib**

`apps/web/src/lib/sound.ts`:

```ts
import { api } from "./api";

const decoded = new Map<string, AudioBuffer>();

export async function playSfx(key: string) {
  try {
    let buffer = decoded.get(key);
    if (!buffer) {
      const res = await fetch(api.sfxUrl(key));
      if (!res.ok) return;
      const data = await res.arrayBuffer();
      const ctx = getCtx();
      buffer = await ctx.decodeAudioData(data);
      decoded.set(key, buffer);
    }
    const ctx = getCtx();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start();
  } catch {
    // silent: missing/unsupported audio should never break the quiz
  }
}

let ctx: AudioContext | null = null;
function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
```

- [ ] **Step 2: Load equipped accessories in QuizScreen**

```tsx
import { playSfx } from "@/lib/sound";
// state:
const [accentTheme, setAccentTheme] = useState<{ bg: string; accent: string } | null>(null);
const [sfxKey, setSfxKey] = useState<string | null>(null);

useEffect(() => {
  if (!user) return;
  (async () => {
    const [inv, items] = await Promise.all([
      firestore.userInventory.getForUsers([user.id]),
      firestore.shopItems.getAll() as Promise<ShopItem[]>,
    ]);
    const equipped = new Map<string, string>();
    for (const i of inv) if (i.is_equipped) equipped[i.item_id] = i.item_id;
    for (const item of items) {
      if (!equipped.has(item.id)) continue;
      if (item.category === "quiz_theme" && item.preview_data?.startsWith("#")) {
        setAccentTheme({ bg: item.preview_data, accent: item.preview_data });
      }
      if (item.category === "sound_effect") setSfxKey(item.preview_data ?? null);
    }
  })();
}, [user]);
```

- [ ] **Step 3: Apply theme + play sounds**

Apply to the root div (line 135): add

```tsx
style={
  accentTheme
    ? ({ backgroundColor: accentTheme.bg, "--quiz-accent": accentTheme.accent } as React.CSSProperties)
    : undefined
}
```

Tint the timer/progress with `--quiz-accent`: change `bg-volt` on the `ProgressBar` value container usage in QuizScreen to `bg-[var(--quiz-accent)]` (line 145) and the streak flame text color to `text-[var(--quiz-accent)]` (line 225). Keep `text-volt` fallbacks for non-themed users by making the var used in both paths; simplest: leave default classes and add the style-based override only when themed.

In `handleAnswer`, after computing `isCorrect`:

```tsx
if (isCorrect) {
  setStreak((s) => s + 1);
  if (sfxKey) playSfx(sfxKey);
} else {
  setStreak(0);
}
```

(In the current code `setStreak((s) => s + 1)` sits on line 73 — replace the existing branches with the above, preserving logic.)

- [ ] **Step 4: Typecheck + build**

Run: `npm run typecheck --workspace=apps/web; if ($?) { npm run build --workspace=apps/web }`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/QuizScreen.tsx apps/web/src/lib/sound.ts
git commit -m "feat: quiz theme css vars and equipped sound effects"
```

---

### Task 13: Final verification + deploy

**Files:** none (deploy/all).

- [ ] **Step 1: Worker dry-run**

Run: `npx wrangler deploy --dry-run` (in `apps/worker`)
Expected: Bundling succeeds.

- [ ] **Step 2: Web typecheck + build**

Run: `npm run typecheck --workspace=apps/web; if ($?) { npm run build --workspace=apps/web }`
Expected: PASS.

- [ ] **Step 3: Deploy worker + web + rules**

Run:
```bash
npx wrangler deploy                          # in apps/worker
npx firebase deploy --only firestore:rules --project rivalr-f5436
# web: reuse the repo's web deploy command (see Phase A milestone)
```

Expected: all three deploy cleanly.

- [ ] **Step 4: Manual smoke checklist**

1. Shop shows 6 category tabs; `title` and `name_glow` items preview correctly.
2. Buy + equip items in every category; profile shows all 6 slots filled.
3. Public profile `/profile/:userId` from a guild member name link renders; email never visible in network tab.
4. Upload a GIF in Shop → taunt tab; feed shows the WebP under your score rows.
5. `DELETE` via manager removes the object; slot falls back to store taunt / none.
6. Equip a quiz theme + sound effect; start a quiz — accent color applies before render, correct answers play audio.
7. Upload >8 MB or an `.exe` — friendly toast, no upload.

- [ ] **Step 5: Commit any smoke-test fixes**

If smoke tests surfaced issues, fix + commit with a `fix:` message. Otherwise no commit needed.

---

## Self-Review Notes

- **Spec coverage:** §2 R2/KV split → Tasks 7–8; §3 public profiles → Tasks 2, 4, 5; §4 six-category shop + pricing (pricing is data, entered in Firebase Console — no code task; equip mechanism unchanged) → Tasks 1, 6, 10; §5 upload pipeline → Tasks 7, 8, 9, 10; §6 global compression → Task 9 (`compressImage`); §7 rendering table → Tasks 3, 5, 11, 12; §8 errors → Task 9 (`CompressError`), Task 10 toasts, `ProfilePublic` not-found; §9 testing → Task 13 smoke checklist.
- **No placeholders:** every code-bearing step carries real code; only the web deploy command is delegated to repo convention (no such script exists in `package.json`).
- **Type consistency:** `EquippedSlots`/`resolveEquipped` defined in Task 3 and reused in 4, 5, 10, 11; `CustomTaunt.sha256` used to build URLs in both manager (Task 10) and feed (Task 11); `asset_key` produced by Task 8 matches `customTaunts.set` input in Task 10; `FIREBASE_PROJECT_ID` var set in wrangler.toml Task 7 and consumed Task 8.