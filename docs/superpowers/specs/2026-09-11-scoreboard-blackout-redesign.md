# Scoreboard Blackout Redesign

Date: 2026-09-11
Status: Approved by user (conversation), pending spec sign-off

## Goal

Make rivalr stop looking like a generic AI-generated app and read unmistakably as a **live league on a stadium screen** — a competitive SPM study app for Form 4/5 students. Two prior visual directions (dark navy-indigo, warm paper + single accent) were rejected as "AI-looking". This direction replaces them. Purely a visual + UX layer; all logic, data, flows, and recent bug fixes stay untouched.

## Identity

Every screen is a live match broadcast. Numbers are the hero; the guild leaderboard is the league ladder; volt lime marks everything that is live/correct/ranked.

## Tokens

| Role | Value |
|---|---|
| Field (page bg) | `#0B0D0C` warm near-black |
| Raised panel | `#121513` |
| Over panel | `#171B18` |
| Hairline | `#232824` |
| Hairline strong | `#2E352F` |
| Text primary | `#F4F6F2` |
| Text muted | `#9AA39B` |
| Volt accent | `#C9F73A` (hover `#B4E02E`) |
| Danger | `#FF4D4F` |
| Warning | `#FFB02E` |
| Success (non-volt use) | `#3DDC84` |

## Type

- Display: **Anton** (Google Fonts, single weight condensed) for headlines, LEVEL/RANK numerals, big stats, score figures.
- Body: system sans stack (existing `font-sans`), micro-labels uppercase + wide tracking (e.g. `GG 04 — BIOLOGY · CH.9`).
- All numerals `tabular-nums`.

## Shape / language

- Sharp or near-sharp corners (0–6px). No more blanket `rounded-2xl`.
- Panels = rectangles with 1px hairlines. Dividers = hairline rules.
- One accent only (volt). No gradients, no glows, no emoji. SVG icons only.
- Motion: pulsing volt `● LIVE` dot, hover row/afine reveal, Results score count-up, reduced-motion respected.

## Signature elements

1. Volt `● LIVE` dot in screen headers.
2. Leaderboards as a **ladder**: rank 1 = big volt panel; others = rows with hairline dividers, volt XP figures, "YOU" marked in volt.
3. XP progress as **blocky score bar** (segments), not a soft pill.

## Per-screen

- **Landing**: blackout hero, two-line Anton headline ("STUDY IN GUILDS / CLIMB THE RANKS"), three features as stat-chips with volt numbers, rectangular volt sign-in button, muted auth-error card.
- **Navbar + mobile tab bar**: hairline bottom border, Anton wordmark, active tab = volt underline bar, uppercase labels.
- **Dashboard**: "PLAYER — name" header; Anton `LV 3` + volt large XP + blocky score bar; stats as scoreboard chips; guilds as league table (rank, name, members).
- **GuildHome**: scoreboard strip header (guild name, invite-code chip, LIVE dot, rectangular volt START QUIZ); tabs as segments; leaderboard ladder; activity/history rows.
- **QuizLobby**: step tracker as numbered segments, options as rectangular rows with `A)`-style letters.
- **QuizScreen**: question panel with top hairline; answer rows — correct = volt block w/ black text, wrong = red outline; blocky segmented score bar; volt `×N STREAK` chip.
- **Results**: giant Anton score (`8/10`), volt `+XP` / `+COINS` chips, review list.
- **Profile / Shop**: rectangular rows and cards, volt prices/values, ladder-ish stats.

## Non-goals

- No backend/data/Firestore changes.
- No emoji anywhere in UI (SVG only).
- No new pages or features.
- Keep current routes, auth handling, and QA fixes in place.

## Implementation notes

- Add Anton via Google Fonts in `apps/web/index.html` with `Impact`/system condensed fallbacks.
- Replace tailwind token map (navy/indigo/signal remaps) with this design system; pages reference light-theme class names today and will be converted to new tokens as they are swept.
- Verify with `npm run typecheck` + `vite build`; deploy via `vercel deploy --prod --yes` from repo root.