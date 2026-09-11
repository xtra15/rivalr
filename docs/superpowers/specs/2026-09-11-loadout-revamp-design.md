title: "Loadout Revamp — Equip UX + Rewards Data Pipeline"
date: 2026-09-11
scope: "Equip UX (loadout preview + inline pickers), stats rewrite on quiz finish, firestore rules fix"
---

# Loadout Revamp — Design Spec

## Summary

Fix the broken rewards pipeline (quiz finish never writes stats, so Rankings chapter filter and Profile stats stay empty) and revamp the equip experience: a visible "loadout preview" of how you look to the guild plus one-tap inline equip pickers per category in the Profile Equipped tab.

---

## 1. The Bug: Stats Are Never Written

`finishQuiz()` in `QuizScreen.tsx` writes three things: the attempt doc (correct answers, XP, coins) and increments `users.xp` / `users.coins`. It **never** writes to `user_subject_stats` or `user_chapter_stats`, even though `firestore.ts` defines `upsert` helpers for both (lines 224–248). Those helpers have zero callers.

Consequences today:

- **GuildHome Rankings chapter filter** (`GuildHome.tsx:465`) derives its chapter list from `user_chapter_stats`, so it renders nothing until stats exist — "Pick a chapter to see rankings." with no chapters to pick.
- **Profile Stats tab** (`Profile.tsx`) reads the same collections, so it always shows "No statistics yet."
- **XP/coins** flow correctly (they're read from the attempt + user) — those work.

### Fix
After the attempt update in `finishQuiz()`, call both upserts with per-finish aggregates. This populates existing reads with zero new queries and no new UI.

---

## 2. Firestore Rules: Same UID Mismatch

`user_subject_stats` and `user_chapter_stats` docs store `user_id` = Firestore auto-ID (`user.id`), but their **create/update rules** gate on `resource.data.user_id == request.auth.uid` (Firebase UID). They never match — exactly the bug that blocked quiz finishes.

### Fix (same pattern as the quiz-attempt fix)
- Write a trusted `uid: user.google_id` field on both stats docs at creation.
- Change rules to gate create/update on `resource.data.uid == request.auth.uid` (allow either field for back-compat, just like the attempt rule uses `uid`).

---

## 3. Stats Aggregates on Finish

In `finishQuiz()` after `quizAttempts.update`, compute and upsert:

### `user_chapter_stats` (doc key: `{userId}_{subject}_{chapter}`)
For the finished subject+chapter, merge with existing doc:
- `attempts` +1
- `correct_answers` + correct
- `total_questions` + total
- `best_score` = max(existing, correct)
- `best_time_seconds` = min(existing, time_taken)
- `xp_earned` + round(baseXP)
- `difficulty` (last used)
- `chapter_name`

### `user_subject_stats` (doc key: `{userId}_{subject}`)
Merge by subject:
- `quizzes_completed` +1
- `correct_answers` + correct
- `total_questions` + total
- `best_streak` = max(existing, current streak)
- `xp_earned` + round(baseXP)

Both writes go through the existing `firestore.userChapterStats.upsert` / `userSubjectStats.upsert` helpers (extend them to accept the `uid`).

Rules already allow **read** for any signed-in user, so Rankings, Profile, ProfilePublic, and Admin all light up with no changes.

---

## 4. Loadout Preview Card

New component `LoadoutPreview` mounted at the top of the Profile **Equipped** tab (`Profile.tsx`), above the category pickers.

- Reuses the equipped-slots rendering from `UserCard`/`resolveEquipped` so it matches the guild feed exactly:
  - Real avatar (animated GIF included) with equipped frame ring color
  - Name with equipped glow color via `textShadow`
  - Equipped title badge (volt chip)
  - Equipped taunt emoji overlay (`showTauntOnAvatar`)
- Caption: "That's you in guild activity."
- Since it duplicates UserCard markup, `LoadoutPreview` composes `<UserCard … showTauntOnAvatar slots={equippedSlots} />` rather than re-implementing it.

---

## 5. Inline Equip Pickers

In the Profile Equipped tab, each category row becomes a **one-tap picker** instead of a single line ending in a "Change" link.

- Show all **owned** items for that category as chips:
  - avatar_frame → color ring swatch / `preview_data` glyph
  - name_glow → colored dot
  - title / taunt → the text/emoji on the chip
  - quiz_theme → color block
  - sound_effect → play icon + name
- Currently-equipped chip highlighted; tapping another owned chip swaps (uses existing `userInventory.equip` / `unequip` with the same-category unequip-previous logic).
- Each row keeps a small "Shop" link to buy items not yet owned.
- Empty categories (no owned items) keep the current "Not equipped / Shop" hint.

Equip state lives in Profile state (`equipped` list) + Firestore; no new routes, no new collections.

---

## 6. Shop

Stays as-is. Owned cards already show Equip/Equipped. No changes (beyond the data fix enabling categories to render previews once seeded).

---

## Out of Scope / Future Ideas

- New XP/coin sources (streak bonuses, achievement rewards, first-clear bonuses).
- Unifying Shop + Profile into a single "Wardrobe" page.
- Animating the loadout preview beyond what UserCard already does.

---

## Files Touched (expected)

| File | Change |
|------|--------|
| `firestore.rules` | stats rules gate on `uid` |
| `apps/web/src/lib/firestore.ts` | upserts accept `uid` |
| `apps/web/src/pages/QuizScreen.tsx` | write both stats on finish |
| `apps/web/src/components/LoadoutPreview.tsx` | new preview card |
| `apps/web/src/pages/Profile.tsx` | mount preview + inline pickers |
| `apps/web/src/components/ui/Icon.tsx` | icon only if needed |