// Run this script once to seed Firestore with achievements and shop items.
// Usage: node src/seed.mjs
// Set GCLOUD_PROJECT / or use a Firebase service account key.
// If you don't have one, use the "Firebase Admin" quickstart:
//   1. Firebase Console → Project Settings → Service accounts → Generate new private key
//   2. Save it as serviceAccountKey.json in this directory
//   3. Set GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json
//   4. Run: node src/seed.mjs

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

let adminApp;
if (existsSync("./serviceAccountKey.json")) {
  const serviceAccount = JSON.parse(readFileSync("./serviceAccountKey.json", "utf8"));
  adminApp = initializeApp({ credential: cert(serviceAccount) });
} else {
  adminApp = initializeApp();
}

const db = getFirestore(adminApp);

const achievements = [
  { name: "First Blood", description: "Complete your first quiz", icon: "🔰", xp_reward: 50 },
  { name: "On Fire", description: "Get 5 correct answers in a row", icon: "🔥", xp_reward: 100 },
  { name: "Perfect", description: "Score 100% on any quiz", icon: "💯", xp_reward: 150 },
  { name: "Subject Master: Bio", description: "Complete 10 Biology quizzes", icon: "📚", xp_reward: 250 },
  { name: "Subject Master: Chem", description: "Complete 10 Chemistry quizzes", icon: "📚", xp_reward: 250 },
  { name: "Subject Master: Physics", description: "Complete 10 Physics quizzes", icon: "📚", xp_reward: 250 },
  { name: "Subject Master: Add Math", description: "Complete 10 Add Math quizzes", icon: "📚", xp_reward: 250 },
  { name: "KBAT King", description: "Complete 5 KBAT-difficulty quizzes", icon: "🧠", xp_reward: 200 },
  { name: "Speed Demon", description: "Complete a 10-question quiz in under 3 minutes", icon: "⚡", xp_reward: 150 },
  { name: "3-Day Streak", description: "Quiz on 3 consecutive days", icon: "🗓️", xp_reward: 100 },
  { name: "7-Day Streak", description: "Quiz on 7 consecutive days", icon: "🗓️", xp_reward: 300 },
  { name: "Guild Top", description: "Reach #1 on guild leaderboard", icon: "👑", xp_reward: 200 },
  { name: "Rich Kid", description: "Accumulate 500 coins", icon: "💰", xp_reward: 100 },
  { name: "Shopaholic", description: "Buy 3 items from the shop", icon: "🛒", xp_reward: 150 },
  { name: "Sharpshooter", description: "Maintain 90%+ accuracy over 20 quizzes", icon: "🎯", xp_reward: 400 },
];

const achievementsById: Record<string, string> = {
  first_blood: "First Blood",
  on_fire: "On Fire",
  perfect_score: "Perfect",
  subject_master_bio: "Subject Master: Bio",
  subject_master_chem: "Subject Master: Chem",
  subject_master_physics: "Subject Master: Physics",
  subject_master_add_math: "Subject Master: Add Math",
  kbat_king: "KBAT King",
  speed_demon: "Speed Demon",
  streak_3_day: "3-Day Streak",
  streak_7_day: "7-Day Streak",
  guild_top: "Guild Top",
  rich_kid: "Rich Kid",
  shopaholic: "Shopaholic",
  sharpshooter: "Sharpshooter",
};

const shopItems = [
  // Avatar frames
  { id: "frame_default", name: "Default", description: "The classic look", category: "avatar_frame", coin_cost: 0, preview_data: "◯" },
  { id: "frame_gold_crown", name: "Gold Crown", description: "Only for the top of the leaderboard", category: "avatar_frame", coin_cost: 200, preview_data: "👑" },
  { id: "frame_fire_ring", name: "Fire Ring", description: "For those on a hot streak", category: "avatar_frame", coin_cost: 150, preview_data: "🔥" },
  { id: "frame_galaxy", name: "Galaxy", description: "Out of this world", category: "avatar_frame", coin_cost: 300, preview_data: "🌌" },
  { id: "frame_spm_champion", name: "SPM Champion", description: "You made it", category: "avatar_frame", coin_cost: 500, preview_data: "🏆" },
  // Sound effects
  { id: "sfx_classic", name: "Classic", description: "Clean, simple feedback sounds", category: "sound_effect", coin_cost: 50, preview_data: "🔊" },
  { id: "sfx_anime", name: "Anime", description: "Bold, dramatic answers", category: "sound_effect", coin_cost: 80, preview_data: "🎌" },
  { id: "sfx_retro", name: "Retro 8-bit", description: "Gamer vibes", category: "sound_effect", coin_cost: 100, preview_data: "👾" },
  // Quiz themes
  { id: "theme_dark", name: "Dark Mode", description: "The default aesthetic", category: "quiz_theme", coin_cost: 0, preview_data: "🌙" },
  { id: "theme_light", name: "Light Mode", description: "Bright and airy", category: "quiz_theme", coin_cost: 50, preview_data: "☀️" },
  { id: "theme_forest", name: "Forest Green", description: "Stay sharp in the woods", category: "quiz_theme", coin_cost: 80, preview_data: "🌳" },
  // Taunt stickers
  { id: "taunt_devil", name: "Mischief", description: "Post in the activity feed", category: "taunt", coin_cost: 30, preview_data: "😈" },
  { id: "taunt_skull", name: "Destroyed", description: "When someone fails the quiz", category: "taunt", coin_cost: 30, preview_data: "💀" },
  { id: "taunt_fire", name: "Burning", description: "You're on fire today", category: "taunt", coin_cost: 40, preview_data: "🔥" },
  { id: "taunt_nerd", name: "Nerd", description: "Classic study champion", category: "taunt", coin_cost: 30, preview_data: "🤓" },
  { id: "taunt_crown", name: "King", description: "Bow to the leader", category: "taunt", coin_cost: 50, preview_data: "👑" },
];

async function seed() {
  console.log("Seeding achievements...");
  for (const [id, name] of Object.entries(achievementsById)) {
    const data = achievements.find((a) => a.name === name);
    if (!data) continue;
    await db.collection("achievements").doc(id).set(data);
  }

  console.log("Seeding shop items...");
  for (const item of shopItems) {
    await db.collection("shop_items").doc(item.id).set({
      name: item.name,
      description: item.description,
      category: item.category,
      coin_cost: item.coin_cost,
      preview_data: item.preview_data,
    });
  }

  console.log("Done! Firestore seeded.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});