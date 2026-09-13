# Avatar Frame Everywhere + Custom Frame Color — Design

Date: 2026-09-13

## Problem

1. Avatar frames only render inside `UserCard`. Two places still use a bare
   `Avatar` with no frame: the **Navbar** (32px) and the **Profile header**
   (56px). Users expect their frame to show wherever their avatar appears.
2. Frames come only as preset colors from the shop. There is no way to equip an
   arbitrary color.

## Goals

- Frame renders in Navbar, Profile header, and everywhere `UserCard` already
  renders it (guild leaderboard/members/feed, results, public profile, loadout
  preview) — no regressions.
- Users can buy a "Custom Frame Color" unlock, set an arbitrary hex color, and
  toggle it on/off. While on, the custom color overrides the preset frame ring.

## Non-Goals

- No backend API changes, no Firestore rules changes, no worker changes.
- No custom-color support for the tiny mobile nav (MobileTabBar shows no avatar).
- Glow / title / taunt behavior unchanged.

## Data Model

`ShopItem.category` union (`packages/shared/src/types.ts`) gains one value:

```ts
category: "avatar_frame" | "sound_effect" | "quiz_theme" | "taunt" | "title" | "name_glow" | "custom_frame_color";
```

New shop item in `apps/web/src/seed.mjs` (and reseeded to Firestore):

```js
{ id: "frame_custom", name: "Custom Frame Color", description: "Your color, your frame", category: "custom_frame_color", coin_cost: 500, preview_data: "#C9F73A" },
```

`user_inventory` doc for `frame_custom` gains an optional `custom_color`
field: the user's chosen hex (string). If unset, `resolveEquipped` falls back to
the item's `preview_data` as the effective custom color.

## Override Logic (`apps/web/src/components/UserCard.tsx`)

`resolveEquipped(inventory, items)`:

- Existing behavior unchanged: an equipped `avatar_frame` sets `slots.frameColor`.
- New: if an equipped item has `category === "custom_frame_color"`, its effective
  color (`custom_color` ?? `preview_data`, only when it starts with `#`) becomes
  `slots.frameColor`, **overriding** the preset frame color.
- Type of the inventory entries passed into `resolveEquipped` gains optional
  `custom_color?: string`.

Toggle on/off = equip/unequip `frame_custom`, using the existing
`firestore.userInventory.equip` flow (it is its own category, so it does not
unequip preset frames). The picked color persists on the inventory doc whether
equipped or not. Because this override lives on inventory docs that are already
read everywhere `UserCard` renders, the custom color shows across guild, results,
public profiles, and loadout preview with no extra fetches.

## Shared Framed Avatar

`Avatar` (`apps/web/src/components/ui/Avatar.tsx`) gains an optional
`frameColor?: string` prop. When present, it wraps the avatar image/initials in
the ring + glow wrapper currently inline in `UserCard`:

- ring via `ring-[3px]` and `--tw-ring-color`
- glow via `boxShadow: 0 0 10px ${color}66`

`UserCard` switches to passing `frameColor` to `Avatar` and drops its own ring
markup (behavior identical).

## Where the Frame Now Renders

- `Navbar.tsx` (sidebar): new one-time hook that fetches own inventory + shop
  items, runs `resolveEquipped`, and passes the resulting `frameColor` to
  `Avatar`.
- `Profile.tsx` header (line ~139): already computes `equippedSlots`; pass
  `equippedSlots.frameColor` to `Avatar`.
- Everywhere else already uses `UserCard`.

## Profile → Equipped Tab UI

New category card "Custom Frame Color" (in the `ALL_CATEGORIES` list):

- Not owned → "Shop" link (existing pattern).
- Owned → color swatch + equip/unequip toggle button (existing chip pattern) +
  native `<input type="color">` that saves via
  `firestore.userInventory.setCustomColor(userId, hex)` and refreshes.

`Profile.tsx` also needs `CATEGORY_LABELS["custom_frame_color"]` ("Custom Frame
Color") and a branch in the `EquippedTab` icon ternary for the new category.

## Shop Page

`Shop.tsx` gains:

- `CATEGORY_LABELS["custom_frame_color"]` = "Custom Frame Color"
- `CATEGORY_ICONS["custom_frame_color"]` = an existing icon name (e.g. `crown`)
- A `Preview` branch for `custom_frame_color` rendering a color swatch when
  `preview_data` is a hex color (mirrors the `quiz_theme` case).
- `firestore.userInventory` helper `setCustomColor(userId, hex)`:
  `updateDoc(user_inventory/{userId}_frame_custom, { custom_color: hex })`.

## Error Handling

- `setCustomColor` write failures surface via the existing toast pattern in the
  Equipped tab (same as other equip actions).
- `resolveEquipped` already ignores items that are missing or whose
  `preview_data`/`custom_color` is not a hex; unchanged.

## Testing / Verification

- `npm run typecheck --workspace=apps/web`
- `npm run build --workspace=apps/web`
- Reseed Firestore (`node src/seed.mjs` with service key) so `frame_custom`
  exists in `shop_items`.
- Manual: buy unlock → pick color → toggle on/off → verify frame ring color
  changes; confirm Navbar + Profile header render the frame.

## Files Touched

- `packages/shared/src/types.ts` — category union
- `apps/web/src/seed.mjs` — new item (reseed)
- `apps/web/src/components/UserCard.tsx` — `resolveEquipped` + `frameColor` via `Avatar`
- `apps/web/src/components/ui/Avatar.tsx` — `frameColor` prop + ring wrapper
- `apps/web/src/components/layout/Navbar.tsx` — own-slots hook + framed avatar
- `apps/web/src/pages/Profile.tsx` — header frame + Equipped tab picker
- `apps/web/src/lib/firestore.ts` — `setCustomColor`
- `apps/web/src/pages/Shop.tsx` — category label/icon/preview