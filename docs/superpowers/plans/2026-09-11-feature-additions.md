# Feature Additions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add guild settings, admin dashboard, KaTeX subject rendering, guild create modal, LIVE badge fix, and customization fields.

**Architecture:** Each feature is a self-contained task. KaTeX is the only new dependency. Firestore ops for guild rename/delete are added client-side. Rules update is a config change (user publishes in Firebase console).

**Tech Stack:** React 19, Vite 6, Tailwind CSS 3, Firebase 11, KaTeX (new), canvas-confetti (existing)

## Global Constraints

- No changes to backend logic (Cloudflare Worker, Gemini/Groq API)
- No changes to auth flow
- Firestore rules updates are client-side config changes, not "backend logic"
- All existing quiz data continues to work (KaTeX renders plain text gracefully when no delimiters found)
- Deploy from repo root `D:\e\Projects\smthmalicis` (not `apps/web`)
- Typecheck + build gates: `npm run typecheck` then `npm run build` in `apps/web`
- No emoji in `src/` (scan before deploy)

---

### Task 1: Add KaTeX dependency + FormulaText component

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/index.html`
- Create: `apps/web/src/components/ui/FormulaText.tsx`
- Modify: `apps/web/src/components/ui/index.ts`

**Interfaces:**
- Consumes: KaTeX library
- Produces: `<FormulaText text="H_2O" />` component, exported from barrel

- [ ] **Step 1: Install KaTeX**

```bash
cd apps/web && npm install katex
```

- [ ] **Step 2: Add KaTeX CSS to index.html**

In `apps/web/index.html`, add inside `<head>` after the Google Fonts link:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" />
```

- [ ] **Step 3: Create FormulaText component**

Create `apps/web/src/components/ui/FormulaText.tsx`:

```tsx
import { useMemo } from "react";
import katex from "katex";

interface FormulaTextProps {
  text: string;
  className?: string;
  display?: boolean;
}

function renderKaTeX(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: true,
    });
  } catch {
    return tex;
  }
}

export function FormulaText({ text, className = "", display = false }: FormulaTextProps) {
  const html = useMemo(() => {
    if (!text) return "";
    // Split by $$ (display) then $ (inline) delimiters
    const displayParts = text.split(/\$\$/);
    return displayParts
      .map((part, i) => {
        if (i % 2 === 1) return renderKaTeX(part.trim(), true);
        // Inline math within non-display parts
        return part.replace(/\$([^$]+?)\$/g, (_, tex) => renderKaTeX(tex, false));
      })
      .join("");
  }, [text, display]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: display ? `<div>${html}</div>` : html }}
    />
  );
}
```

- [ ] **Step 4: Add barrel export**

In `apps/web/src/components/ui/index.ts`, add:

```ts
export { FormulaText } from "./FormulaText";
```

- [ ] **Step 5: Verify typecheck + build**

```bash
cd apps/web && npm run typecheck && npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Add KaTeX dependency and FormulaText component"
```

---

### Task 2: LiveBadge component + wire into Dashboard/GuildHome

**Files:**
- Create: `apps/web/src/components/ui/LiveBadge.tsx`
- Modify: `apps/web/src/components/ui/index.ts`
- Modify: `apps/web/src/pages/Dashboard.tsx`
- Modify: `apps/web/src/pages/GuildHome.tsx`

**Interfaces:**
- Consumes: tokens
- Produces: `<LiveBadge />` component

- [ ] **Step 1: Create LiveBadge**

Create `apps/web/src/components/ui/LiveBadge.tsx`:

```tsx
export function LiveBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 py-1 ${className}`}
    >
      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-volt" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-volt">Live</span>
    </span>
  );
}
```

- [ ] **Step 2: Add barrel export**

In `apps/web/src/components/ui/index.ts`, add:

```ts
export { LiveBadge } from "./LiveBadge";
```

- [ ] **Step 3: Wire into Dashboard**

In `apps/web/src/pages/Dashboard.tsx`, replace the inline LIVE block in the player strip:

Find:
```tsx
<div className="flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-1.5">
  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-volt" />
  <span className="eyebrow text-volt">Live</span>
</div>
```

Replace with:
```tsx
<LiveBadge />
```

Add `LiveBadge` to the imports from `@/components/ui`.

- [ ] **Step 4: Wire into GuildHome**

In `apps/web/src/pages/GuildHome.tsx`, replace the inline LIVE block in the guild header:

Find:
```tsx
<div className="flex items-center gap-2 rounded-md border border-line bg-field px-3 py-1.5">
  <span className="h-2 w-2 animate-pulse-soft rounded-full bg-volt" />
  <span className="eyebrow text-volt">Live</span>
</div>
```

Replace with:
```tsx
<LiveBadge />
```

Add `LiveBadge` to the imports from `@/components/ui`.

- [ ] **Step 5: Verify typecheck + build**

```bash
cd apps/web && npm run typecheck && npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "Add LiveBadge component and wire into Dashboard/GuildHome"
```

---

### Task 3: Guild create modal

**Files:**
- Create: `apps/web/src/components/GuildCreateModal.tsx`
- Modify: `apps/web/src/pages/Dashboard.tsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Icon`, `useToast` from ui; `firestore` from lib; `useAuth` from auth
- Produces: `<GuildCreateModal open onClose onCreated />` component

- [ ] **Step 1: Create GuildCreateModal**

Create `apps/web/src/components/GuildCreateModal.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { Button, Icon, Input, useToast } from "@/components/ui";

interface GuildCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (guildId: string) => void;
}

export function GuildCreateModal({ open, onClose, onCreated }: GuildCreateModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const trimmed = name.trim();
  const valid = trimmed.length >= 2 && trimmed.length <= 40;

  async function create() {
    if (!user || !valid || busy) return;
    setBusy(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const guild = await firestore.guilds.create({
        name: trimmed,
        invite_code: code,
        created_by: user.id,
      });
      if (guild) {
        await firestore.guildMembers.add(guild.id, user.id);
        toast("Guild created.", "success");
        onCreated(guild.id);
        navigate(`/guild/${guild.id}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 animate-fade-in">
      <div className="w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-pop animate-scale-in">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl uppercase tracking-wide">Create guild</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-overpanel hover:text-ink">
            <Icon name="x" size={18} />
          </button>
        </div>
        <label htmlFor="guild-name" className="mb-1.5 block text-sm font-medium text-ink-soft">
          Guild name
        </label>
        <Input
          id="guild-name"
          assistiveLabel="Guild name"
          placeholder="e.g. Form 5 Bio Squad"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          maxLength={40}
        />
        <p className="mt-1 text-right text-[11px] text-ink-faint">
          {trimmed.length}/40
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || busy} onClick={create}>
            {busy ? "Creating…" : "Create guild"}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into Dashboard**

In `apps/web/src/pages/Dashboard.tsx`:

1. Import `GuildCreateModal` from `@/components/GuildCreateModal`
2. Remove the inline create form (`showCreate` state + the `<form>` block)
3. Replace with:

```tsx
<GuildCreateModal
  open={showCreate}
  onClose={() => setShowCreate(false)}
  onCreated={(id) => navigate(`/guild/${id}`)}
/>
```

4. Keep the `showCreate` state and the "Create" button that sets it to true.

- [ ] **Step 3: Verify typecheck + build**

```bash
cd apps/web && npm run typecheck && npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Add guild create modal"
```

---

### Task 4: Guild Firestore ops + rules update

**Files:**
- Modify: `apps/web/src/lib/firestore.ts`
- Modify: `firestore.rules` (repo root)

**Interfaces:**
- Consumes: existing Firebase db instance
- Produces: `firestore.guilds.update(id, data)`, `firestore.guilds.delete(id)`, `firestore.quizAttempts.getAll()`, `firestore.guildMembers.remove(guildId, userId)`

- [ ] **Step 1: Add deleteDoc import**

In `apps/web/src/lib/firestore.ts`, add `deleteDoc` to the imports:

```ts
import {
  collection,
  doc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  increment,
  type FieldValue,
  type DocumentData,
} from "firebase/firestore";
```

- [ ] **Step 2: Add guild update + delete ops**

In `firestore.ts`, after the existing `guilds.getByIds` method, add:

```ts
async update(guildId: string, data: { name: string }) {
  const ref = doc(db, "guilds", guildId);
  await updateDoc(ref, data);
},
async delete(guildId: string) {
  const members = await firestore.guildMembers.getByGuild(guildId);
  for (const m of members) {
    const ref = doc(db, "guild_members", `${guildId}_${m.user_id}`);
    await deleteDoc(ref);
  }
  await deleteDoc(doc(db, "guilds", guildId));
},
```

- [ ] **Step 3: Add guildMembers.remove**

In `firestore.ts`, inside `guildMembers`, add after `getByUser`:

```ts
async remove(guildId: string, userId: string) {
  const ref = doc(db, "guild_members", `${guildId}_${userId}`);
  await deleteDoc(ref);
},
```

- [ ] **Step 4: Add quizAttempts.getAll**

In `firestore.ts`, inside `quizAttempts`, add after `getByGuild`:

```ts
async getAll() {
  const snap = await getDocs(collection(db, "quiz_attempts"));
  return snap.docs.map((d) => ({ id: d.id, ...toPlain(d.data()) }));
},
```

- [ ] **Step 5: Update Firestore rules**

In `firestore.rules` (repo root), update the `guilds` match block:

Change:
```
allow update, delete: if false;
```

To:
```
allow update: if isSignedIn() && resource.data.created_by == request.auth.uid;
allow delete: if isSignedIn() && resource.data.created_by == request.auth.uid;
```

Update the `guild_members` match block. Add:
```
allow delete: if isSignedIn();
```

- [ ] **Step 6: Verify typecheck + build**

```bash
cd apps/web && npm run typecheck && npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "Add guild update/delete ops and update Firestore rules"
```

**Note:** After deploy, user must publish updated `firestore.rules` in Firebase console → Firestore → Rules.

---

### Task 5: Guild settings UI (rename + delete)

**Files:**
- Create: `apps/web/src/components/GuildSettings.tsx`
- Modify: `apps/web/src/pages/GuildHome.tsx`

**Interfaces:**
- Consumes: `firestore.guilds.update`, `firestore.guilds.delete`, `firestore.guildMembers.getByGuild`, tokens, `Button`, `Input`, `Icon`, `useToast`
- Produces: `<GuildSettings guild onClose onDeleted />` component

- [ ] **Step 1: Create GuildSettings component**

Create `apps/web/src/components/GuildSettings.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { firestore } from "@/lib/firestore";
import { Button, Icon, Input, useToast } from "@/components/ui";
import type { Guild } from "@rivalr/shared";

interface GuildSettingsProps {
  guild: Guild;
  onClose: () => void;
  onDeleted: () => void;
}

export function GuildSettings({ guild, onClose, onDeleted }: GuildSettingsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState(guild.name);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!user || user.id !== guild.created_by) return null;

  const nameValid = name.trim().length >= 2 && name.trim().length <= 40;

  async function saveName() {
    if (!nameValid || saving) return;
    setSaving(true);
    try {
      await firestore.guilds.update(guild.id, { name: name.trim() });
      toast("Guild renamed.", "success");
      onClose();
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  async function deleteGuild() {
    if (deleteInput !== guild.name || deleting) return;
    setDeleting(true);
    try {
      await firestore.guilds.delete(guild.id);
      toast("Guild deleted.", "success");
      onDeleted();
      navigate("/dashboard");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 animate-fade-in">
      <div className="w-full max-w-md rounded-lg border border-line bg-panel p-6 shadow-pop animate-scale-in">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl uppercase tracking-wide">Guild settings</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-overpanel hover:text-ink">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="mb-6">
          <label htmlFor="guild-name" className="mb-1.5 block text-sm font-medium text-ink-soft">
            Guild name
          </label>
          <Input
            id="guild-name"
            assistiveLabel="Guild name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
          />
          <div className="mt-3 flex justify-end">
            <Button size="sm" disabled={!nameValid || name.trim() === guild.name || saving} onClick={saveName}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-danger/25 bg-danger/5 p-4">
          <p className="text-sm font-semibold text-danger">Danger zone</p>
          <p className="mt-1 text-xs text-ink-muted">
            Deleting this guild will remove all members and quiz data. This cannot be undone.
          </p>
          {!showDeleteConfirm ? (
            <Button variant="danger" size="sm" className="mt-3" onClick={() => setShowDeleteConfirm(true)}>
              Delete guild
            </Button>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-ink-muted">
                Type <span className="font-medium text-ink">{guild.name}</span> to confirm:
              </p>
              <Input
                assistiveLabel="Confirm guild name"
                placeholder={guild.name}
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
              />
              <Button
                variant="danger"
                size="sm"
                disabled={deleteInput !== guild.name || deleting}
                onClick={deleteGuild}
              >
                {deleting ? "Deleting…" : "Permanently delete"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into GuildHome**

In `apps/web/src/pages/GuildHome.tsx`:

1. Import `GuildSettings` from `@/components/GuildSettings`
2. Add state: `const [showSettings, setShowSettings] = useState(false);`
3. In the guild header, add a settings button (only for guild creator):

After the `<LiveBadge />` and before the "Start Quiz" button, add:
```tsx
{user?.id === guild.created_by ? (
  <button
    onClick={() => setShowSettings(true)}
    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-overpanel hover:text-ink"
    aria-label="Guild settings"
  >
    <Icon name="crown" size={18} />
  </button>
) : null}
```

4. At the bottom of the component (before the closing `</div>`), add:

```tsx
{showSettings && guild ? (
  <GuildSettings
    guild={guild}
    onClose={() => setShowSettings(false)}
    onDeleted={() => navigate("/dashboard")}
  />
) : null}
```

- [ ] **Step 3: Verify typecheck + build**

```bash
cd apps/web && npm run typecheck && npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Add guild settings panel (rename + delete)"
```

---

### Task 6: Admin dashboard

**Files:**
- Create: `apps/web/src/pages/Admin.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: `firestore.quizAttempts.getAll()`, `firestore.userChapterStats.getAll()`, `firestore.usersBatch.getByIds()`, tokens, `Tabs`, `Icon`, `Card`, `SubjectPill`, `DifficultyBadge`, `ChapterBadge`, `FormulaText`
- Produces: `/admin` route

- [ ] **Step 1: Create Admin page**

Create `apps/web/src/pages/Admin.tsx`:

```tsx
import { useEffect, useState } from "react";
import { firestore } from "@/lib/firestore";
import { Card, Tabs, Icon, SubjectPill, DifficultyBadge, ChapterBadge, FormulaText } from "@/components/ui";
import { formatAccuracy, formatTime } from "@/utils/format";
import type { QuizAttempt, UserChapterStats } from "@rivalr/shared";

interface EnrichedAttempt extends QuizAttempt {
  user_name?: string;
}

export default function Admin() {
  const [attempts, setAttempts] = useState<EnrichedAttempt[]>([]);
  const [chapterStats, setChapterStats] = useState<UserChapterStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [rawAttempts, stats] = await Promise.all([
      firestore.quizAttempts.getAll(),
      firestore.userChapterStats.getAll(),
    ]);

    const userIds = [...new Set(rawAttempts.map((a) => a.user_id as string))];
    const users = await firestore.usersBatch.getByIds(userIds);
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched = rawAttempts.map((a) => ({
      ...a,
      user_name: userMap.get(a.user_id as string)?.name as string | undefined,
    }));

    setAttempts(enriched as EnrichedAttempt[]);
    setChapterStats(stats as unknown as UserChapterStats[]);
    setLoading(false);
  }

  const totalAttempts = attempts.length;
  const totalQuestions = attempts.reduce((s, a) => s + (a.total_questions as number), 0);
  const uniqueUsers = new Set(attempts.map((a) => a.user_id)).size;
  const subjects = [...new Set(attempts.map((a) => a.subject as string))];

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="skeleton h-10 w-48 mb-4" />
        <div className="skeleton h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wide">Admin</h1>
          <p className="mt-1 text-sm text-ink-muted">Browse all generated questions and stats</p>
        </div>
        <Icon name="shield" size={24} className="text-ink-muted" />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <StatChip value={String(totalAttempts)} label="quizzes" />
        <StatChip value={String(totalQuestions)} label="questions" />
        <StatChip value={String(uniqueUsers)} label="users" />
        <StatChip value={String(subjects.length)} label="subjects" />
      </div>

      <Tabs
        tabs={[
          { id: "questions", label: "Questions", icon: "book" },
          { id: "stats", label: "Chapter stats", icon: "grid" },
        ]}
      >
        {(activeTab) => (
          <>
            {activeTab === "questions" && <QuestionsTab attempts={attempts} />}
            {activeTab === "stats" && <StatsTab stats={chapterStats} />}
          </>
        )}
      </Tabs>
    </div>
  );
}

function StatChip({ value, label }: { value: string; label: string }) {
  return (
    <div className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-panel px-3">
      <span className="font-mono text-sm font-medium tabular-nums text-ink">{value}</span>
      <span className="text-[11px] font-medium text-ink-muted">{label}</span>
    </div>
  );
}

function QuestionsTab({ attempts }: { attempts: EnrichedAttempt[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subject, setSubject] = useState("all");
  const [difficulty, setDifficulty] = useState("all");

  const subjects = [...new Set(attempts.map((a) => a.subject as string))];
  const difficulties = ["Easy", "Medium", "Hard", "KBAT"];

  const filtered = attempts.filter(
    (a) =>
      (subject === "all" || a.subject === subject) &&
      (difficulty === "all" || a.difficulty === difficulty),
  );

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap gap-2">
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-md border border-line-strong bg-panel px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-volt/20">
          <option value="all">All subjects</option>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="rounded-md border border-line-strong bg-panel px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-volt/20">
          <option value="all">All difficulties</option>
          {difficulties.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <Card className="py-10 text-center text-sm text-ink-muted">No quizzes match.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => {
            const isExpanded = expandedId === a.id;
            return (
              <div key={a.id} className="rounded-lg border border-line">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : a.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-overpanel"
                >
                  <span className="text-sm font-medium text-ink-muted">{a.user_name ?? "—"}</span>
                  <SubjectPill subject={a.subject as string} />
                  <ChapterBadge form={a.form} chapterNum={a.chapter_number} chapterName={a.chapter_name} />
                  <DifficultyBadge difficulty={a.difficulty as string} />
                  <span className="ml-auto font-mono text-sm tabular-nums text-ink">
                    {a.correct_answers}/{a.total_questions}
                  </span>
                  <Icon name="chevron-down" size={16} className={`text-ink-muted transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                {isExpanded && (
                  <div className="space-y-2 border-t border-line bg-panel px-4 py-3 animate-slide-down">
                    {(a.questions_data as Array<{ question: string; options: string[]; correct: number; explanation: string }>).map((q, qi) => (
                      <div key={qi} className="rounded-md border border-line bg-overpanel/60 p-3">
                        <p className="text-sm font-medium leading-relaxed">
                          <span className="mr-1.5 text-ink-muted">Q{qi + 1}.</span>
                          <FormulaText text={q.question} />
                        </p>
                        <div className="mt-2 space-y-1">
                          {q.options.map((opt, oi) => (
                            <p key={oi} className={`flex items-start gap-2 rounded-md px-2 py-1 text-[13px] leading-snug ${oi === q.correct ? "bg-success/10 text-success" : "text-ink-muted"}`}>
                              <span className="mt-px text-[11px] font-semibold text-ink-muted">{String.fromCharCode(65 + oi)}.</span>
                              <span className="min-w-0 flex-1"><FormulaText text={opt} /></span>
                              {oi === q.correct ? <Icon name="check" size={14} className="mt-0.5 shrink-0" /> : null}
                            </p>
                          ))}
                        </div>
                        {q.explanation ? (
                          <p className="mt-2 border-t border-line pt-2 text-xs italic text-ink-muted">
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

function StatsTab({ stats }: { stats: UserChapterStats[] }) {
  const [subject, setSubject] = useState("all");
  const subjects = [...new Set(stats.map((s) => s.subject))];

  const filtered = subject === "all" ? stats : stats.filter((s) => s.subject === subject);

  return (
    <div className="space-y-4 animate-fade-in">
      <select value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-md border border-line-strong bg-panel px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-volt/20">
        <option value="all">All subjects</option>
        {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-[11px] font-medium text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Subject</th>
              <th className="px-4 py-2.5 font-medium">Chapter</th>
              <th className="px-4 py-2.5 font-medium">Difficulty</th>
              <th className="px-4 py-2.5 font-medium">Attempts</th>
              <th className="px-4 py-2.5 font-medium">Accuracy</th>
              <th className="px-4 py-2.5 font-medium">XP</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((s, i) => (
              <tr key={i} className="border-b border-line last:border-0">
                <td className="px-4 py-3"><SubjectPill subject={s.subject} /></td>
                <td className="px-4 py-3"><ChapterBadge form={s.form} chapterNum={s.chapter_number} chapterName={s.chapter_name} /></td>
                <td className="px-4 py-3"><DifficultyBadge difficulty={s.difficulty} /></td>
                <td className="px-4 py-3 font-mono tabular-nums text-ink-muted">{s.attempts}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-ink">{formatAccuracy(s.correct_answers, s.total_questions)}</td>
                <td className="px-4 py-3 font-mono tabular-nums text-volt">{s.xp_earned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add route in App.tsx**

In `apps/web/src/App.tsx`, add the import and route:

```tsx
import Admin from "@/pages/Admin";
```

Inside the `<Route element={<Layout />}>` block, add:

```tsx
<Route path="/admin" element={<Admin />} />
```

- [ ] **Step 3: Verify typecheck + build**

```bash
cd apps/web && npm run typecheck && npm run build
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "Add admin dashboard"
```

---

### Task 7: Apply FormulaText to quiz/results/history

**Files:**
- Modify: `apps/web/src/pages/QuizScreen.tsx`
- Modify: `apps/web/src/pages/Results.tsx`
- Modify: `apps/web/src/pages/GuildHome.tsx`

**Interfaces:**
- Consumes: `FormulaText` from ui
- Produces: questions/answers/explanations rendered with KaTeX

- [ ] **Step 1: Apply to QuizScreen**

In `apps/web/src/pages/QuizScreen.tsx`:

1. Import `FormulaText` from `@/components/ui`
2. Replace the question text:

Find:
```tsx
<p className="max-w-xl text-lg font-medium leading-relaxed text-ink sm:text-xl">
  {currentQuestion.question}
</p>
```

Replace with:
```tsx
<div className="max-w-xl text-lg font-medium leading-relaxed text-ink sm:text-xl">
  <FormulaText text={currentQuestion.question} />
</div>
```

3. Replace each answer option text:

Find:
```tsx
<span className="flex-1 py-3.5 text-[15px] leading-snug text-ink sm:py-4">
  {opt}
</span>
```

Replace with:
```tsx
<span className="flex-1 py-3.5 text-[15px] leading-snug text-ink sm:py-4">
  <FormulaText text={opt} />
</span>
```

4. Replace the explanation text:

Find:
```tsx
<p className="text-sm leading-relaxed text-ink-muted">{currentQuestion.explanation}</p>
```

Replace with:
```tsx
<div className="text-sm leading-relaxed text-ink-muted">
  <FormulaText text={currentQuestion.explanation} />
</div>
```

- [ ] **Step 2: Apply to Results**

In `apps/web/src/pages/Results.tsx`:

1. Import `FormulaText` from `@/components/ui`
2. In the review section, replace each question text:

Find:
```tsx
<span className="mr-1.5 text-ink-muted">Q{i + 1}.</span>
{q.question}
```

Replace with:
```tsx
<span className="mr-1.5 text-ink-muted">Q{i + 1}.</span>
<FormulaText text={q.question} />
```

3. Replace each option text:

Find:
```tsx
<span className="min-w-0 flex-1">{opt}</span>
```

Replace with:
```tsx
<span className="min-w-0 flex-1"><FormulaText text={opt} /></span>
```

4. Replace explanation:

Find:
```tsx
<p className="mt-2.5 border-t border-line pt-2.5 text-xs italic leading-relaxed text-ink-muted">
  {q.explanation}
</p>
```

Replace with:
```tsx
<div className="mt-2.5 border-t border-line pt-2.5 text-xs italic leading-relaxed text-ink-muted">
  <FormulaText text={q.explanation} />
</div>
```

- [ ] **Step 3: Apply to GuildHome history**

In `apps/web/src/pages/GuildHome.tsx`:

1. Import `FormulaText` from `@/components/ui`
2. In the HistoryTab accordion, replace question text:

Find:
```tsx
<span className="mr-1.5 text-ink-muted">Q{qi + 1}.</span>
{q.question}
```

Replace with:
```tsx
<span className="mr-1.5 text-ink-muted">Q{qi + 1}.</span>
<FormulaText text={q.question} />
```

3. Replace option text:

Find:
```tsx
<span className="min-w-0 flex-1">{opt}</span>
```

Replace with:
```tsx
<span className="min-w-0 flex-1"><FormulaText text={opt} /></span>
```

4. Replace explanation:

Find:
```tsx
<p className="mt-2.5 border-t border-line pt-2 text-xs italic leading-relaxed text-ink-muted">
  {q.explanation}
</p>
```

Replace with:
```tsx
<div className="mt-2.5 border-t border-line pt-2 text-xs italic leading-relaxed text-ink-muted">
  <FormulaText text={q.explanation} />
</div>
```

- [ ] **Step 4: Verify typecheck + build**

```bash
cd apps/web && npm run typecheck && npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "Apply FormulaText (KaTeX) to quiz, results, and history"
```

---

### Task 8: Customization fields (guild description/icon, profile status, quiz timer)

**Files:**
- Modify: `apps/web/src/lib/firestore.ts`
- Modify: `apps/web/src/components/GuildCreateModal.tsx`
- Modify: `apps/web/src/components/GuildSettings.tsx`
- Modify: `apps/web/src/pages/GuildHome.tsx`
- Modify: `apps/web/src/pages/Profile.tsx`
- Modify: `apps/web/src/pages/QuizLobby.tsx`
- Modify: `apps/web/src/pages/QuizScreen.tsx`
- Modify: `apps/web/src/components/ui/index.ts`
- Create: `apps/web/src/components/ui/IconPicker.tsx`

**Interfaces:**
- Consumes: tokens, `Button`, `Icon`, `Input`, `useToast`
- Produces: `<IconPicker selected onSelect />` component, guild description/icon fields, profile status, quiz timer

- [ ] **Step 1: Create IconPicker component**

Create `apps/web/src/components/ui/IconPicker.tsx`:

```tsx
import { Icon, type IconName } from "./Icon";

const GUILD_ICONS: IconName[] = [
  "users", "crown", "target", "book", "flame",
  "star", "shield", "medal", "zap", "sparkles",
  "trophy", "play",
];

interface IconPickerProps {
  selected: string;
  onSelect: (icon: string) => void;
}

export function IconPicker({ selected, onSelect }: IconPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {GUILD_ICONS.map((icon) => (
        <button
          key={icon}
          onClick={() => onSelect(icon)}
          className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
            selected === icon
              ? "border-volt bg-volt/10 text-volt"
              : "border-line bg-overpanel text-ink-muted hover:border-line-strong hover:text-ink"
          }`}
        >
          <Icon name={icon} size={18} />
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add barrel export**

In `apps/web/src/components/ui/index.ts`, add:

```ts
export { IconPicker } from "./IconPicker";
```

- [ ] **Step 3: Add guild description + icon to Firestore ops**

In `apps/web/src/lib/firestore.ts`, update the `guilds.create` method to accept optional `description` and `icon`:

Find:
```ts
async create(data: { name: string; invite_code: string; created_by: string }) {
  const ref = doc(collection(db, "guilds"));
  await setDoc(ref, { ...data, created_at: new Date().toISOString() });
  return { id: ref.id, ...data };
},
```

Replace with:
```ts
async create(data: { name: string; invite_code: string; created_by: string; description?: string; icon?: string }) {
  const ref = doc(collection(db, "guilds"));
  await setDoc(ref, { ...data, icon: data.icon ?? "users", created_at: new Date().toISOString() });
  return { id: ref.id, ...data, icon: data.icon ?? "users" };
},
```

Update `guilds.update` to accept optional `description` and `icon`:

Find:
```ts
async update(guildId: string, data: { name: string }) {
```

Replace with:
```ts
async update(guildId: string, data: { name?: string; description?: string; icon?: string }) {
```

- [ ] **Step 4: Update Guild type in shared**

In `packages/shared/src/types.ts`, update the Guild interface:

Find:
```ts
export interface Guild {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}
```

Replace with:
```ts
export interface Guild {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  description?: string;
  icon: string;
  created_at: string;
}
```

- [ ] **Step 5: Update GuildCreateModal with description + icon**

In `apps/web/src/components/GuildCreateModal.tsx`:

1. Import `IconPicker` from `@/components/ui`
2. Add state: `const [description, setDescription] = useState("");` and `const [icon, setIcon] = useState("users");`
3. Add description textarea and IconPicker before the buttons:

After the character counter, add:

```tsx
<label htmlFor="guild-desc" className="mb-1.5 mt-3 block text-sm font-medium text-ink-soft">
  Description <span className="text-ink-faint">(optional)</span>
</label>
<textarea
  id="guild-desc"
  className="w-full rounded-md border border-line-strong bg-panel px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-ink-muted focus:outline-none focus:border-volt focus:ring-2 focus:ring-volt/20"
  placeholder="What's this guild about?"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  maxLength={200}
  rows={2}
/>

<p className="mb-2 mt-3 text-sm font-medium text-ink-soft">Guild icon</p>
<IconPicker selected={icon} onSelect={setIcon} />
```

4. Update the `create` function to pass description and icon:

Find:
```ts
const guild = await firestore.guilds.create({
  name: trimmed,
  invite_code: code,
  created_by: user.id,
});
```

Replace with:
```ts
const guild = await firestore.guilds.create({
  name: trimmed,
  invite_code: code,
  created_by: user.id,
  description: description.trim() || undefined,
  icon,
});
```

- [ ] **Step 6: Update GuildSettings with description + icon editing**

In `apps/web/src/components/GuildSettings.tsx`:

1. Import `IconPicker` from `@/components/ui`
2. Add state: `const [description, setDescription] = useState(guild.description ?? "");` and `const [icon, setIcon] = useState(guild.icon ?? "users");`
3. Add description + icon editing in the settings modal (after name input):

```tsx
<label htmlFor="guild-desc" className="mb-1.5 mt-4 block text-sm font-medium text-ink-soft">
  Description
</label>
<textarea
  id="guild-desc"
  className="w-full rounded-md border border-line-strong bg-panel px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-ink-muted focus:outline-none focus:border-volt focus:ring-2 focus:ring-volt/20"
  placeholder="What's this guild about?"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  maxLength={200}
  rows={2}
/>

<p className="mb-2 mt-3 text-sm font-medium text-ink-soft">Guild icon</p>
<IconPicker selected={icon} onSelect={setIcon} />
```

4. Update `saveName` to save all fields:

Find:
```ts
await firestore.guilds.update(guild.id, { name: name.trim() });
```

Replace with:
```ts
await firestore.guilds.update(guild.id, {
  name: name.trim(),
  description: description.trim() || undefined,
  icon,
});
```

5. Update `nameValid` to also allow saves when description/icon changed:

Find:
```ts
const nameValid = name.trim().length >= 2 && name.trim().length <= 40;
```

Replace with:
```ts
const nameValid = name.trim().length >= 2 && name.trim() <= 40;
const hasChanges = name.trim() !== guild.name || description.trim() !== (guild.description ?? "") || icon !== (guild.icon ?? "users");
```

6. Update the Save button disabled condition:

Find:
```tsx
<Button size="sm" disabled={!nameValid || name.trim() === guild.name || saving} onClick={saveName}>
```

Replace with:
```tsx
<Button size="sm" disabled={!nameValid || !hasChanges || saving} onClick={saveName}>
```

- [ ] **Step 7: Update GuildHome to show description + icon**

In `apps/web/src/pages/GuildHome.tsx`:

1. Replace the guild icon chip with the guild's custom icon:

Find:
```tsx
<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-overpanel text-volt">
  <Icon name="users" size={24} />
</div>
```

Replace with:
```tsx
<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-overpanel text-volt">
  <Icon name={(guild.icon as "users") ?? "users"} size={24} />
</div>
```

2. Add description display below the guild name:

After the invite code button, add:

```tsx
{guild.description ? (
  <p className="mt-1 text-sm text-ink-muted">{guild.description}</p>
) : null}
```

- [ ] **Step 8: Add profile status to Profile page**

In `apps/web/src/pages/Profile.tsx`:

1. Add status state: `const [status, setStatus] = useState(user.status ?? "");` and `const [editingStatus, setEditingStatus] = useState(false);`
2. Add a status display below the email in the left column:

After the email line, add:

```tsx
{!editingStatus ? (
  <button onClick={() => setEditingStatus(true)} className="mt-2 text-sm text-ink-faint transition-colors hover:text-ink-muted">
    {user.status || "+ Add status"}
  </button>
) : (
  <div className="mt-2 flex items-center gap-2">
    <input
      className="flex-1 rounded-md border border-line-strong bg-panel px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:border-volt"
      value={status}
      onChange={(e) => setStatus(e.target.value)}
      maxLength={150}
      placeholder="What are you up to?"
      autoFocus
      onBlur={() => {
        firestore.users.updateStatus(user.id, status.trim() || null);
        setEditingStatus(false);
      }}
    />
  </div>
)}
```

3. Add `updateStatus` to `firestore.users` in `firestore.ts`:

```ts
async updateStatus(userId: string, status: string | null) {
  const ref = doc(db, "users", userId);
  await updateDoc(ref, { status });
},
```

4. Update the User type in `packages/shared/src/types.ts`:

Find:
```ts
export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  xp: number;
  coins: number;
  created_at: string;
}
```

Replace with:
```ts
export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  status?: string;
  xp: number;
  coins: number;
  created_at: string;
}
```

- [ ] **Step 9: Add quiz timer toggle to QuizLobby**

In `apps/web/src/pages/QuizLobby.tsx`:

1. Add state: `const [timerEnabled, setTimerEnabled] = useState(false);`
2. After the question count step (step 4), add a timer toggle step. Actually, simpler: add the timer toggle as a checkbox in the "Ready to Start" summary card:

After the difficulty/count display, add:

```tsx
<div className="mt-3 flex items-center gap-3">
  <button
    onClick={() => setTimerEnabled(!timerEnabled)}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      timerEnabled ? "bg-volt" : "bg-overpanel"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-field transition-transform ${
        timerEnabled ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
  <span className="text-sm text-ink-muted">Enable 30s timer per question</span>
</div>
```

3. Pass `timerEnabled` to the quiz attempt creation in `firestore.quizAttempts.create`:

Find:
```ts
const attempt = await firestore.quizAttempts.create({
  user_id: user.id,
  guild_id: guildId,
  form,
  subject,
  chapter_number: chapterNum,
  chapter_name: selectedChapter.name,
  difficulty,
  total_questions: count,
  ...
```

Add: `timer_enabled: timerEnabled,` to the data object.

- [ ] **Step 10: Add countdown timer to QuizScreen**

In `apps/web/src/pages/QuizScreen.tsx`:

1. Read `timer_enabled` from the attempt data
2. When `timer_enabled` is true, change the timer to count down from 30 instead of counting up
3. When timer hits 0, auto-advance to next question (treat as unanswered)
4. When timer hits 10s, turn the timer text to `text-danger`

This is a significant change to the timer logic. Let me detail:

Find the timer useEffect:
```tsx
useEffect(() => {
  if (!attempt || showResult) return;
  timerRef.current = setInterval(() => {
    setTimeElapsed((t) => t + 1);
  }, 1000);
  return () => clearInterval(timerRef.current);
}, [attempt, showResult]);
```

Replace with:
```tsx
useEffect(() => {
  if (!attempt || showResult) return;
  if (attempt.timer_enabled) {
    setTimeElapsed(30);
    timerRef.current = setInterval(() => {
      setTimeElapsed((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleAnswer(-1);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  } else {
    timerRef.current = setInterval(() => {
      setTimeElapsed((t) => t + 1);
    }, 1000);
  }
  return () => clearInterval(timerRef.current);
}, [attempt, showResult]);
```

Update the timer display to show countdown format and danger color:

Find:
```tsx
<span className={`font-mono text-[15px] tabular-nums text-ink ${timeElapsed >= 10 ? "text-ink" : ""}`}>
  {formatTime(timeElapsed)}
</span>
```

Replace with:
```tsx
<span className={`font-mono text-[15px] tabular-nums ${
  attempt.timer_enabled && timeElapsed <= 10 ? "text-danger" : "text-ink"
}`}>
  {attempt.timer_enabled ? formatTime(timeElapsed) : formatTime(timeElapsed)}
</span>
```

- [ ] **Step 11: Verify typecheck + build**

```bash
cd apps/web && npm run typecheck && npm run build
```

Expected: PASS.

- [ ] **Step 12: Commit**

```bash
git add -A && git commit -m "Add customization: guild desc/icon, profile status, quiz timer"
```

---

### Task 9: Final verification + deploy

**Files:** none (verification only)

- [ ] **Step 1: Emoji scan**

```bash
cd apps/web && node -e "const fs=require('fs'),path=require('path');const re=/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{2E80}-\u{2EFF}\u{200D}]/u;function w(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);const s=fs.statSync(p);if(s.isDirectory())w(p);else if(/\.(tsx|ts|css|html)$/.test(f)){const c=fs.readFileSync(p,'utf8');if(re.test(c))console.log('EMOJI in',p)}}}w('src');console.log('scan complete')"
```

Expected: `scan complete` with no `EMOJI in` lines.

- [ ] **Step 2: Typecheck + build**

```bash
cd apps/web && npm run typecheck && npm run build
```

Expected: PASS.

- [ ] **Step 3: Commit any remaining changes**

```bash
git add -A && git commit -m "Feature additions complete" || echo "Nothing to commit"
```

- [ ] **Step 4: Deploy from repo root**

```bash
cd D:\e\Projects\smthmalicis && vercel deploy --prod --yes
```

Expected: READY.

- [ ] **Step 5: Verify prod**

Fetch `https://rivalr-phi.vercel.app` and assert 200.

- [ ] **Step 6: Remind user to publish Firestore rules**

After deploy, remind user: "Publish updated `firestore.rules` in Firebase console → Firestore → Rules for guild rename/delete to work."
