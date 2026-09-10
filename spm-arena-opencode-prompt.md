# rivalr — OpenCode Build Prompt

## Project Overview

Build a full-stack web app called **rivalr** — a persistent, async multiplayer quiz platform for Malaysian Form 4 and Form 5 science stream students. Think of it as a "study guild": a private group of friends sharing a persistent home room, completing quizzes on their own time, competing on leaderboards, and earning achievements.

---

## Tech Stack (use exactly these)

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| Auth | Google OAuth via **Supabase Auth** |
| Database | **Supabase** (Postgres) for user data, quiz history, achievements, shop |
| Question Cache | **Cloudflare KV** — compressed question sets stored server-side, decompressed locally in browser |
| AI Questions | **Anthropic Claude API** (`claude-sonnet-4-6`) — generate MCQ questions per subject/topic |
| Backend API | **Cloudflare Workers** (handles KV reads/writes, Claude API calls, compression) |
| Hosting | **Cloudflare Pages** (frontend) + **Cloudflare Workers** (backend) |

---

## Core Concepts

### Guild (Home Room)
- A **Guild** is a private persistent group. One person creates it and gets an invite link.
- Anyone with the invite link can join via Google OAuth.
- The guild is the central "home" — members see each other's stats, rankings, and activity here at all times.
- Guilds are private by default. No public discovery.

### Async Quiz
- Quizzes are **not live/real-time**. Each member completes quizzes on their own time.
- Questions are AI-generated per subject and topic, then **compressed (LZ-string or similar)** and stored in **Cloudflare KV**.
- When a user starts a quiz, the worker fetches the compressed question set from KV and sends it to the browser, which **decompresses locally** — reducing repeated Claude API calls and saving costs.
- Each completed quiz attempt is saved to Supabase with: user ID, subject, topic, questions answered, answers given, score, time taken, timestamp.

### Question Format
- All questions are **MCQ (A/B/C/D)** — 4 options, 1 correct answer.
- Each question has: question text, 4 options, correct answer index, brief explanation of the correct answer.
- Questions are tagged by: subject, chapter (number + name), difficulty (Easy / Medium / Hard / KBAT).
- Subjects and their **official SPM chapters**:

  **Biology (Form 4)**
  - Chapter 1: Introduction to Biology
  - Chapter 2: Cell Structure and Cell Organisation
  - Chapter 3: Movement of Substances Across the Plasma Membrane
  - Chapter 4: Chemical Composition of the Cell
  - Chapter 5: Cell Division
  - Chapter 6: Nutrition
  - Chapter 7: Respiration
  - Chapter 8: Dynamic Ecosystem
  - Chapter 9: Endangered Ecosystem

  **Biology (Form 5)**
  - Chapter 1: Transport
  - Chapter 2: Locomotion and Support
  - Chapter 3: Coordination and Response
  - Chapter 4: Reproduction and Growth
  - Chapter 5: Inheritance
  - Chapter 6: Variation
  - Chapter 7: Nutrition and Agriculture (Food Technology)

  **Chemistry (Form 4)**
  - Chapter 1: Introduction to Chemistry
  - Chapter 2: The Structure of the Atom
  - Chapter 3: Chemical Formulae and Equations
  - Chapter 4: Periodic Table of Elements
  - Chapter 5: Chemical Bonds
  - Chapter 6: Electrochemistry
  - Chapter 7: Acids and Bases
  - Chapter 8: Salts
  - Chapter 9: Manufactured Substances in Industry

  **Chemistry (Form 5)**
  - Chapter 1: Rate of Reaction
  - Chapter 2: Carbon Compounds
  - Chapter 3: Oxidation and Reduction
  - Chapter 4: Thermochemistry
  - Chapter 5: Chemicals for Consumers

  **Physics (Form 4)**
  - Chapter 1: Introduction to Physics
  - Chapter 2: Forces and Motion
  - Chapter 3: Forces and Pressure
  - Chapter 4: Heat
  - Chapter 5: Light

  **Physics (Form 5)**
  - Chapter 1: Waves
  - Chapter 2: Electricity
  - Chapter 3: Electromagnetism
  - Chapter 4: Electronics
  - Chapter 5: Radioactivity

  **Additional Mathematics (Form 4)**
  - Chapter 1: Functions
  - Chapter 2: Quadratic Functions
  - Chapter 3: Systems of Equations
  - Chapter 4: Indices, Surds and Logarithms
  - Chapter 5: Progressions
  - Chapter 6: Linear Law
  - Chapter 7: Coordinate Geometry
  - Chapter 8: Vectors
  - Chapter 9: Solution of Triangles
  - Chapter 10: Index Numbers

  **Additional Mathematics (Form 5)**
  - Chapter 1: Circular Measure
  - Chapter 2: Differentiation
  - Chapter 3: Integration
  - Chapter 4: Permutation and Combination
  - Chapter 5: Probability
  - Chapter 6: Probability Distributions
  - Chapter 7: Linear Programming
  - Chapter 8: Kinematics of Linear Motion

---

## Pages & Features

### 1. Landing Page (`/`)
- Clean, professional landing page.
- "Sign in with Google" button.
- Brief description of SPM Arena.
- No glowing gradients or AI-looking design — clean, modern, humanlike UI.

### 2. Dashboard (`/dashboard`)
After login, user lands here. Shows:
- Their guild(s) with a quick summary (member count, recent activity).
- Quick stats: total quizzes completed, overall accuracy, coins balance.
- Button to create a new guild or join one via invite link.

### 3. Guild Home (`/guild/:guildId`)
The central "home room" for a group. Contains tabs:

#### Tab: Overview
- Guild name and members list with avatars (from Google profile photo).
- Each member shows: level, total quizzes, overall accuracy, coins.
- **Overall leaderboard** — ranked by total XP, with rank badges (🥇🥈🥉 and numbered below).

#### Tab: Rankings
Three-level drill-down leaderboard:

**Level 1 — Subject leaderboard:**
- Tabs for: Biology / Chemistry / Physics / Add Math
- Shows: rank, member name + avatar, total quizzes in subject, overall accuracy %, total XP in subject

**Level 2 — Chapter leaderboard (click any subject tab → select chapter):**
- Dropdown of all chapters for that subject (e.g. "Chapter 6: Electrochemistry")
- Shows: rank, member name, quizzes done in that chapter, accuracy % in that chapter, best score in that chapter

**Level 3 — Difficulty leaderboard (within a chapter):**
- Tabs: Easy / Medium / Hard / KBAT
- Shows: rank, member name, attempts, accuracy %, best score, fastest completion time
- This is the most granular view — lets friends compete on exactly the same chapter + difficulty

All leaderboard views only show guild members. Highlight the current user's row.

#### Tab: Activity Feed
- Scrollable feed of recent activity across all members:
  - *"Aqil completed Form 4 Chemistry · Chapter 8: Salts · Hard — 9/10 ✅"*
  - *"Sarah earned achievement: 🔥 5-Day Streak"*
  - *"Daniel unlocked a new avatar frame in the shop"*
  - *"Aqil overtook Sarah on Chapter 6: Electrochemistry (Hard) leaderboard 🏆"*

#### Tab: Quiz History (per member)
- Click any member to expand their full quiz history:
  - Date, form, subject, chapter (number + name), difficulty, score (e.g. 8/10), accuracy %, time taken.
  - Click any quiz entry to expand and see every question, the member's chosen answer, the correct answer, and the explanation.
  - Filterable by subject and/or difficulty.
  - This is pulled from Supabase and rendered cleanly, paginated (20 per page).

### 4. Quiz Lobby (`/guild/:guildId/quiz`)
Step-by-step selection UI (wizard style, one step per screen):
1. **Form** — Form 4 or Form 5
2. **Subject** — Biology / Chemistry / Physics / Additional Mathematics
3. **Chapter** — dropdown showing all official chapters for that subject + form (e.g. "Chapter 3 — Chemical Formulae and Equations"). Chapter list is hardcoded from the official SPM syllabus above.
4. **Difficulty** — Easy / Medium / Hard / KBAT (with a tooltip explaining each level)
5. **Number of Questions** — 5 / 10 / 20

After all selections are made, show a summary card before "Start Quiz":
- e.g. *"Form 4 Chemistry · Chapter 6: Electrochemistry · Hard · 10 questions"*

App checks Cloudflare KV for a cached compressed question set matching `{form}:{subject}:{chapter_number}:{difficulty}:{count}`.
- If found: decompress locally and load.
- If not found: call Cloudflare Worker → Claude API → generate questions → compress → store in KV → return to client.

### 5. Quiz Screen (`/guild/:guildId/quiz/:quizId`)
- One question at a time, full screen focus mode.
- Progress bar at top (e.g. Question 4/10).
- Timer per question (configurable: 30s / 60s / unlimited).
- A/B/C/D answer buttons — large, tappable.
- On answer: immediately show if correct or wrong, highlight correct answer, show brief explanation.
- Power-ups panel (if user has any equipped):
  - **50/50** — removes 2 wrong options.
  - **Time Freeze** — pauses timer for 15 seconds.
  - **Double XP** — doubles XP earned for this question.
- Streak counter shown in corner — consecutive correct answers.
- After last question: show results screen.

### 6. Results Screen
- Score (e.g. 8/10), accuracy %, time taken.
- XP earned breakdown: base XP + streak bonus + difficulty multiplier.
- Coins earned.
- Any achievements unlocked this session (animated pop-up).
- "Review Answers" button — shows all questions with user's answer vs correct answer + explanation.
- "Play Again" and "Back to Guild" buttons.

### 7. Profile Page (`/profile`)
- Google profile photo, name, email.
- Stats panel:
  - Total quizzes, overall accuracy, total XP, level (XP-based), coins.
  - Per-subject breakdown: quizzes done, accuracy %, best streak.
- Achievements section — all earned achievements with date unlocked.
- Equipped cosmetics (avatar frame, answer sound effect).

### 8. Shop (`/shop`)
- Spend coins on cosmetics (no pay-to-win):
  - **Avatar Frames** — decorative borders around profile photo.
  - **Answer Sound Effects** — custom sounds on correct/wrong answer.
  - **Quiz Themes** — colour themes for the quiz screen.
  - **Taunt Stickers** — emoji/sticker packs to post in guild activity feed.
- Each item shows: name, preview, coin cost, "Buy" or "Equipped" button.
- Purchases saved to Supabase.

---

## Achievements System

Store achievements in Supabase. Each achievement has: id, name, description, icon (emoji), XP reward, unlock condition.

Implement at minimum these achievements:

| Achievement | Condition |
|---|---|
| 🔰 First Blood | Complete your first quiz |
| 🔥 On Fire | Get 5 correct answers in a row |
| 💯 Perfect | Score 100% on any quiz |
| 📚 Subject Master: Bio | Complete 10 Biology quizzes |
| 📚 Subject Master: Chem | Complete 10 Chemistry quizzes |
| 📚 Subject Master: Physics | Complete 10 Physics quizzes |
| 📚 Subject Master: Add Math | Complete 10 Add Math quizzes |
| 🧠 KBAT King | Complete 5 KBAT-difficulty quizzes |
| ⚡ Speed Demon | Complete a 10-question quiz in under 3 minutes |
| 🗓️ 3-Day Streak | Quiz on 3 consecutive days |
| 🗓️ 7-Day Streak | Quiz on 7 consecutive days |
| 👑 Guild Top | Reach #1 on guild leaderboard |
| 💰 Rich Kid | Accumulate 500 coins |
| 🛒 Shopaholic | Buy 3 items from the shop |
| 🎯 Sharpshooter | Maintain 90%+ accuracy over 20 quizzes |

Achievement unlock checks run after every quiz completion. Notify user with an animated modal if new achievement(s) unlocked.

---

## XP & Levelling

- XP formula per question: `base (10) × difficulty_multiplier × streak_bonus`
  - Difficulty: Easy ×1, Medium ×1.5, Hard ×2, KBAT ×2.5
  - Streak bonus: 1–2 correct = ×1, 3–4 = ×1.2, 5+ = ×1.5
- Level thresholds: Level 1 = 0 XP, each level requires `level × 200 XP` more than previous.
- Show level and XP progress bar on profile and guild member cards.

## Coins

- Earn coins per quiz: `score × difficulty_multiplier` rounded to nearest 5.
- Coins are purely cosmetic — spent in shop only.

---

## Cloudflare KV — Question Caching

- KV key format: `questions:{form}:{subject}:{chapter_number}:{difficulty}:{count}` (all lowercase, spaces as underscores, e.g. `questions:4:chemistry:6:hard:10`).
- Value: LZ-string compressed JSON array of question objects.
- TTL: 7 days (questions refresh weekly to avoid staleness).
- Worker endpoint: `POST /api/questions` — accepts `{ form, subject, chapter_number, chapter_name, difficulty, count }`, checks KV, generates via Claude if miss, compresses, stores, returns decompressed JSON to client.
- Client decompresses using `lz-string` npm package in browser.

### Claude Prompt for Question Generation (use this exactly):

```
You are an expert SPM (Sijil Pelajaran Malaysia) examiner for {subject}.
Generate {count} multiple choice questions for Form {form}, Chapter {chapter_number}: {chapter_name}, at difficulty level "{difficulty}".

Difficulty definitions:
- Easy: Recall and basic understanding (Bloom's Level 1-2)
- Medium: Application and analysis (Bloom's Level 3-4)
- Hard: Synthesis and evaluation (Bloom's Level 5-6)
- KBAT: Higher Order Thinking — complex multi-step scenarios, real-world application, data interpretation

Rules:
- Questions must be accurate and strictly aligned to the Malaysian SPM syllabus for Form {form} {subject}, Chapter {chapter_number}.
- Cover a variety of subtopics within the chapter — do not repeat the same concept.
- Each question must have exactly 4 options (A, B, C, D).
- Only one option is correct. The other three must be plausible distractors.
- Provide a brief explanation (1-2 sentences) for why the correct answer is right.
- For Additional Mathematics: use proper Unicode math notation (e.g. x², √, ∫, π, ≥).
- For Chemistry: include chemical formulae where relevant (e.g. H₂SO₄, NaOH).
- Do not repeat questions or options.
- Return ONLY a valid JSON array, no markdown, no preamble, no trailing comma.

Format:
[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Brief explanation of why the correct answer is right."
  }
]
```

---

## Supabase Schema

Create these tables:

```sql
-- Users (auto-populated on first Google OAuth login)
users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  xp INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Guilds
guilds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
)

-- Guild Members
guild_members (
  guild_id UUID REFERENCES guilds(id),
  user_id UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (guild_id, user_id)
)

-- Quiz Attempts
quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  guild_id UUID REFERENCES guilds(id),
  form INTEGER NOT NULL CHECK (form IN (4, 5)),
  subject TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  chapter_name TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'KBAT')),
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  time_taken_seconds INTEGER NOT NULL,
  xp_earned INTEGER NOT NULL,
  coins_earned INTEGER NOT NULL,
  questions_data JSONB NOT NULL, -- full snapshot of questions + user answers + correct answers + explanations
  completed_at TIMESTAMPTZ DEFAULT NOW()
)

-- Achievements
achievements (
  id TEXT PRIMARY KEY, -- e.g. 'first_blood', 'perfect_score'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  xp_reward INTEGER DEFAULT 0
)

-- User Achievements
user_achievements (
  user_id UUID REFERENCES users(id),
  achievement_id TEXT REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
)

-- Shop Items
shop_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'avatar_frame' | 'sound_effect' | 'quiz_theme' | 'taunt'
  coin_cost INTEGER NOT NULL,
  preview_data TEXT -- emoji, color hex, or asset reference
)

-- User Inventory
user_inventory (
  user_id UUID REFERENCES users(id),
  item_id TEXT REFERENCES shop_items(id),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  is_equipped BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, item_id)
)

-- Subject Stats (denormalized for subject-level leaderboard)
user_subject_stats (
  user_id UUID REFERENCES users(id),
  subject TEXT NOT NULL,
  quizzes_completed INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, subject)
)

-- Chapter+Difficulty Stats (denormalized for chapter & difficulty leaderboards)
-- One row per user × subject × chapter × difficulty combination
user_chapter_stats (
  user_id UUID REFERENCES users(id),
  subject TEXT NOT NULL,
  form INTEGER NOT NULL CHECK (form IN (4, 5)),
  chapter_number INTEGER NOT NULL,
  chapter_name TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'KBAT')),
  attempts INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,          -- best correct_answers in a single attempt
  best_time_seconds INTEGER,             -- fastest completion time (nullable until first attempt)
  xp_earned INTEGER DEFAULT 0,
  last_attempted_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, subject, form, chapter_number, difficulty)
)

-- Index for fast leaderboard queries per guild
-- (guild membership is in guild_members; JOIN with user_chapter_stats for leaderboard)
CREATE INDEX idx_chapter_stats_lookup ON user_chapter_stats (subject, form, chapter_number, difficulty);
```

---

## Optimization Requirements

1. **No redundant Claude calls** — always check KV before calling Claude. Log cache hits vs misses.
2. **Compression** — use `lz-string` for all KV values. Decompress in browser, never on worker.
3. **Supabase RLS** — enable Row Level Security on all tables. Users can only read/write their own data except guild leaderboards (readable by guild members).
4. **Lazy loading** — quiz history and activity feed are paginated (20 items per page, infinite scroll).
5. **Optimistic UI** — quiz answer selection feels instant; sync to Supabase happens in background.
6. **Error boundaries** — every page wrapped in React error boundary. Network failures show friendly retry UI, never blank screen.
7. **Loading skeletons** — every data fetch shows skeleton loaders, not spinners.
8. **TypeScript strict mode** — `"strict": true` in tsconfig. No `any` types.
9. **Environment variables** — all secrets in `.env` (Supabase URL/key, Cloudflare KV binding, Anthropic API key). Never hardcoded.
10. **Mobile responsive** — fully usable on phone. Quiz screen especially must be thumb-friendly.

---

## UI Design Rules

- **No glowing gradients, no neon, no "AI-generated" look.**
- Clean, professional, humanlike design — think Notion meets Duolingo.
- Font: Inter (Google Fonts).
- Color palette: deep navy (`#0F172A`) background for dark mode, clean white for light mode. Accent: vibrant indigo (`#6366F1`).
- Tailwind only — no custom CSS files unless absolutely necessary.
- Consistent spacing: 8px grid system via Tailwind.
- Buttons: rounded-lg, clear hover states, disabled states always styled.
- Cards: subtle shadow, rounded-xl, clear hierarchy.
- Achievements: animated unlock modal with confetti (use `canvas-confetti` package).

---

## File Structure

```
spm-arena/
├── apps/
│   ├── web/                          # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/           # Reusable UI components
│   │   │   │   ├── ui/               # Base components (Button, Card, Badge, etc.)
│   │   │   │   ├── layout/           # Navbar, Sidebar, PageWrapper
│   │   │   │   ├── quiz/             # QuizCard, QuestionBlock, ResultsPanel
│   │   │   │   ├── guild/            # GuildCard, MemberCard, Leaderboard
│   │   │   │   ├── shop/             # ShopItem, InventoryPanel
│   │   │   │   └── achievements/     # AchievementBadge, UnlockModal
│   │   │   ├── pages/                # Route-level pages
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   ├── lib/                  # supabase.ts, api.ts, compression.ts
│   │   │   ├── stores/               # Zustand stores (auth, quiz, guild)
│   │   │   ├── types/                # TypeScript interfaces
│   │   │   └── utils/                # xp.ts, achievements.ts, format.ts
│   │   └── public/
│   └── worker/                       # Cloudflare Worker
│       ├── src/
│       │   ├── index.ts              # Main worker entry, route handler
│       │   ├── routes/
│       │   │   ├── questions.ts      # KV cache + Claude generation
│       │   │   └── health.ts
│       │   └── lib/
│       │       ├── claude.ts         # Anthropic API wrapper
│       │       ├── kv.ts             # KV helpers
│       │       └── compress.ts       # LZ-string compress/decompress
│       └── wrangler.toml
├── packages/
│   └── shared/                       # Shared TypeScript types
│       └── src/types.ts
└── package.json                      # Monorepo root (pnpm workspaces)
```

---

## Seed Data

Seed the `achievements` and `shop_items` tables with all items listed above. Seed `shop_items` with at least:
- 5 avatar frames (names: Default, Gold Crown, Fire Ring, Galaxy, SPM Champion)
- 3 sound effect packs (Classic, Anime, Retro 8-bit)
- 3 quiz themes (Dark Mode, Light Mode, Forest Green)
- 5 taunt stickers (😈, 💀, 🔥, 🤓, 👑)

---

## What to Build First (in order)

1. Project scaffold (monorepo, Vite, Tailwind, TypeScript strict)
2. Supabase setup — schema, RLS policies, seed data
3. Google OAuth flow — login, session, user creation on first login
4. Cloudflare Worker — `/api/questions` endpoint with KV + Claude
5. Guild creation + invite link + join flow
6. Quiz lobby → quiz screen → results screen (full flow)
7. Supabase writes — save quiz attempt, update XP/coins/subject stats + chapter stats (upsert user_chapter_stats)
8. Achievement check engine — runs after every quiz save
9. Guild home — all tabs (overview, subject rankings, activity feed, quiz history)
10. Profile page
11. Shop — buy and equip items
12. Polish — skeletons, error boundaries, mobile responsiveness, confetti

---

## Final Notes

- Write clean, maintainable, well-commented code.
- Every function should do one thing. No god functions.
- Use React Query (TanStack Query) for all Supabase data fetching — handles caching, loading, and error states cleanly.
- Use Zustand for client-side state (auth session, active quiz state).
- Use React Router v6 for routing.
- Validate all API inputs on the worker side before processing.
- All dates stored as UTC in Supabase, displayed in user's local timezone.
- Test the full flow end to end before finishing: sign in → create guild → invite friend → complete quiz → see leaderboard → earn achievement → buy shop item.


THE NAME IS rivalr not spm arena 
that is the old name.