# Feature Additions — Guild Settings, Admin Dashboard, Subject Rendering, UX Fixes

**Date:** 2026-09-11
**Status:** Draft — awaiting user approval

---

## 1. Guild Create UX Revamp

**Current state:** Inline form on Dashboard page with name input + "Create" button.

**New design:**
- Dedicated modal (overlay, not inline) triggered by "Create guild" button
- Modal contains: guild name input (autofocus, max 40 chars, character counter), "Create" button, "Cancel" link
- After create: modal closes, toast "Guild created", auto-navigate to guild page
- Invite code displayed in a copyable card immediately after creation
- Loading state: button shows spinner + "Creating…"
- Validation: name required, min 2 chars, max 40 chars

**Files:** `Dashboard.tsx` (modal state + form), new `GuildCreateModal.tsx` component

---

## 2. LIVE Indicator Fix

**Current state:** Small pulsing dot + "LIVE" eyebrow text in guild header and dashboard. Looks disconnected.

**New design:**
- Single unified `LiveBadge` component
- Smaller: 6px dot (not 8px), subtle pulse (opacity 0.4→1, 2s ease-in-out)
- Text: "Live" in 10px uppercase tracked, volt color
- Container: rounded-md, bg-panel, border-line, px-2.5 py-1
- Used in: guild header, dashboard player strip

**Files:** new `LiveBadge.tsx` component, replace inline LIVE dots in `GuildHome.tsx` and `Dashboard.tsx`

---

## 3. Guild Settings (Owner-only)

**Current state:** No guild settings exist. No rename, no delete. Firestore rules block update/delete on guilds entirely.

**New design:**
- Settings panel accessible via gear icon in guild header (only visible to guild creator: `guild.created_by === user.id`)
- Panel opens as a slide-over or modal with two sections:

### 3a. Rename Guild
- Input field pre-filled with current name
- "Save" button → calls `firestore.guilds.update(guildId, { name: newName })`
- Toast "Guild renamed" on success

### 3b. Delete Guild
- Danger zone: red-tinted card
- "Delete guild" button → opens confirmation modal
- Confirmation: type guild name to confirm, "Delete" button disabled until name matches
- On confirm: delete all `guild_members` for this guild, delete the guild document
- Toast "Guild deleted", navigate to `/dashboard`

**New Firestore operations needed:**
```ts
guilds: {
  async update(guildId: string, data: { name: string }) { ... }
  async delete(guildId: string) {
    // Delete all members first
    const members = await firestore.guildMembers.getByGuild(guildId);
    for (const m of members) {
      await deleteDoc(doc(db, "guild_members", `${guildId}_${m.user_id}`));
    }
    await deleteDoc(doc(db, "guilds", guildId));
  }
}
```

**Firestore rules update needed:**
```
match /guilds/{guildId} {
  allow read: if isSignedIn();
  allow create: if isSignedIn();
  allow update: if isSignedIn() && resource.data.created_by == request.auth.uid;
  allow delete: if isSignedIn() && resource.data.created_by == request.auth.uid;
}
match /guild_members/{memberId} {
  allow read: if isSignedIn();
  allow create: if isSignedIn();
  allow delete: if isSignedIn();  // needed for guild deletion
}
```

**Files:** `firestore.ts` (new ops), `firestore.rules` (update), `GuildHome.tsx` (settings panel), new `GuildSettings.tsx` component

---

## 4. Admin Dashboard

**Current state:** No admin features.

**New design:**
- Route: `/admin` (new route inside Layout, no separate auth — any signed-in user can access for now; admin restriction via email check can be added later)
- Page shows:
  - **Stats overview**: total quizzes, total questions generated, unique users, per-subject breakdown
  - **Question browser**: table of all quiz attempts with expandable rows showing questions_data (question, options, correct answer, explanation)
  - **Filters**: subject dropdown, chapter dropdown, difficulty dropdown, date range
  - **Export**: "Copy all questions" button (copies JSON to clipboard for review)

**Data sources (existing ops):**
- `quizAttempts.getAll()` — need to add this (currently only `getByGuild`)
- `userChapterStats.getAll()` — already exists
- `usersBatch.getByIds()` — already exists

**New Firestore operation:**
```ts
quizAttempts: {
  async getAll() {
    const snap = await getDocs(collection(db, "quiz_attempts"));
    return snap.docs.map(d => ({ id: d.id, ...toPlain(d.data()) }));
  }
}
```

**Files:** `firestore.ts` (new op), new `Admin.tsx` page, `App.tsx` (new route)

---

## 5. Subject-Aware Rendering (KaTeX)

**Current state:** Questions and answers rendered as plain text. Chemistry formulas like "H2O" look wrong. Math equations are unreadable.

**New design:**
- Add `katex` as a dependency
- Create `FormulaText` component that detects LaTeX delimiters:
  - `$...$` → inline KaTeX
  - `$$...$$` → display KaTeX (centered, larger)
  - No delimiters → plain text (passthrough)
- Render with `dangerouslySetInnerHTML` + KaTeX's `renderToString`
- KaTeX CSS loaded globally in `index.html`
- Auto-render extension enabled for convenience (detects math in any text)

**Where to apply:**
- Quiz questions (`QuizScreen.tsx`)
- Quiz answers (`QuizScreen.tsx`)
- Quiz explanations (`QuizScreen.tsx`, `Results.tsx`, `GuildHome.tsx` history)
- Chapter names (if they contain formulas — unlikely but future-proof)

**Example renderings:**
- `H_2O` → H₂O
- `CO_2` → CO₂
- `E = mc^2` → E = mc²
- `\Delta G = -nFE` → ΔG = -nFE
- `\int_0^1 x^2 dx` → ∫₀¹ x² dx
- `\frac{d}{dx}x^n = nx^{n-1}` → d/dx xⁿ = nxⁿ⁻¹

**Files:** new `FormulaText.tsx` component, `QuizScreen.tsx`, `Results.tsx`, `GuildHome.tsx`, `index.html` (KaTeX CSS link), `package.json` (add katex)

---

## 6. More Customization

**Guild customization:**
- Guild description/bio field (max 200 chars) — shown in guild header
- Guild icon selection — pick from a set of 12 icons (users, crown, target, book, flame, star, shield, medal, zap, sparkles, trophy, play) — displayed as the guild's visual identity

**Profile customization:**
- Profile status/bio field (max 150 chars) — shown on profile page
- Status presets: "Studying", "Taking a break", "Quiz time!", "Grinding XP"

**Quiz customization:**
- Quiz timer toggle (on/off) in quiz lobby — when on, countdown from 30s per question
- Timer shows in quiz screen, turns danger at 10s

**New Firestore fields:**
- `guilds.description: string | null`
- `guilds.icon: string` (default "users")
- `users.status: string | null`

**Files:** `firestore.ts`, `GuildHome.tsx`, `Profile.tsx`, `QuizLobby.tsx`, `QuizScreen.tsx`

---

## Implementation Order

1. Add KaTeX dependency + `FormulaText` component
2. Guild create modal + LIVE badge fix
3. Guild settings (rename + delete) + Firestore ops + rules
4. Admin dashboard
5. Subject-aware rendering in quiz/results/history
6. Customization fields (guild description/icon, profile status, quiz timer)
7. Typecheck + build + emoji scan + deploy

---

## Constraints

- No changes to backend logic (Cloudflare Worker, Gemini/Groq API)
- No changes to auth flow
- Firestore rules updates are client-side config changes, not "backend logic"
- KaTeX is the only new dependency added
- All existing quiz data continues to work (KaTeX renders plain text gracefully when no delimiters found)
