# Scoreboard Blackout Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin rivalr from the light "warm paper" look into a blackout night-match scoreboard design (near-black field, volt lime accent, Anton condensed display type, sharp panels, ladder leaderboards) without touching logic/data.

**Architecture:** Pure styling layer over the existing React+Vite+Tailwind app. Swap the palette via `tailwind.config.js` remaps so most existing class names inherit new dark values, then run targeted sweeps to fix semantics that flip (white text on volt, radius, hairlines), and rebuild hero/leaderboard structures into scoreboard patterns.

**Tech Stack:** React 19, Vite 6, Tailwind 3, Google Fonts (Anton), Cloudflare worker (unchanged), Firebase (unchanged).

## Global Constraints

- No Firebase/Firestore/data/logic changes. No new routes/features.
- No emoji anywhere in UI; SVG icons only (already true, keep it true).
- One accent only: volt lime `#C9F73A`. No gradients, no glows.
- Numerals: `tabular-nums` everywhere they appear.
- Panel radius: cards `rounded-lg` (8px), controls `rounded-md` (6px), pills/badges/avatars/rank circles `rounded-full`. No `rounded-2xl` except avatar `xl`.
- Verification gate for every task: `npm run typecheck` then `npm run build` (from `apps/web`). No test framework exists.
- Commit after each task with a descriptive message.

## Design System / Token Map (Task 1 defines these)

New semantic tokens (used going forward):
```
field #0B0D0C | panel #121513 | overpanel #171B18 | panel-2 #1B1F1C
line #232824 | line-strong #2E352F
ink #F4F6F2 | ink-soft #C6CDC6 | ink-muted #9AA39B | ink-faint #6A726C
volt #C9F73A | volt-soft #D6FF5C | volt-dark #B4E02E
danger #FF4D4F | warning #FFB02E | success #3DDC84
```

Remapped legacy names (so existing classes inherit dark values automatically):
- `navy`: 50→#F4F6F2, 100→#F4F6F2, 200→#E6EAE4, 300→#C6CDC6, 400→#9AA39B, 500→#6A726C, 600→#555C56, 700→#2E352F, 800→#1B1F1C, 850→#171B18, 900→#121513, 950→#0B0D0C
- `indigo`: 300→volt-soft, 400→volt, 500→volt, 600→volt-dark
- `signal`: success→#3DDC84, danger→#FF4D4F, warning→#FFB02E, info→volt
- `paper`→field, `surface`→panel, `wash`→overpanel, `ink`→#F4F6F2, `ink-soft`→#C6CDC6, `ink-muted`→#9AA39B, `ink-faint`→#6A726C, `line`→#232824, `line-strong`→#2E352F
- `accent`: DEFAULT→volt, soft→volt-soft, hover→volt-dark
- `success`→#3DDC84, `danger`→#FF4D4F, `warning`→#FFB02E
- New names also added: field, panel, overpanel, line, line-strong, ink, ink-soft, ink-muted, ink-faint, volt, volt-soft, volt-dark.

Quick "semantics that flip" fixes needed after remap (apply where found):
1. `bg-accent text-white` → `bg-accent text-field hover:bg-accent-hover`
2. `bg-ink text-white` → `bg-ink text-field`
3. `bg-success text-white` / `bg-danger text-white` → `... text-field`
4. `ring-white/5`, `ring-white/10`, `ring-white/20` → `ring-line`
5. `rounded-2xl` on cards/panels → `rounded-lg` (Avatar `xl` stays `rounded-2xl`; pills/stats stay `rounded-full`)
6. Inverted pill `bg-white text-navy-950` → `bg-ink text-field` (unless intentional white chip)

---
## File Structure

| File | Responsibility |
|---|---|
| `apps/web/tailwind.config.js` | palette remap + font-display + dark shadows |
| `apps/web/index.html` | Anton font link, dark `theme-color`, body classes |
| `apps/web/src/index.css` | base bg/text, `.surface-card` radius/shadow, `.eyebrow` type helper |
| `apps/web/public/favicon.svg` | volt mark |
| `apps/web/src/components/ui/Icon.tsx` | `LogoMark` → volt fill with field bolt |
| `apps/web/src/components/ui/{Button,Card,Badge,Input,ProgressBar,Tabs,Avatar,Skeleton}.tsx` | component skins |
| `apps/web/src/components/layout/{Layout,Navbar}.tsx` | shell + scoreboard nav |
| `apps/web/src/pages/{Landing,Dashboard,GuildHome,QuizLobby,QuizScreen,Results,Profile,Shop}.tsx` | page skins |
| `docs/superpowers/specs/2026-09-11-scoreboard-blackout-redesign.md` | spec (already committed) |

---

### Task 1: Design tokens + base layer

**Files:**
- Modify: `apps/web/tailwind.config.js`
- Modify: `apps/web/index.html`
- Modify: `apps/web/src/index.css`
- Modify: `apps/web/public/favicon.svg`

**Interfaces:**
- Produces: palette/type tokens above (all later tasks consume them by class name).

- [ ] **Step 1: Rewrite `tailwind.config.js`**

Replace the whole file with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#F4F6F2",
          100: "#F4F6F2",
          200: "#E6EAE4",
          300: "#C6CDC6",
          400: "#9AA39B",
          500: "#6A726C",
          600: "#555C56",
          700: "#2E352F",
          800: "#1B1F1C",
          850: "#171B18",
          900: "#121513",
          950: "#0B0D0C",
        },
        indigo: {
          300: "#D6FF5C",
          400: "#C9F73A",
          500: "#C9F73A",
          600: "#B4E02E",
        },
        signal: {
          success: "#3DDC84",
          danger: "#FF4D4F",
          warning: "#FFB02E",
          info: "#C9F73A",
        },
        field: "#0B0D0C",
        panel: "#121513",
        overpanel: "#171B18",
        "panel-2": "#1B1F1C",
        surface: "#121513",
        wash: "#171B18",
        paper: "#0B0D0C",
        ink: "#F4F6F2",
        "ink-soft": "#C6CDC6",
        "ink-muted": "#9AA39B",
        "ink-faint": "#6A726C",
        line: "#232824",
        "line-strong": "#2E352F",
        accent: {
          DEFAULT: "#C9F73A",
          soft: "#D6FF5C",
          hover: "#B4E02E",
        },
        volt: {
          DEFAULT: "#C9F73A",
          soft: "#D6FF5C",
          dark: "#B4E02E",
        },
        success: "#3DDC84",
        danger: "#FF4D4F",
        warning: "#FFB02E",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Segoe UI",
          "Roboto",
          "Inter",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: ["Anton", "Impact", "Arial Black", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "SF Mono", "Menlo", "Consolas", "monospace"],
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.04), 0 12px 28px -12px rgba(0,0,0,0.7)",
        pop: "0 2px 0 rgba(255,255,255,0.05), 0 24px 60px -20px rgba(0,0,0,0.85)",
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        "slide-down": "slideDown 0.25s ease-out",
        "scale-in": "scaleIn 0.18s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Update `index.html`**

Add the Anton font before the stylesheet link:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Anton&display=swap"
  rel="stylesheet"
/>
```

Change `theme-color` to `#0B0D0C` and `body` classes to `bg-field text-ink font-sans antialiased`. Keep title/description/favicon link unchanged.

- [ ] **Step 3: Rewrite `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    color-scheme: dark;
  }

  body {
    @apply bg-field text-ink antialiased;
  }

  * {
    @apply border-line;
  }

  ::selection {
    @apply bg-volt text-field;
  }

  :focus-visible {
    outline: 2px solid theme("colors.volt.DEFAULT");
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}

@layer components {
  .skeleton {
    @apply animate-pulse rounded-lg bg-overpanel;
  }

  .surface-card {
    @apply rounded-lg border border-line bg-panel shadow-card;
  }

  .eyebrow {
    @apply text-[11px] font-semibold uppercase tracking-[0.14em];
  }
}
```

- [ ] **Step 4: Update `public/favicon.svg` mark to volt**

Replace any hex fill for the squircle/background with `#C9F73A` and any white glyph with `#0B0D0C`. (Read the existing file first; it is a simple SVG.)

- [ ] **Step 5: Verify + commit**

Run: `npm run typecheck` then `npm run build` in `apps/web`. Expected: PASS, no errors.
Commit: `git add apps/web/tailwind.config.js apps/web/index.html apps/web/src/index.css apps/web/public/favicon.svg && git commit -m "Add scoreboard blackout design tokens and base layer"`

---

### Task 2: UI kit skins

**Files:**
- Modify: `apps/web/src/components/ui/Button.tsx`
- Modify: `apps/web/src/components/ui/Card.tsx` (radius only)
- Modify: `apps/web/src/components/ui/Badge.tsx`
- Modify: `apps/web/src/components/ui/Input.tsx`
- Modify: `apps/web/src/components/ui/ProgressBar.tsx` (blocky segmented bar)
- Modify: `apps/web/src/components/ui/Tabs.tsx` (volt underline)
- Modify: `apps/web/src/components/ui/Avatar.tsx` (ring color + keep hue gradient)
- Modify: `apps/web/src/components/ui/Skeleton.tsx` (StatCard/PageHeader/EmptyState/LoadingScreen skins)
- Modify: `apps/web/src/components/ui/Icon.tsx` (`LogoMark` volt)

**Interfaces:**
- Produces: `ProgressBar` still takes `{ value, max, className?, color?, showLabel? }` (same API).
- Consumes: tokens from Task 1.

- [ ] **Step 1: `Button.tsx` — volt primary, sharp corners**

Replace `variants` and `sizes`:

```tsx
const variants = {
  primary: "bg-accent text-field hover:bg-accent-hover shadow-card",
  secondary: "bg-panel text-ink hover:bg-overpanel border border-line-strong",
  ghost: "bg-transparent text-ink-muted hover:text-ink hover:bg-overpanel",
  danger: "bg-danger/10 text-danger hover:bg-danger/15 border border-danger/25",
};

const sizes = {
  sm: "px-3.5 py-2 text-[13px] min-h-9",
  md: "px-5 py-2.5 text-sm min-h-11",
  lg: "px-7 py-3.5 text-base min-h-12",
};
```

In the button className change `rounded-xl` → `rounded-md`. Keep everything else.

- [ ] **Step 2: `Card.tsx`**

`.surface-card` already provides radius; remove any `rounded-2xl` from hover classes if present (hover stays). No other change needed (Card uses `surface-card`).

- [ ] **Step 3: `Badge.tsx`**

```tsx
const badgeVariants = {
  default: "bg-overpanel text-ink-muted border border-line",
  success: "bg-success/10 text-success border border-success/25",
  warning: "bg-warning/10 text-warning border border-warning/25",
  danger: "bg-danger/10 text-danger border border-danger/25",
  info: "bg-volt/10 text-volt border border-volt/25",
};
```

Keep `rounded-full px-2.5 py-1 text-xs font-medium` and the `gap-1` structure.

- [ ] **Step 4: `Input.tsx`**

```tsx
className={`w-full rounded-md border border-line-strong bg-panel px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint
  transition-colors hover:border-ink-muted focus:outline-none focus:border-volt focus:ring-2 focus:ring-volt/20 ${className}`}
```

(Change `rounded-xl`→`rounded-md`, `bg-surface`→`bg-panel`, accent→volt in focus.)

- [ ] **Step 5: `ProgressBar.tsx` — blocky segmented score bar**

Replace the whole body with:

```tsx
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
```

→ No. Use this (correct full file):

```tsx
interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  color?: string;
  showLabel?: boolean;
}

export function ProgressBar({
  value,
  max,
  className = "",
  color = "bg-volt",
  showLabel = false,
}: ProgressBarProps) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const blocks = Math.min(Math.max(Math.round(max), 1), 20);
  const filled = Math.round(pct * blocks);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="flex flex-1 gap-1"
        role="progressbar"
        aria-valuenow={Math.round(pct * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {Array.from({ length: blocks }).map((_, i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-[2px] transition-colors duration-300 ${
              i < filled ? color : "bg-overpanel"
            }`}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-xs tabular-nums text-ink-muted">{value}/{max}</span>
      )}
    </div>
  );
}
```

Keep the old import/export signature identical (named export `ProgressBar`). Default `color` becomes `bg-volt`.

- [ ] **Step 6: `Tabs.tsx` — volt underline + medium tracking**

Change the underline span:

```tsx
<span
  className={`absolute inset-x-2 -bottom-px h-[3px] rounded-none bg-volt transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-0"}`}
/>
```

Labels: active `text-ink`, inactive `text-ink-muted` (already). Change `px-4 py-3 text-sm` → keep, but `font-medium` keep.

- [ ] **Step 7: `Avatar.tsx`**

For the fallback chip: `ring-1 ring-white/20` → `ring-1 ring-line`. Keep hue-based gradient (identity fill is allowed), keep `text-white` on colored fill.

- [ ] **Step 8: `Skeleton.tsx` (StatCard/PageHeader/EmptyState/LoadingScreen)**

- `LoadingScreen`: container `bg-paper` → `bg-field`; spinner `border-line-strong border-t-accent` keep; label `text-ink-faint` keep.
- `StatCard` icon tints: `default: "bg-overpanel text-ink-muted"`, `accent: "bg-accent/10 text-accent"`, `success: "bg-success/10 text-success"`, `danger: "bg-danger/10 text-danger"`, `warning: "bg-warning/10 text-warning"`.
- `StatCard` value: add `font-display` class to the value `<p>` (`text-2xl` → `text-2xl font-display`).
- `PageHeader` title: `<h1 className="font-display text-3xl font-normal tracking-wide sm:text-4xl uppercase">{title}</h1>`; subtitle stays.
- `EmptyState`/others inherit `.surface-card` + tokens already.

- [ ] **Step 9: `Icon.tsx` — LogoMark volt**

```tsx
export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden="true" focusable="false">
      <rect width="512" height="512" rx="112" fill="#C9F73A" />
      <path d="M284 96 L176 288 h72 l-20 128 l112 -200 h-72 z" fill="#0B0D0C" />
    </svg>
  );
}
```

- [ ] **Step 10: Verify + commit**

Run `npm run typecheck` + `npm run build`. PASS.
Commit: `git commit -am "Skin UI kit for scoreboard blackout theme"`

---

### Task 3: Shell — Layout + Navbar + MobileTabBar

**Files:**
- Modify: `apps/web/src/components/layout/Layout.tsx`
- Modify: `apps/web/src/components/layout/Navbar.tsx`

**Interfaces:** Consumes tokens + `LogoMark` from Tasks 1–2.

- [ ] **Step 1: `Layout.tsx`**

`bg-navy-900` → `bg-field`. Everything else unchanged.

- [ ] **Step 2: `Navbar.tsx`**

- `<nav ...>`: `bg-paper/80` → `bg-field/85`; `border-line` keep; add `supports-[backdrop-filter]:bg-field/70`.
- Wordmark span: `<span className="font-display text-lg uppercase tracking-wide text-ink">rivalr</span>`
- Desktop links: container `.hidden md:flex` — labels uppercase `text-[13px]`; active: `bg-overpanel text-volt border border-line`; inactive: `text-ink-muted hover:text-ink hover:bg-overpanel`. Add a `rounded-md` (links currently `rounded-xl` → `rounded-md`).
- End with a volt underline: simplest is the active chip using `text-volt` + a 2px volt bottom hairline via `shadow-[inset_0_-2px_0_0_theme(colors.volt.DEFAULT)]` on the active link.
- Sign-out button and avatar unchanged (tokens handle colors).
- `MobileTabBar`: `bg-surface/90` → `bg-field/90 border-line`; active icon `text-accent`, inactive `text-ink-muted`.

- [ ] **Step 3: Verify + commit**

`npm run typecheck` + `npm run build`. PASS.
Commit: `git commit -am "Scoreboard shell and nav"`

---

### Task 4: Landing

**Files:**
- Modify: `apps/web/src/pages/Landing.tsx` (whole return block)

**Interfaces:** Consumes tokens, `Button`, `LogoMark`, `GoogleLogo`, `Icon`.

- [ ] **Step 1: Replace the JSX between the outer `div` and its closing tag**

Keep hooks/imports identical. New structure:

```tsx
<div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
  <div className="w-full max-w-xl text-center">
    <div className="mx-auto mb-7 flex flex-col items-center gap-4">
      <LogoMark size={72} className="shadow-pop" />
      <p className="eyebrow text-volt">SPM study guilds</p>
    </div>

    <h1 className="font-display text-[44px] uppercase leading-[1.04] tracking-wide sm:text-6xl">
      Study in guilds.
      <br />
      <span className="text-volt">Climb the ranks.</span>
    </h1>
    <p className="mx-auto mt-5 max-w-md text-[17px] leading-relaxed text-ink-muted">
      Create a private study group, quiz your friends with AI-generated SPM
      questions, and compete on leaderboards.
    </p>

    <div className="mx-auto mt-10 max-w-sm">
      <Button size="lg" className="w-full" onClick={signInWithGoogle}>
        <GoogleLogo size={19} />
        Sign in with Google
      </Button>
      <p className="mt-4 text-[13px] text-ink-faint">
        Free for Malaysian Form 4 &amp; 5 science stream students
      </p>

      {error ? (
        <div className="mt-5 rounded-lg border border-danger/30 bg-danger/10 p-4 text-left animate-slide-down">
          <div className="flex items-start gap-3">
            <Icon name="info" size={18} className="mt-0.5 shrink-0 text-danger" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-danger">{error}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                If sign-in still fails, make sure{" "}
                <code className="rounded bg-overpanel px-1 py-0.5 font-mono text-[11px] text-ink">rivalr-phi.vercel.app</code>{" "}
                is in the authorized domains list, and that the{" "}
                <code className="rounded bg-overpanel px-1 py-0.5 font-mono text-[11px] text-ink">firestore.rules</code>{" "}
                file has been published.
              </p>
            </div>
            <button
              onClick={clearError}
              aria-label="Dismiss error"
              className="ml-auto shrink-0 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-overpanel hover:text-ink"
            >
              <Icon name="x" size={15} />
            </button>
          </div>
        </div>
      ) : null}
    </div>

    <div className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
      {FEATURES.map((f) => (
        <div key={f.title} className="bg-panel p-4 text-left">
          <p className="font-display text-2xl uppercase text-volt">
            {i}
          </p>
          <h3 className="mt-1 text-sm font-semibold uppercase tracking-wide">{f.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{f.desc}</p>
        </div>
      ))}
    </div>
  </div>
</div>
```

Note: add an index (1/2/3) from the map callback (`(f) => (...` becomes `(f, i) => (...`) and render it in the volt number slot.

- [ ] **Step 2: Verify + commit**

`npm run typecheck` + `npm run build`. PASS.
Commit: `git commit -am "Scoreboard landing"`

---

### Task 5: Dashboard

**Files:**
- Modify: `apps/web/src/pages/Dashboard.tsx`

**Interfaces:** Consumes tokens, `ProgressBar`, `StatCard`, `formatCoins`.

- [ ] **Step 1: Player header + scoreboard hero**

Replace `<PageHeader ... />` with a player strip (keep same imported PageHeader usage removed):

```tsx
<div className="mb-6 flex items-end justify-between gap-4">
  <div>
    <p className="eyebrow text-ink-muted">PLAYER</p>
    <h1 className="font-display text-3xl uppercase tracking-wide sm:text-4xl">
      {user?.name?.split(" ")[0] ?? "—"}
    </h1>
  </div>
  <div className="flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-1.5">
    <span className="h-2 w-2 animate-pulse-soft rounded-full bg-volt" />
    <span className="eyebrow text-volt">Live</span>
  </div>
</div>
```

- [ ] **Step 2: Level + XP hero (keep the blocky `ProgressBar`)**

The existing hero card (`surface-card mb-6 flex flex-col gap-4 p-5 sm:p-6`) → set left level number to `font-display`:

```tsx
<p className="font-display text-3xl uppercase tracking-wide text-ink sm:text-4xl">{level.level}</p>
```

Right XP number to `font-display text-2xl ... text-volt sm:text-3xl`:

```tsx
<p className="font-display text-2xl tracking-wide tabular-nums text-volt sm:text-3xl">{level.currentXP}</p>
```

Keep `ProgressBar` (now blocky after Task 2).

- [ ] **Step 3: Stats → scoreboard chips and guilds → league table**

- Stat row: keep 3 `StatCard`s; their values are already big — add `tint` accents already set. Coins wraps in `col-span-2 sm:col-span-1` (already).
- Guilds heading: `<h2 className="font-display text-xl uppercase tracking-wide">Your Guilds</h2>`
- Guild list: keep `Card hover` rows but make them league rows: add `rounded-lg` (via surface-card), keep icon chip. Replace the guild icon chip classes with `bg-overpanel text-volt`. Members line → `text-ink-muted`. Chevron → `text-ink-muted group-hover:text-volt`.

- [ ] **Step 4: Verify + commit**

`npm run typecheck` + `npm run build`. PASS.
Commit: `git commit -am "Scoreboard dashboard"`

---

### Task 6: GuildHome — scoreboard strip + ladder leaderboard

**Files:**
- Modify: `apps/web/src/pages/GuildHome.tsx`

**Interfaces:** Consumes tokens, `ProgressBar`, `RankBadge` (local), `Tabs`, `Badge`.

- [ ] **Step 1: Header → scoreboard strip**

Replace the top header block (`flex items-center gap-4 ...`) with:

```tsx
<div className="mb-8 flex flex-col gap-4 rounded-lg border border-line bg-panel p-5 sm:flex-row sm:items-center sm:justify-between">
  <div className="flex items-center gap-4">
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-overpanel text-volt">
      <Icon name="users" size={24} />
    </div>
    <div>
      <p className="eyebrow text-ink-muted">GUILD</p>
      <h1 className="font-display text-2xl uppercase tracking-wide sm:text-3xl">{guild.name}</h1>
      <button
        onClick={copyInvite}
        className="mt-1 inline-flex items-center gap-1.5 rounded-md text-[13px] font-medium text-ink-muted transition-colors hover:text-volt"
      >
        {inviteCopied ? (
          <>
            <Icon name="check" size={14} className="text-success" />
            <span className="text-success">Copied</span>
          </>
        ) : (
          <>
            <Icon name="copy" size={14} />
            <span className="font-mono tracking-wider text-ink-soft">{guild.invite_code}</span>
          </>
        )}
      </button>
    </div>
  </div>
  <div className="flex items-center gap-3">
    <div className="flex items-center gap-2 rounded-md border border-line bg-field px-3 py-1.5">
      <span className="h-2 w-2 animate-pulse-soft rounded-full bg-volt" />
      <span className="eyebrow text-volt">Live</span>
    </div>
    <Link to={`/guild/${guildId}/quiz`}>
      <Button size="lg" className="w-full sm:w-auto">
        <Icon name="play" size={17} fill />
        Start Quiz
      </Button>
    </Link>
  </div>
</div>
```

Remove the standalone `Live` wire if the banner already includes it.

- [ ] **Step 2: Leaderboard ladder**

In the Overview tab leaderboard (`leaderboard.map`), rank 0 gets a volt panel instead of plain Card:

```tsx
{leaderboard.map((entry, i) => (
  <Card
    key={entry.user.id}
    className={`flex items-center gap-3 p-3.5 ${
      i === 0 ? "border-volt/50 bg-volt/10" : ""
    }`}
  >
```

`RankBadge`: rank 0 → `bg-volt text-field` (solid volt, black icon); rank 1 → `bg-overpanel text-ink-muted ring-line-strong`; rank 2 → `bg-warning/10 text-warning ring-warning/25`; else `bg-overpanel text-ink-muted ring-line-strong`. XP figure `text-indigo-300` → `text-volt`.

In `RankingsTab`, "YOU" highlight `bg-accent/10 border-accent/40` fine; `text-indigo-300`→`text-volt`. Make rank rows use same ladder styling.

- [ ] **Step 3: Tabs + misc**

Tabs component already volt (Task 2). Activity/history rows: date text `text-ink-muted`, `DIFFICULTY_COLORS` remain (page-level) — verify they still read on dark; move difficulty badge to `rounded-full` (already). History expanded options keep `bg-wash/60`→`bg-overpanel/60`, borders `border-line`.

- [ ] **Step 4: Verify + commit**

`npm run typecheck` + `npm run build`. PASS.
Commit: `git commit -am "Scoreboard guild home with ladder leaderboard"`

---

### Task 7: QuizLobby + QuizScreen

**Files:**
- Modify: `apps/web/src/pages/QuizLobby.tsx`
- Modify: `apps/web/src/pages/QuizScreen.tsx`

**Interfaces:** Consumes tokens, `ProgressBar`, `Button`, `Card`.

- [ ] **Step 1: QuizLobby**

- Back link: `text-ink-muted hover:text-volt`.
- Title: `<h1 className="font-display text-3xl uppercase tracking-wide">New Quiz</h1>`.
- Step tracker: active bar `bg-accent`, done bars `bg-volt/40`, pending `bg-overpanel`; active label `text-volt`, others `text-ink-faint`.
- Option rows: `hover:border-line-strong hover:bg-overpanel`; option label `text-ink-soft`; chevron `text-ink-faint group-hover:text-volt`.
- "Ready to Start" Card: labels `text-ink-muted`, values `text-ink-soft`/`text-ink`; keep.
- Button Start Quiz (primary, already volt).

- [ ] **Step 2: QuizScreen**

- Chips: `bg-wash ring-line-strong` already dark-safe; icon `text-accent`; `/` separator `text-ink-faint`.
- Streak chip: `bg-orange-500/10 text-orange-700 ring-orange-500/30` → `bg-warning/10 text-warning ring-warning/30`.
- Answer rows: `isRight` → `border-volt/60 bg-volt/10`, letter chip right → `bg-volt text-field`; `isWrong` → `border-danger/60 bg-danger/10`, letter `bg-danger text-field`; idle letters `bg-overpanel text-ink-muted group-hover:bg-line-strong`; selected rows `border-volt bg-volt/10`.
- Right/wrong trailing icons: `text-volt` / `text-danger`.
- Feedback card: `isCorrect` → `border-volt/40 bg-volt/[0.08]`, text `text-volt`; `isWrong` → `border-danger/40 bg-danger/[0.08]`, text `text-danger`.
- Keep `ProgressBar` (blocky). "Next Question"/"See Results" button unchanged.

- [ ] **Step 3: Verify + commit**

`npm run typecheck` + `npm run build`. PASS.
Commit: `git commit -am "Scoreboard quiz flow"`

---

### Task 8: Results

**Files:**
- Modify: `apps/web/src/pages/Results.tsx`

**Interfaces:** Consumes tokens, `StatCard`, `formatCoins`, `formatTime`.

- [ ] **Step 1: Score sheet headline**

Inline icon tint (the `result.tint` record): perfect → `text-volt bg-volt/10 ring-volt/30`; great → `text-volt bg-volt/10 ring-volt/30` keep same or `text-volt-soft`; solid → `text-success bg-success/10 ring-success/30`; keep revising → `text-ink-muted bg-overpanel ring-line-strong`.

Title: `<h1 className="font-display text-4xl uppercase tracking-wide">{result.title}</h1>`.
Score line: `font-display text-2xl tabular-nums text-volt`.

- [ ] **Step 2: Panel rest**

- `StatCard` values get `font-display` automatically (Task 2). "XP Earned" / "Coins Earned" values already `+...`.
- Review answers: card borders `border-line`/`border-success/20`; correct/mistake pills keep; option rows keep; explanation `text-ink-muted`.
- Play Again / Back buttons unchanged.

- [ ] **Step 3: Verify + commit**

`npm run typecheck` + `npm run build`. PASS.
Commit: `git commit -am "Scoreboard results"`

---

### Task 9: Profile + Shop

**Files:**
- Modify: `apps/web/src/pages/Profile.tsx`
- Modify: `apps/web/src/pages/Shop.tsx`

**Interfaces:** Consumes tokens, `StatCard`, `Badge`, `formatCoins`.

- [ ] **Step 1: Profile**

- Name: `font-display text-2xl uppercase tracking-wide`. Email `text-ink-muted`.
- "Level N" heading → `font-display uppercase`; XP right text `text-ink-muted`.
- Subject rows: heading `text-ink-soft`; XP number `text-volt font-display`; keep `bg-success` progress.
- Achievement chips: `bg-accent/10 text-accent` → keep (volt); `ring-white/5` → `ring-line`.

- [ ] **Step 2: Shop**

- Category icon chip: `bg-overpanel text-volt`.
- Item price in button: `text-volt` numeral (keep coins icon).
- "Not enough coins" → `text-ink-muted`.
- Coins badge already `variant="info"` (now volt).

- [ ] **Step 3: Verify + commit**

`npm run typecheck` + `npm run build`. PASS.
Commit: `git commit -am "Scoreboard profile and shop"`

---

### Task 10: Full verification + deploy

**Files:** none (verification only).

- [ ] **Step 1: Emoji scan**

Run from `apps/web`:
`node -e "const fs=require('fs'),path=require('path');const re=/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{2E80}-\u{2EFF}\u{200D}]/u;function w(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);const s=fs.statSync(p);if(s.isDirectory())w(p);else if(/\.(tsx|ts|css|html)$/.test(f)){const c=fs.readFileSync(p,'utf8');if(re.test(c))console.log('EMOJI in',p)}}}w('src');console.log('scan complete')"`
Expected: `scan complete` and no `EMOJI in` lines.

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck` then `npm run build`. Expected: PASS, bundle emitted.

- [ ] **Step 3: Push + deploy**

From repo root:
`git add -A && git commit -m "Scoreboard blackout redesign"` (if anything uncommitted remains)
`vercel deploy --prod --yes` (repo root). Expected: READY.

- [ ] **Step 4: Verify prod**

Fetch `https://rivalr-phi.vercel.app`; assert 200 and that the emitted bundle hash is referenced in the served HTML.

---

## Self-Review Notes

- Spec coverage: tokens ✓ (T1), type ✓ (T1), shape/language ✓ (T1–2 + per-page), LIVE dot ✓ (T3/T5/T6), ladder ✓ (T6), blocky bar ✓ (T2), Anton headers ✓ (per-page), landing ✓ (T4), nav ✓ (T3), dashboard ✓ (T5), quiz ✓ (T7), results ✓ (T8), profile/shop ✓ (T9), deploy/verify ✓ (T10), non-goals respected (no logic/emoji/new features).
- No placeholders: every task has concrete token values, class strings, or full component code.
- Type consistency: `ProgressBar({ value, max, className, color, showLabel })` API unchanged everywhere; `color` default changed to `bg-volt`; badge/stat variants keep their existing prop shape.