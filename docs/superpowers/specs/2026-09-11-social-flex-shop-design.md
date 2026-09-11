title: "Social Flex Shop — Full Accessory Expansion"
date: 2026-09-11
scope: "Shop categories, public profiles, custom taunt uploads, global compression"
---

# Social Flex Shop — Design Spec

## Summary

Expand the rivalr shop from a display-only bookmark into a full social flex system: six equip categories that render visibly everywhere, public user profiles, custom WebP taunt uploads (GIF→WebP pipeline), global asset compression, and a prestige pricing tier.

---

## 1. Architecture — Three Connected Systems

| System | What |
|--------|------|
| **Public profiles** | Every user gets a viewable `/profile/:userId` page. Email, Google UID, and status are never exposed. |
| **Six-category shop** | Avatar frames, taunts, quiz themes, sound effects, plus new categories: **titles** (text next to names) and **name glow** (colored/glowing username text). One equip slot per category, all six simultaneously. |
| **Custom taunt uploads** | Users upload a GIF → browser re-encodes to WebP → worker validates + stores in Cloudflare R2 → becomes their personal taunt on score rows in the activity feed. |

---

## 2. Storage Layer

| What | Where | Why |
|------|-------|-----|
| Questions (JSON) | KV (existing, 1 GB cap) | Small, cacheable, KV's designed use |
| GIF/WebP assets | **Cloudflare R2** (new bucket) | Large binary files, 10 GB free, cost-free at scale |
| Metadata (items, inventory, users) | Firestore (existing) | Already in use |

**R2 bucket binding on the worker:** add `R2_STORAGE` binding pointing to a new bucket created in the Cloudflare dashboard. Objects stored at `taunts/{uid}/{sha256}.webp`.

---

## 3. Public Profiles

### Route
`/profile/:userId` — accessible to any signed-in user.

Own profile at `/profile` redirects to `/profile/:userId` or renders identically (owner's choice, redirect preferred to avoid duplicate routes).

### Layout (Discord-inspired)
- Header: equipped **name glow** tints background; avatar with **frame** centered below
- Identity row: display name + **title** tag + level pill
- Stats: level, XP, coins (coins visible as flex — email never shown)
- Tabs: **Stats** (per-subject), **Achievements** (unlocked only), **Equipped** (shows all 6 slots), **Quizzes** (recent guild attempts)

### Privacy enforcement
New `firestore.users.getPublic(userId)`:
```ts
async getPublic(userId: string) {
  const doc = await getDoc(doc(db, "users", userId));
  if (!doc.exists()) return null;
  const { google_id, email, status, ...public } = doc.data();
  return { id: doc.id, ...public };
}
```
No extra Firestore rule needed (read is already `isSignedIn()`). The data-layer function guarantees private fields are never returned.

### Click paths to public profile
- Guild member list name → link to `/profile/:userId`
- Activity feed name → link to `/profile/:userId`
- Leaderboard row name → link to `/profile/:userId`
- Results page name → link to `/profile/:userId`

All new links use `<Link to={`/profile/${userId}`}>` wrapped around user name text.

---

## 4. Six-Category Shop & Equipping

### Categories

| `category` value | Display label | What it does | Renders where |
|---|---|---|---|
| `avatar_frame` | Frames | Animated/static ring around avatar | Everywhere: profile, guild, feed, leaderboard |
| `name_glow` | Name Glow | Colored/glowing username text (hex in `preview_data`) | Everywhere name appears |
| `title` | Titles | Text tag next to name (e.g. "Bio King", "SPM LEGEND") | Everywhere name appears |
| `taunt` | Taunts | Emoji or custom WebP shown on score rows | Guild activity feed + history |
| `quiz_theme` | Themes | Rethemes quiz screen via CSS vars (hex in `preview_data`) | Quiz screen |
| `sound_effect` | Sounds | Correct / wrong / streak sound effect keys | Quiz screen |

### Equip mechanic
Reuses existing `user_inventory` and `equip(userId, itemId, unequipPrevious)`. No schema change needed — the current system already supports one-per-category equip tracking via `shop_items.category`.

### Custom taunt slot integration
Custom taunt (from `user_custom_taunts` Firestore collection) acts as a special taunt item occupying the `taunt` slot. Equipping a store-bought taunt unequips the custom taunt and vice versa. "None" clears the slot.

### Pricing — Grindy / Prestige tier

| Tier | Coin range | Example items |
|------|------------|---------------|
| Common | 30–80 | Basic frames, basic sounds, simple glows |
| Rare | 120–300 | Animated frames, strong glows, themed titles |
| **Prestige** | **600–1500** | Top animated frames, exclusive titles ("SPM LEGEND", "Grandmaster"), rare glows |

Coin earn rate unchanged (10–25 coins per quiz). Prestige items are genuine long-term goals.

### Inventory UI updates
- `Shop.tsx`: six category tabs, two new `CATEGORY_LABELS` / `CATEGORY_ICONS` entries for `title` and `name_glow`.
- `Profile.tsx` Equipped tab: shows all six slots with respective icons; custom taunt renders WebP inline instead of emoji.

---

## 5. Custom Taunt Upload Pipeline

### Flow (browser re-encode → R2 → taunt slot)

```
User picks GIF/PNG/JPG/WebP
        ↓
Browser: decode via <img> + createImageBitmap
        ↓
Re-draw to <canvas> at 256×256, capped ~10 fps
        ↓
Export as animated WebP (256px, ~10fps)
        ↓
Raw upload bytes DISCARDED — only the WebP blob is sent
        ↓
POST /api/taunts  (WebP blob + Firebase Authorization header)
        ↓
Worker verifies Firebase ID token → extracts trusted uid
        ↓
Worker validates: magic bytes (RIFF....WEBP), size ≤512KB, dims ≤512px
        ↓
SHA-256 hash of WebP bytes → unique filename
        ↓
Store to R2 at  taunts/{uid}/{sha256}.webp
        ↓
Firestore: user_custom_taunts/{uid} = { user_id, asset_url, sha256, created_at }
        ↓
Custom taunt auto-equipped for taunt slot
```

### Security layers (defense in depth)

1. **Browser canvas re-encode** — strips all metadata, scripts, payloads. Raw bytes never reach the server.
2. **Worker magic-byte + size + dimension validation** — blocks anything that isn't a real WebP.
3. **Firebase ID token verify** — server-side auth using Google's public keys. Only authenticated users can write.
4. **R2 path scoped to `{uid}`** — users can only write to their own path.
5. **R2 serve headers** — `Content-Type: image/webp`, `X-Content-Type-Options: nosniff`, `Cache-Control: public, max-age=604800`. Browser never executes it.

### Replacing / deleting
- `PUT /api/taunts` — replaces custom taunt (deletes previous R2 object, updates Firestore doc).
- `DELETE /api/taunts` — removes custom taunt, clears taunt slot, deletes R2 object.

---

## 6. Global Asset Compression Principle

**Rule:** any binary that enters the app passes through one shared `compressImage(file, opts)` util before storage or upload. No raw originals are ever persisted.

### `compressImage` signature
```ts
async function compressImage(
  file: File,
  opts?: { maxDim?: number; quality?: number; maxBytes?: number }
): Promise<Blob>
```
- Decodes via `createImageBitmap` / `<img>`
- Resizes to `maxDim` (default 256)
- Re-encodes to WebP (JPEG fallback if unsupported)
- If `maxBytes` set, iteratively lowers quality until under budget
- Returns clean Blob; original file discarded

### Where it's used
- Custom taunt uploads (maxDim 256, maxBytes 512KB)
- Future uploads (banners, etc.) — plug into the same util

### What's unaffected
- Question JSON — already compressed in KV via existing `compress()` / `decompress()` worker util
- Google avatar URLs — external, never stored

---

## 7. Where Accessories Render — Social Flex Everywhere

One shared component `UserCard` handles all user display contexts. It fetches equipped items once and renders consistently.

### `UserCard` props and rendering

| Prop | Value |
|------|-------|
| `userId` | Resolves all 6 equipped items from `user_inventory` |
| `name` | Display name |
| `avatarUrl` | Google avatar URL |
| `variant` | `"compact"` (feed/leaderboard) or `"full"` (profile) |

### Render rules by context

| User appears... | What renders |
|---|---|
| **Public profile** | Full-size avatar with frame, glow name, title, stats, all tabs |
| **Guild members list** | Glow name + title under name, avatar with frame |
| **Guild leaderboard** | Frame + glow + title |
| **Activity feed** | Frame + glow + title + custom/shop taunt WebP below score |
| **Quiz results** | Glow + title; taunt celebration if streak > threshold |
| **QuizScreen (self)** | Theme applied on mount, sound effects play |

### Quiz-specific accessory rendering

**Themes:**
`QuizScreen` reads equipped `quiz_theme` on mount. `preview_data` hex → CSS custom properties applied to quiz container:
```css
--quiz-bg: {hex};
--quiz-accent: {hex};
--quiz-text: {auto-contrast(hex)};
```
Applied before render (in `useEffect` before paint) to avoid flicker.

**Sound effects:**
Equipped `sound_effect`'s `preview_data` stores a key like `"correct_basic"`, `"wrong_basic"`, `"streak_fire"`. Worker serves static `.webp` audio files from R2 at `sfx/{key}.webp`. Quiz screen loads via `fetch()` + Web Audio API `decodeAudioData` → `BufferSource.play()`.

### Feed taunt rendering
`ActivityTab` (guild history) per row: fetches the user's equipped taunt from their `user_inventory`. If `taunt` slot is set → render `preview_data` emoji. If `user_custom_taunts/{uid}` exists and is equipped → render `<img src={r2_url}>` inline with `max-height: 64px`.

---

## 8. Error Handling & Edge Cases

### Upload errors (user-facing toasts)
| Condition | Message |
|-----------|---------|
| File > 8 MB | "File too large — please use a file under 8 MB" |
| Unsupported format | "Unsupported format — use GIF, PNG, JPG, or WebP" |
| Validation fails server-side | "Upload rejected — file could not be verified as an image" |
| Network failure | "Upload failed — please try again" (original file retained in component state for retry) |

### Profile edge cases
| Condition | Behavior |
|-----------|----------|
| Invalid userId in URL | Friendly "User not found" empty state (not a blank screen) |
| Viewing own profile via `/profile/:userId` | Redirect to `/profile` |

### Equipping edge cases
| Condition | Behavior |
|-----------|----------|
| Equipping store taunt while custom is active | Custom taunt unequipped, store taunt equipped (one-slot swap) |
| Deleting custom taunt while equipped | Taunt slot becomes "None" |
| No items equipped in any category | `UserCard` renders defaults: no frame, plain white name, no glow, no title |

### Coin balance atomicity
Equip + coin deduct handled via:
```ts
await firestore.userInventory.equip(user.id, itemId, previousItemId);
await firestore.users.updateCoins(user.id, -item.coin_cost);
```
If coin deduct fails → re-equip previous item (client-side rollback). Firestore transactions are avoided to keep the existing simple pattern; risk is low since deduct is a minor inconsistency.

---

## 9. Testing Focus

| Area | What to verify |
|------|----------------|
| `compressImage` | GIF→WebP at various sizes (tiny, huge, animated, static); fallback to JPEG; quality iteration under `maxBytes` |
| R2 serving | Correct `Content-Type`, `nosniff` header present, cache headers |
| `UserCard` | Renders with 0, 1, and 6 equipped items; no broken layout in any combination |
| Public profile | Email never leaks via network tab; `getPublic` returns only public fields |
| Coin balance | After equip, coins = previous - cost; no double-spend |
| Quiz theme | CSS vars apply on mount; no flash of unstyled quiz |
| Quiz sound | Audio loads and plays on correct/wrong/streak; graceful if file missing |
| Activity feed taunts | Custom WebP renders inline; emoji taunts render correctly |
