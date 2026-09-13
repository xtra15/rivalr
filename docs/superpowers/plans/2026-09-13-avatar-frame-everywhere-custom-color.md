# Avatar Frame Everywhere + Custom Frame Color Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the avatar frame ring everywhere an avatar appears (Navbar, Profile header, plus all existing `UserCard` usages), and let users buy a "Custom Frame Color" unlock, pick an arbitrary hex color, and toggle it on/off.

**Architecture:** Add a `custom_frame_color` shop category whose unlock item is `frame_custom`; the user's chosen hex is stored on its `user_inventory` doc as `custom_color`, so the existing `resolveEquipped` inventory read (already done everywhere) lets the override propagate to every avatar with zero extra fetches. Move the ring wrapper into the shared `Avatar` component so bare avatars (Navbar, Profile header) can render it too.

**Tech Stack:** TypeScript, React (Vite), Firebase Admin (seeding), Firestore web SDK, Cloudflare `@rivalr/shared` package.

## Global Constraints

- Code style: two-space indent, no semicolons, double quotes, trailing commas, no code comments unless asked.
- `tsconfig` `noUnusedLocals` → unused imports break typecheck. Remove what you don't use.
- `ShopItem.category` values must match the runtime seed data exactly ("avatar_frame" | "sound_effect" | "quiz_theme" | "taunt" | "title" | "name_glow" | "custom_frame_color").
- No new dependencies. Native `<input type="color">` for the picker.
- No backend/worker/rules changes. Web-only deploy.
- Custom color only applies when it is a hex string starting with `#`; otherwise `resolveEquipped` ignores it and falls back to the preset frame.
- Commit after every task. No semicolons in committed code.
- No code comments unless the user asks for them.

---

### Task 1: Shop category type + seed item + Firestore helper

**Files:**
- Modify: `packages/shared/src/types.ts:73-80`
- Modify: `apps/web/src/seed.mjs:63-105`
- Modify: `apps/web/src/lib/firestore.ts:301-337`
- Run seed: `node src/seed.mjs` in `apps/web` with service key env

**Interfaces:**
- Produces: `ShopItem.category` includes `"custom_frame_color"`; seed has `frame_custom` (name "Custom Frame Color", 500 coins, preview_data `#C9F73A`); `firestore.userInventory.setCustomColor(userId: string, hex: string)`.

- [ ] **Step 1: Add category to the shared type**

In `packages/shared/src/types.ts:77`, change the `category` union:

```ts
  category: "avatar_frame" | "sound_effect" | "quiz_theme" | "taunt" | "title" | "name_glow" | "custom_frame_color";
```

- [ ] **Step 2: Add the seed item**

In `apps/web/src/seed.mjs`, add a new array element right after the `frame_cherry` line (line ~70):

```js
  { id: "frame_custom", name: "Custom Frame Color", description: "Your color, your frame", category: "custom_frame_color", coin_cost: 500, preview_data: "#C9F73A" },
```

- [ ] **Step 3: Add `setCustomColor` Firestore helper**

In `apps/web/src/lib/firestore.ts`, add a method to `userInventory` (after `unequip`, before `getForUsers`):

```ts
    async setCustomColor(userId: string, hex: string) {
      const ref = doc(db, "user_inventory", `${userId}_frame_custom`);
      await updateDoc(ref, { custom_color: hex });
    },
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck --workspace=apps/web`
Expected: PASS (no new errors).

- [ ] **Step 5: Reseed Firestore**

Verify `apps/web/src/seed.mjs` has no TS type annotations (search for `: Record` — must be gone). Then:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "D:\e\Projects\smthmalicis\rivalr-f5436-firebase-adminsdk-fbsvc-39c958340e.json"
node src/seed.mjs
```

Expected: "Seeding achievements... / Seeding shop items... / Done! Firestore seeded."

- [ ] **Step 6: Verify the seeded doc**

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "D:\e\Projects\smthmalicis\rivalr-f5436-firebase-adminsdk-fbsvc-39c958340e.json"
node --input-type=module -e "import { initializeApp, cert } from 'firebase-admin/app'; import { readFileSync } from 'fs'; const k=JSON.parse(readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS,'utf8')); const app=initializeApp({credential:cert(k)}); const {getFirestore}=await import('firebase-admin/firestore'); const db=getFirestore(app); const snap=await db.collection('shop_items').doc('frame_custom').get(); console.log(snap.exists() ? JSON.stringify(snap.data()) : 'MISSING'); process.exit(0);"
```

Expected: doc with `category: "custom_frame_color"`, `preview_data: "#C9F73A"`, `coin_cost: 500`.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/types.ts apps/web/src/seed.mjs apps/web/src/lib/firestore.ts
git commit -m "feat: add custom frame color shop category"
```

---

### Task 2: `resolveEquipped` honors the custom frame color override

**Files:**
- Modify: `apps/web/src/components/UserCard.tsx:13-31`
- Modify: `apps/web/src/pages/Profile.tsx:97-99`
- Modify: `apps/web/src/pages/Results.tsx:33-35`
- Modify: `apps/web/src/pages/ProfilePublic.tsx:31`
- Modify: `apps/web/src/pages/GuildHome.tsx:66-69`

**Interfaces:**
- Consumes: `ItemWithCustomColor = { item_id: string; is_equipped: boolean; custom_color?: string | null }`.
- Produces: `resolveEquipped(inventory: ItemWithCustomColor[], items: ShopItem[]): EquippedSlots` — newly, if an equipped item has `category === "custom_frame_color"`, its effective color (`inv.custom_color` if hex else `item.preview_data` if hex) becomes `slots.frameColor`, overriding any preset frame color.

- [ ] **Step 1: Update `resolveEquipped` signature and body**

In `apps/web/src/components/UserCard.tsx`, replace `resolveEquipped` (lines 13-31) with:

```ts
export interface ItemWithCustomColor {
  item_id: string;
  is_equipped: boolean;
  custom_color?: string | null;
}

export function resolveEquipped(
  inventory: ItemWithCustomColor[],
  items: ShopItem[],
): EquippedSlots {
  const slots: EquippedSlots = {};
  let presetFrame: string | undefined;
  let customFrame: string | undefined;
  for (const inv of inventory) {
    if (!inv.is_equipped) continue;
    const item = items.find((s) => s.id === inv.item_id);
    if (!item) continue;
    if (item.category === "avatar_frame") {
      presetFrame = item.preview_data?.startsWith("#") ? item.preview_data : undefined;
    }
    if (item.category === "name_glow") {
      slots.glowColor = item.preview_data?.startsWith("#") ? item.preview_data : undefined;
    }
    if (item.category === "custom_frame_color") {
      customFrame = inv.custom_color?.startsWith("#")
        ? inv.custom_color
        : item.preview_data?.startsWith("#")
          ? item.preview_data
          : undefined;
    }
    if (item.category === "title") slots.title = item.preview_data ?? undefined;
    if (item.category === "taunt") slots.tauntPreview = item.preview_data;
  }
  slots.frameColor = customFrame ?? presetFrame;
  return slots;
}
```

This guarantees the custom color always wins regardless of inventory listing order: preset frames are collected into `presetFrame`, the custom override into `customFrame`, and the assignment `customFrame ?? presetFrame` happens after the loop.

- [ ] **Step 2: Update callers' cast types**

All callers currently cast raw inventory as `{ item_id: string; is_equipped: boolean }[]`. Update each to `ItemWithCustomColor[]` (import it where needed):

- `apps/web/src/components/UserCard.tsx:56` — `resolveEquipped(inv as unknown as ItemWithCustomColor[], items)`
- `apps/web/src/pages/Results.tsx:34` — same cast; add `ItemWithCustomColor` import from `@/components/UserCard`.
- `apps/web/src/pages/ProfilePublic.tsx:31` — same cast + import.
- `apps/web/src/pages/GuildHome.tsx:66-69` — the filter result cast → `ItemWithCustomColor[]` + import.

- [ ] **Step 3: Preserve `custom_color` when Profile maps raw inventory**

In `apps/web/src/pages/Profile.tsx:97-99`, the `rawInventory` map currently drops `custom_color`. Change it to:

```ts
    setRawInventory(
      inv.map((i) => ({
        item_id: i.item_id as string,
        is_equipped: Boolean(i.is_equipped),
        custom_color: (i as { custom_color?: string | null }).custom_color ?? null,
      })),
    );
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck --workspace=apps/web`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/UserCard.tsx apps/web/src/pages/Results.tsx apps/web/src/pages/ProfilePublic.tsx apps/web/src/pages/GuildHome.tsx apps/web/src/pages/Profile.tsx
git commit -m "feat: custom frame color overrides preset in resolveEquipped"
```

---

### Task 3: `Avatar` supports the frame ring; `UserCard` uses it

**Files:**
- Modify: `apps/web/src/components/ui/Avatar.tsx`
- Modify: `apps/web/src/components/UserCard.tsx:75-106`

**Interfaces:**
- Consumes: `Avatar` gets `frameColor?: string`.
- Produces: `<Avatar src name size frameColor />` renders the ring+glow wrapper (identical styling to today's `UserCard` ring: `ring-[3px]`, `--tw-ring-color`, `boxShadow: 0 0 10px ${color}66`). `UserCard` renders `<Avatar … frameColor={frameColor} />` and drops its own ring markup.

- [ ] **Step 1: Add `frameColor` to `Avatar.tsx`**

Replace the whole `Avatar.tsx` content:

```tsx
import type { CSSProperties } from "react";

interface AvatarProps {
  src: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  frameColor?: string;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-24 w-24 text-3xl",
};

const hueFor = (name: string) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
};

export function Avatar({ src, name, size = "md", className = "", frameColor }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const body = src ? (
    <img
      src={src}
      alt={name}
      className={`rounded-full object-cover ring-1 ring-line ${sizes[size]} ${className}`}
    />
  ) : (
    <div
      className={`flex items-center justify-center rounded-full font-semibold text-white ring-1 ring-line select-none ${sizes[size]} ${className}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hueFor(name || "?")} 55% 40%), hsl(${(hueFor(name || "?") + 40) % 360} 60% 30%))`,
      }}
      aria-label={name}
    >
      {initials}
    </div>
  );

  if (!frameColor) return body;

  return (
    <div
      className={`relative shrink-0 rounded-full ring-[3px]`}
      style={{ "--tw-ring-color": frameColor, boxShadow: `0 0 10px ${frameColor}66` } as CSSProperties}
    >
      {body}
    </div>
  );
}
```

- [ ] **Step 2: Simplify `UserCard` to pass `frameColor`**

In `apps/web/src/components/UserCard.tsx`, replace the render block (lines 75-89) — the wrapper div and `<Avatar>` — with:

```tsx
      <Avatar src={avatarUrl} name={name} size={size} frameColor={frameColor} />
```

Delete the now-unused `CSSProperties` import if `frameColor`/`--tw-ring-color` are no longer referenced directly in the file. The taunt badge overlay must be preserved: since `Avatar` no longer renders the relative wrapper, re-wrap on the parent side of `UserCard`. Final render:

```tsx
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative shrink-0 rounded-full">
        <Avatar src={avatarUrl} name={name} size={size} frameColor={frameColor} />
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
```

- [ ] **Step 3: Typecheck + build**

Run: `npm run typecheck --workspace=apps/web`
Expected: PASS.
Run: `npm run build --workspace=apps/web`
Expected: PASS (vite build completes).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/Avatar.tsx apps/web/src/components/UserCard.tsx
git commit -m "feat: shared Avatar frame ring, used by UserCard"
```

---

### Task 4: Navbar renders the user's frame

**Files:**
- Modify: `apps/web/src/components/layout/Navbar.tsx`

**Interfaces:**
- Consumes: `resolveEquipped`, `ItemWithCustomColor` from `@/components/UserCard`; `firestore` from `@/lib/firestore`.
- Produces: `Sidebar` computes own `frameColor` via a one-time `useEffect` and passes it to `<Avatar frameColor={frameColor}>`.

- [ ] **Step 1: Add slot loading to `Sidebar`**

In `apps/web/src/components/layout/Navbar.tsx`, update imports and `Sidebar`:

```tsx
import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Avatar, CoinBalance, Icon, LogoMark, type IconName } from "@/components/ui";
import { resolveEquipped, type ItemWithCustomColor } from "@/components/UserCard";
import { firestore } from "@/lib/firestore";
import type { ShopItem } from "@rivalr/shared";
```

Inside `Sidebar`, after `const location = useLocation();`:

```tsx
  const [frameColor, setFrameColor] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        const [inv, items] = await Promise.all([
          firestore.userInventory.getForUsers([user.id]),
          firestore.shopItems.getAll() as Promise<ShopItem[]>,
        ]);
        if (!alive) return;
        const slots = resolveEquipped(inv as unknown as ItemWithCustomColor[], items);
        setFrameColor(slots.frameColor);
      } catch {
        if (alive) setFrameColor(undefined);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user]);
```

Then line 61's avatar:

```tsx
          <Avatar src={user.avatar_url} name={user.name} size="sm" frameColor={frameColor} />
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck --workspace=apps/web`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/Navbar.tsx
git commit -m "feat: navbar shows own avatar frame"
```

---

### Task 5: Profile header frame + Equipped tab color picker

**Files:**
- Modify: `apps/web/src/pages/Profile.tsx`

**Interfaces:**
- Consumes: `equippedSlots.frameColor` (already computed at line 133), `firestore.userInventory.setCustomColor`, native color input.
- Produces: Profile header renders frame ring; "Custom Frame Color" card in Equipped tab with swatch chip, equip/unequip toggle, and `<input type="color">` that saves via `setCustomColor`.

- [ ] **Step 1: Frame the header avatar**

At `apps/web/src/pages/Profile.tsx:139`, pass the frame:

```tsx
          <Avatar
            src={user.avatar_url}
            name={user.name}
            size="lg"
            frameColor={equippedSlots.frameColor}
          />
```

- [ ] **Step 2: Register the new category**

In the `EquippedTab` helper prop destructure list order is fine; update the constants and icon ternary:

- `CATEGORY_LABELS` (line ~314): add `custom_frame_color: "Custom Frame Color",`
- `ALL_CATEGORIES` (line 323): add `"custom_frame_color"` to the array.
- In the category icon ternary (line ~350), add a branch so `custom_frame_color` gets an icon. `IconName` options include `"target"`, `"sparkles"`, `"play"`. Use an existing one not already claimed, e.g. `sparkles`:

```tsx
        const icon: IconName =
          cat === "taunt" ? "flame" : cat === "quiz_theme" ? "target" : cat === "sound_effect" ? "play" : cat === "title" ? "star" : cat === "name_glow" ? "crown" : cat === "custom_frame_color" ? "sparkles" : "user";
```

- [ ] **Step 3: Add the swatch + toggle chip for the custom color item**

The owned-items chip renderer (lines 362-394) must, for `cat === "custom_frame_color"`, show a color swatch (same shape as `name_glow`) and the equip state. Add after the `name_glow` block (line ~380):

```tsx
                        {cat === "custom_frame_color" && item.preview_data ? (
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: item.preview_data ?? "#C9F73A" }}
                          />
                        ) : null}
```

(Note: the chip uses `item.preview_data` for the swatch because the per-user picked color lives on the inventory doc; the equip toggle already runs through the existing `onEquip`.)

- [ ] **Step 4: Add the color picker section in the custom frame color card**

Below the owned-items chip row inside the same `Card` (still within the `EquippedTab.map`), add a picker for the custom frame color category. After the `{owned.length > 0 ? ... : (...)}` block (line ~404), insert:

```tsx
            {cat === "custom_frame_color" && owned.length > 0 ? (
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="color"
                  defaultValue={slots.frameColor ?? "#C9F73A"}
                  onChange={(e) => {
                    firestore.userInventory
                      .setCustomColor(userId, e.currentTarget.value)
                      .then(() => onChanged?.());
                  }}
                  className="h-8 w-10 cursor-pointer rounded-md border border-line bg-panel p-0.5"
                  aria-label="Custom frame color"
                />
                <span className="text-xs text-ink-faint">Pick any color for your frame</span>
              </div>
            ) : null}
```

Note: `EquippedTab` already receives `userId`? It does NOT today — it receives `userName`/`avatarUrl`. Update `EquippedTab` props to accept `userId: string`, and pass `userId={user.id}` at the call site (line ~202-211).

- [ ] **Step 5: Wire `userId` through**

At the `EquippedTab` component signature (lines 325-343), the props type must include `userId: string;` and the `onEquip`/`slots` props stay as-is. Call site (line 202):

```tsx
                  <EquippedTab
                    equipped={equipped}
                    ownedIds={inventoryIds}
                    items={shopItems}
                    slots={equippedSlots}
                    userName={user?.name ?? ""}
                    avatarUrl={user?.avatar_url ?? null}
                    userId={user?.id ?? ""}
                    onEquip={equipItem}
                    onChanged={() => loadData()}
                  />
```

- [ ] **Step 6: Typecheck + build**

Run: `npm run typecheck --workspace=apps/web`
Expected: PASS.
Run: `npm run build --workspace=apps/web`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/Profile.tsx
git commit -m "feat: profile header frame and custom frame color picker"
```

---

### Task 6: Shop page shows the custom frame color item properly

**Files:**
- Modify: `apps/web/src/pages/Shop.tsx`

**Interfaces:**
- Consumes: `ShopItem.category === "custom_frame_color"`.
- Produces: shop displays tab "Custom Frame Color" with the item card and a color-swatch preview.

- [ ] **Step 1: Add category label + icon**

In `apps/web/src/pages/Shop.tsx`, add to `CATEGORY_LABELS` (line ~9): `custom_frame_color: "Custom Frame Color",`. Add to `CATEGORY_ICONS` (line ~18) — `custom_frame_color: "sparkles",` and widen the literal type of `CATEGORY_ICONS` values to include `"sparkles"`:

```ts
const CATEGORY_ICONS: Record<string, "user" | "play" | "target" | "flame" | "star" | "crown" | "sparkles"> = {
  avatar_frame: "user",
  sound_effect: "play",
  quiz_theme: "target",
  taunt: "flame",
  title: "star",
  name_glow: "crown",
  custom_frame_color: "sparkles",
};
```

- [ ] **Step 2: Add preview branch**

In the `Preview` component (line ~205), add a branch before the `quiz_theme` handled cases, mirroring the color swatch pattern. After the `avatar_frame` case (line ~214):

```tsx
      ) : item.category === "custom_frame_color" ? (
        <div
          className="h-8 w-16 rounded-md border border-line"
          style={{ backgroundColor: item.preview_data ?? "#C9F73A" }}
        />
      ) : item.category === "sound_effect" ? (
```

- [ ] **Step 3: Typecheck + build**

Run: `npm run typecheck --workspace=apps/web`
Expected: PASS.
Run: `npm run build --workspace=apps/web`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/Shop.tsx
git commit -m "feat: shop page listing for custom frame color"
```

---

### Task 7: Deploy and verify end-to-end

**Files:**
- None (deploy only).

**Interfaces:**
- Consumes: tasks 1-6.

- [ ] **Step 1: Full typecheck + build**

Run (from repo root): `npm run typecheck --workspace=apps/web`
Expected: PASS.
Run: `npm run build --workspace=apps/web`
Expected: PASS.

- [ ] **Step 2: Deploy web**

```bash
npx vercel deploy --prod --yes --scope xtra15s-projects
```

Expected: success, alias `https://rivalr-phi.vercel.app` updated.

- [ ] **Step 3: Push**

```bash
git push origin main
```

- [ ] **Step 4: Manual QA checklist**

1. Buy "Custom Frame Color" (500 coins) in shop → appears in Equipped tab.
2. Pick a hex color in Profile → Equipped → frame ring color changes immediately on LoadoutPreview.
3. Toggle the chip off → preset frame color returns (or no ring if none equipped).
4. Navbar avatar shows the ring in the picked color.
5. Profile header avatar shows the ring in the picked color.
6. Open a public profile (`/profile/:userId`) → ring shows there too.
7. Guild leaderboard/members and quiz Results → ring shows (regression check).
8. Users without the unlock see no change.
9. If both a preset frame AND custom color are equipped, custom color wins.

- [ ] **Step 5: Report results**

Report deployment URL, commit hashes, and QA findings (pass/fail per checklist item).