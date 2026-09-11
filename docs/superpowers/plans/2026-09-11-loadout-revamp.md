# Loadout Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make rewards data actually persist (writing `user_subject_stats`/`user_chapter_stats` on quiz finish so Rankings chapter filters and Profile stats populate) and revamp equip UX with a loadout preview + one-tap inline pickers in the Profile Equipped tab.

**Architecture:** `finishQuiz()` gains two aggregation writes through the existing `firestore.userSubjectStats.upsert` / `userChapterStats.upsert` helpers (reworked to merge counts and carry a trusted `uid` for rules). Profile's Equipped tab renders a live `LoadoutPreview` (composing `UserCard` equipped-slot rendering) plus per-category owned-item chips that equip/unequip in one tap.

**Tech Stack:** Firebase Firestore (rules, client SDK), React + Vite + TypeScript (web), Tailwind styling via existing `Card/Button/Icon` primitives.

## Global Constraints

- No unit-test framework exists. Verification = `npm run typecheck --workspace=apps/web` (from repo root) + `npm run build --workspace=apps/web` (from repo root), plus `npx firebase deploy --only firestore:rules --project rivalr-f5436` for rules.
- Web deploys only from repo root: `npx vercel deploy --prod --yes`.
- `user.id` = Firestore doc auto-ID; `user.google_id` = Firebase UID (`request.auth.uid`). Stats docs store BOTH: `user_id` (auto-ID) for existing read filters, `uid` (UID) for rules.
- No comments in code unless asked. Follow existing file style (two-space indent, no semicolons, double quotes, trailing commas).
- All new DB writes must gate on the trusted `uid` field, never on `user_id`.

---

### Task 1: Firestore rules — gate stats on `uid`

**Files:**
- Modify: `firestore.rules:48-58`

**Interfaces:**
- Produces: `user_subject_stats` and `user_chapter_stats` create/update allowed only when the incoming doc's `uid == request.auth.uid`. Read stays open to signed-in users.

- [ ] **Step 1: Update both stats rules**

Replace lines 48-58:

```text
    match /user_subject_stats/{id} {
      allow read: if isSignedIn();
      allow create, update: if isSignedIn() && request.resource.data.uid == request.auth.uid;
      allow delete: if false;
    }

    match /user_chapter_stats/{id} {
      allow read: if isSignedIn();
      allow create, update: if isSignedIn() && request.resource.data.uid == request.auth.uid;
      allow delete: if false;
    }
```

(`request.resource.data` is the incoming document, defined for create and update alike, so this check works for both.)

- [ ] **Step 2: Publish rules**

Run: `npx firebase deploy --only firestore:rules --project rivalr-f5436`
Expected: `+ cloud.firestore: rules file firestore.rules compiled successfully` then `Deploy complete!`

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "fix: gate subject/chapter stats writes on trusted uid"
```

---

### Task 2: Rework stats upserts to merge + carry `uid`

**Files:**
- Modify: `apps/web/src/lib/firestore.ts:218-258` (the `userSubjectStats` and `userChapterStats` blocks, up to the blank line before `shopItems`)

**Interfaces:**
- Consumes: nothing new (types come from existing imports `setDoc`, `getDoc`, `doc`).
- Produces:
  - `firestore.userSubjectStats.upsert(userId: string, uid: string, subject: string, data: { correct: number; total: number; streak: number; xp: number })`
  - `firestore.userChapterStats.upsert(userId: string, uid: string, subject: string, chapterNumber: number, chapterName: string, difficulty: string, data: { correct: number; total: number; time: number; xp: number })`
  - Later tasks call these exact signatures.

- [ ] **Step 1: Replace the `userSubjectStats` block**

Replace lines 218-233 with:

```ts
  userSubjectStats: {
    async get(userId: string) {
      const q = query(collection(db, "user_subject_stats"), where("user_id", "==", userId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => toPlain(d.data() as Record<string, unknown>));
    },
    async upsert(
      userId: string,
      uid: string,
      subject: string,
      data: { correct: number; total: number; streak: number; xp: number },
    ) {
      const ref = doc(db, "user_subject_stats", `${userId}_${subject}`);
      const existing = (await getDoc(ref)).data() as Record<string, number | undefined> | undefined;
      await setDoc(
        ref,
        {
          user_id: userId,
          uid,
          subject,
          quizzes_completed: (existing?.quizzes_completed ?? 0) + 1,
          correct_answers: (existing?.correct_answers ?? 0) + data.correct,
          total_questions: (existing?.total_questions ?? 0) + data.total,
          best_streak: Math.max(existing?.best_streak ?? 0, data.streak),
          xp_earned: (existing?.xp_earned ?? 0) + data.xp,
        },
        { merge: true },
      );
    },
  },
```

- [ ] **Step 2: Replace the `userChapterStats` block**

Replace lines 235-249 with:

```ts
  userChapterStats: {
    async getAll() {
      const snap = await getDocs(collection(db, "user_chapter_stats"));
      return snap.docs.map((d) => toPlain(d.data() as Record<string, unknown>));
    },
    async upsert(
      userId: string,
      uid: string,
      subject: string,
      chapterNumber: number,
      chapterName: string,
      difficulty: string,
      data: { correct: number; total: number; time: number; xp: number },
    ) {
      const key = `${userId}_${subject}_${chapterNumber}`;
      const ref = doc(db, "user_chapter_stats", key);
      const existing = (await getDoc(ref)).data() as Record<string, number | null | undefined> | undefined;
      await setDoc(
        ref,
        {
          user_id: userId,
          uid,
          subject,
          chapter_number: chapterNumber,
          chapter_name: chapterName,
          difficulty,
          attempts: (existing?.attempts ?? 0) + 1,
          correct_answers: (existing?.correct_answers ?? 0) + data.correct,
          total_questions: (existing?.total_questions ?? 0) + data.total,
          best_score: Math.max(existing?.best_score ?? 0, data.correct),
          best_time_seconds:
            existing?.best_time_seconds === undefined || existing?.best_time_seconds === null
              ? data.time
              : Math.min(existing?.best_time_seconds, data.time),
          xp_earned: (existing?.xp_earned ?? 0) + data.xp,
        },
        { merge: true },
      );
    },
  },
```

- [ ] **Step 3: Typecheck**

Run (repo root): `npm run typecheck --workspace=apps/web`
Expected: no output / exit 0 (the new optional-access type casting on `existing` should clear TS).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/firestore.ts
git commit -m "feat: aggregate stats upserts with trusted uid"
```

---

### Task 3: Write stats on quiz finish

**Files:**
- Modify: `apps/web/src/pages/QuizScreen.tsx:140-154` (inside `finishQuiz`)

**Interfaces:**
- Consumes: `firestore.userChapterStats.upsert(...)` and `firestore.userSubjectStats.upsert(...)` from Task 2 (exact signatures above); `attempt.subject` (string), `attempt.chapter_number` (number), `attempt.chapter_name` (string), `attempt.difficulty` (string), `attempt.total_questions` (number); local `correct`, `baseXP`, `timeElapsed`, `streak` already in scope; `user.id` / `user.google_id`.
- Produces: nothing consumed by later tasks (side-effect writes).

- [ ] **Step 1: Add the two upsert calls**

After the existing `await firestore.users.updateCoins(user.id, coins);` (line 152), insert a `Promise.all` block:

```ts
    await firestore.users.updateXP(user.id, Math.round(baseXP));
    await firestore.users.updateCoins(user.id, coins);

    await Promise.all([
      firestore.userChapterStats.upsert(
        user.id,
        user.google_id,
        attempt.subject,
        attempt.chapter_number,
        attempt.chapter_name,
        attempt.difficulty,
        { correct, total: attempt.total_questions, time: timeElapsed, xp: Math.round(baseXP) },
      ),
      firestore.userSubjectStats.upsert(user.id, user.google_id, attempt.subject, {
        correct,
        total: attempt.total_questions,
        streak,
        xp: Math.round(baseXP),
      }),
    ]);

    navigate(`/guild/${guildId}/quiz/${attempt.id}/results`);
```

- [ ] **Step 2: Typecheck**

Run (repo root): `npm run typecheck --workspace=apps/web`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/QuizScreen.tsx
git commit -m "feat: persist subject and chapter stats on quiz finish"
```

---

### Task 4: LoadoutPreview component

**Files:**
- Create: `apps/web/src/components/LoadoutPreview.tsx`

**Interfaces:**
- Consumes: `UserCard` + `type EquippedSlots` from `apps/web/src/components/UserCard.tsx`; `Card` from `@/components/ui`.
- Produces: `<LoadoutPreview name: string avatarUrl: string | null slots: EquippedSlots />` — rendered by Task 5.

- [ ] **Step 1: Create the component**

```tsx
import { UserCard, type EquippedSlots } from "@/components/UserCard";
import { Card } from "@/components/ui";

export function LoadoutPreview({
  name,
  avatarUrl,
  slots,
}: {
  name: string;
  avatarUrl: string | null;
  slots: EquippedSlots;
}) {
  return (
    <Card className="p-4">
      <p className="text-sm font-medium">Your loadout</p>
      <p className="mt-0.5 text-xs text-ink-muted">That's you in guild activity.</p>
      <div className="mt-3">
        <UserCard name={name} avatarUrl={avatarUrl} slots={slots} showTauntOnAvatar size="lg" />
      </div>
    </Card>
  );
}
```

(`slots` is passed in, so `useSlots` inside `UserCard` never fires its Firestore fetch.)

- [ ] **Step 2: Typecheck**

Run (repo root): `npm run typecheck --workspace=apps/web`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/LoadoutPreview.tsx
git commit -m "feat: loadout preview card component"
```

---

### Task 5: Equipped tab — inline pickers + preview

**Files:**
- Modify: `apps/web/src/pages/Profile.tsx` (state/`loadData`, EquippedTab component `Profile.tsx:287-340`)

**Interfaces:**
- Consumes: `resolveEquipped` + `type EquippedSlots` from `@/components/UserCard` (line 21 import area); `LoadoutPreview` from Task 4; `firestore.userInventory.unequip` / `.equip` (signatures: `unequip(userId, itemId)`, `equip(userId, itemId, unequipPrevious?: string)`); existing `ShopItem` import.
- Produces: Equipped tab renders `LoadoutPreview` at top and `CustomTauntManager`, then one inline owned-item chip picker per category (currently-equipped row's full `equipped` array now includes the current user's `name`/`avatar_url` for the preview, still passed through the existing props). Equipping toggles and refetches.

- [ ] **Step 0: Pass current user's name + avatar to EquippedTab so the preview shows the real user**

Change the equipped tab render (line 174) to pass `userName={user?.name ?? ""}` and `avatarUrl={user?.avatar_url}`:

```tsx
                {activeTab === "equipped" && (
                  <EquippedTab
                    equipped={equipped}
                    ownedIds={inventoryIds}
                    items={shopItems}
                    slots={equippedSlots}
                    userName={user?.name ?? ""}
                    avatarUrl={user?.avatar_url ?? null}
                    onEquip={equipItem}
                    onChanged={() => loadData()}
                  />
                )}
```

Then extend the `EquippedTab` props type and use them in the rendered `LoadoutPreview`:

```tsx
function EquippedTab({
  equipped,
  ownedIds,
  items,
  slots,
  userName,
  avatarUrl,
  onEquip,
  onChanged,
}: {
  equipped: { item: ShopItem; purchased_at: string }[];
  ownedIds: string[];
  items: ShopItem[];
  slots: EquippedSlots;
  userName: string;
  avatarUrl: string | null;
  onEquip: (item: ShopItem) => void;
  onChanged?: () => void;
}) {
  return (
    <div className="space-y-2.5 animate-fade-in">
      <LoadoutPreview name={userName} avatarUrl={avatarUrl} slots={slots} />
      <CustomTauntManager onChanged={onChanged} />
```

(Continued in Step 5 — the whole component body is given there; Step 5 must match this signature.)

- [ ] **Step 1: Add imports and new state**

Add to the `@/components/UserCard` import (line 21):
```tsx
import { UserCard, resolveEquipped, type EquippedSlots } from "@/components/UserCard";
```
Add import after the `AvatarUploadManager` import (line 19):
```tsx
import { LoadoutPreview } from "@/components/LoadoutPreview";
```

Add state in the `Profile` component (near `equipped` state, line 42):
```tsx
  const [inventoryIds, setInventoryIds] = useState<string[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [rawInventory, setRawInventory] = useState<
    { item_id: string; is_equipped: boolean }[]
  >([]);
```

- [ ] **Step 2: Store raw data in `loadData`**

In `loadData()` (line 51), after the existing `setEquipped(eqItems);` (line 85), add:

```tsx
    setInventoryIds(inv.map((i) => i.item_id));
    setShopItems(shopItems);
    setRawInventory(
      inv.map((i) => ({ item_id: i.item_id as string, is_equipped: Boolean(i.is_equipped) })),
    );
```

(The `inv` and `shopItems` variables are already in scope in `loadData`.)

- [ ] **Step 3: Add an `equipItem` handler in `Profile`**

Add after `saveStatus` (line 98):

```tsx
  async function equipItem(item: ShopItem) {
    if (!user) return;
    const currentlyEquippedId = equipped.find((e) => e.item.category === item.category)?.item.id;
    if (currentlyEquippedId === item.id) {
      await firestore.userInventory.unequip(user.id, item.id);
    } else {
      await firestore.userInventory.equip(user.id, item.id, currentlyEquippedId);
    }
    await loadData();
  }
```

- [ ] **Step 4: Compute slots**

Above the return (after line 106, the `locked` computation), compute:

```tsx
  const equippedSlots: EquippedSlots = resolveEquipped(rawInventory, shopItems);
```

(The equipped-tab render change that passes these props is already in Step 0 — don't add a second render block.)

- [ ] **Step 5: Replace the `EquippedTab` component**

Replace the whole old `EquippedTab` function (lines 287-341) with:

```tsx
function EquippedTab({
  equipped,
  ownedIds,
  items,
  slots,
  userName,
  avatarUrl,
  onEquip,
  onChanged,
}: {
  equipped: { item: ShopItem; purchased_at: string }[];
  ownedIds: string[];
  items: ShopItem[];
  slots: EquippedSlots;
  userName: string;
  avatarUrl: string | null;
  onEquip: (item: ShopItem) => void;
  onChanged?: () => void;
}) {
  return (
    <div className="space-y-2.5 animate-fade-in">
      <LoadoutPreview name={userName} avatarUrl={avatarUrl} slots={slots} />
      <CustomTauntManager onChanged={onChanged} />
      {ALL_CATEGORIES.map((cat) => {
        const icon: IconName =
          cat === "taunt" ? "flame" : cat === "quiz_theme" ? "target" : cat === "sound_effect" ? "play" : cat === "title" ? "star" : cat === "name_glow" ? "crown" : "user";
        const owned = items.filter((i) => i.category === cat && ownedIds.includes(i.id));
        const current = equipped.find((e) => e.item.category === cat)?.item.id;
        return (
          <Card key={cat} className="flex items-center gap-4 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-overpanel text-volt">
              <Icon name={icon} size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{CATEGORY_LABELS[cat]}</p>
              {owned.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {owned.map((item) => {
                    const isEq = current === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onEquip(item)}
                        title={item.name}
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                          isEq
                            ? "border-volt bg-volt text-field"
                            : "border-line bg-panel text-ink-soft hover:border-line-strong"
                        }`}
                      >
                        {cat === "name_glow" && item.preview_data?.startsWith("#") ? (
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.preview_data }}
                          />
                        ) : null}
                        {cat === "quiz_theme" && item.preview_data?.startsWith("#") ? (
                          <span
                            className="h-3 w-3 rounded-sm border border-line"
                            style={{ backgroundColor: item.preview_data }}
                          />
                        ) : null}
                        {cat === "avatar_frame" && item.preview_data && !item.preview_data.startsWith("#") ? (
                          <span className="text-sm leading-none">{item.preview_data}</span>
                        ) : null}
                        <span>{cat === "title" || cat === "taunt" ? item.preview_data || item.name : item.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-ink-faint">Not owned yet</p>
              )}
            </div>
            <Link
              to="/shop"
              className="shrink-0 text-sm font-medium text-volt transition-colors hover:text-volt-soft"
            >
              Shop
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
```

Note: `Link` is already imported in `Profile.tsx` (line 2). `CATEGORY_LABELS` and `ALL_CATEGORIES` constants (lines 276-285) stay unchanged.

- [ ] **Step 6: Typecheck + build**

Run (repo root): `npm run typecheck --workspace=apps/web; if ($?) { npm run build --workspace=apps/web }`
Expected: typecheck exit 0, then `✓ built in ...` with only the pre-existing chunk-size warning.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/Profile.tsx
git commit -m "feat: inline equip pickers and loadout preview in profile"
```

---

### Task 6: Deploy and push

**Files:**
- No code changes.

**Interfaces:**
- Verifies the whole plan end-to-end.

- [ ] **Step 1: Final typecheck + build + rules dry-check**

Run (repo root): `npm run typecheck --workspace=apps/web; if ($?) { npm run build --workspace=apps/web }`
Expected: both green.

- [ ] **Step 2: Publish rules + deploy web**

Run (repo root): `npx firebase deploy --only firestore:rules --project rivalr-f5436; if ($?) { npx vercel deploy --prod --yes }`
Expected: rules `Deploy complete!`, then Vercel `✓ Production` + `Aliased https://rivalr-phi.vercel.app`.

- [ ] **Step 3: Push**

```bash
git push origin main
```

- [ ] **Step 4: Manual smoke test**

On https://rivalr-phi.vercel.app: finish a quiz → Profile Stats tab shows subject rows; Guild Rankings shows Biology chapter chips (after ≥1 quiz); Profile Equipped tab shows loadout preview + one-tap chips that swap equipped items live.