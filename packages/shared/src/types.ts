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

export interface Guild {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface GuildMember {
  guild_id: string;
  user_id: string;
  joined_at: string;
  user?: User;
}

export interface QuizAttempt {
  id: string;
  user_id: string;
  guild_id: string;
  form: 4 | 5;
  subject: string;
  chapter_number: number;
  chapter_name: string;
  difficulty: "Easy" | "Medium" | "Hard" | "KBAT";
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number;
  xp_earned: number;
  coins_earned: number;
  questions_data: QuestionData[];
  completed_at: string;
}

export interface QuestionData {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  user_answer?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
}

export interface UserAchievement {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: "avatar_frame" | "sound_effect" | "quiz_theme" | "taunt";
  coin_cost: number;
  preview_data: string | null;
}

export interface UserInventory {
  user_id: string;
  item_id: string;
  purchased_at: string;
  is_equipped: boolean;
  item?: ShopItem;
}

export interface UserSubjectStats {
  user_id: string;
  subject: string;
  quizzes_completed: number;
  total_questions: number;
  correct_answers: number;
  xp_earned: number;
  best_streak: number;
}

export interface UserChapterStats {
  user_id: string;
  subject: string;
  form: 4 | 5;
  chapter_number: number;
  chapter_name: string;
  difficulty: "Easy" | "Medium" | "Hard" | "KBAT";
  attempts: number;
  total_questions: number;
  correct_answers: number;
  best_score: number;
  best_time_seconds: number | null;
  xp_earned: number;
  last_attempted_at: string | null;
}

export interface ActivityFeedItem {
  id: string;
  user_name: string;
  user_avatar: string | null;
  action: string;
  details: string;
  timestamp: string;
}

export type Subject = "Biology" | "Chemistry" | "Physics" | "Additional Mathematics";
export type Difficulty = "Easy" | "Medium" | "Hard" | "KBAT";

export const SUBJECTS: Subject[] = [
  "Biology",
  "Chemistry",
  "Physics",
  "Additional Mathematics",
];

export const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard", "KBAT"];

export const CHAPTERS: Record<Subject, Record<4 | 5, { number: number; name: string }[]>> = {
  Biology: {
    4: [
      { number: 1, name: "Introduction to Biology" },
      { number: 2, name: "Cell Structure and Cell Organisation" },
      { number: 3, name: "Movement of Substances Across the Plasma Membrane" },
      { number: 4, name: "Chemical Composition of the Cell" },
      { number: 5, name: "Cell Division" },
      { number: 6, name: "Nutrition" },
      { number: 7, name: "Respiration" },
      { number: 8, name: "Dynamic Ecosystem" },
      { number: 9, name: "Endangered Ecosystem" },
    ],
    5: [
      { number: 1, name: "Transport" },
      { number: 2, name: "Locomotion and Support" },
      { number: 3, name: "Coordination and Response" },
      { number: 4, name: "Reproduction and Growth" },
      { number: 5, name: "Inheritance" },
      { number: 6, name: "Variation" },
      { number: 7, name: "Nutrition and Agriculture" },
    ],
  },
  Chemistry: {
    4: [
      { number: 1, name: "Introduction to Chemistry" },
      { number: 2, name: "The Structure of the Atom" },
      { number: 3, name: "Chemical Formulae and Equations" },
      { number: 4, name: "Periodic Table of Elements" },
      { number: 5, name: "Chemical Bonds" },
      { number: 6, name: "Electrochemistry" },
      { number: 7, name: "Acids and Bases" },
      { number: 8, name: "Salts" },
      { number: 9, name: "Manufactured Substances in Industry" },
    ],
    5: [
      { number: 1, name: "Rate of Reaction" },
      { number: 2, name: "Carbon Compounds" },
      { number: 3, name: "Oxidation and Reduction" },
      { number: 4, name: "Thermochemistry" },
      { number: 5, name: "Chemicals for Consumers" },
    ],
  },
  Physics: {
    4: [
      { number: 1, name: "Introduction to Physics" },
      { number: 2, name: "Forces and Motion" },
      { number: 3, name: "Forces and Pressure" },
      { number: 4, name: "Heat" },
      { number: 5, name: "Light" },
    ],
    5: [
      { number: 1, name: "Waves" },
      { number: 2, name: "Electricity" },
      { number: 3, name: "Electromagnetism" },
      { number: 4, name: "Electronics" },
      { number: 5, name: "Radioactivity" },
    ],
  },
  "Additional Mathematics": {
    4: [
      { number: 1, name: "Functions" },
      { number: 2, name: "Quadratic Functions" },
      { number: 3, name: "Systems of Equations" },
      { number: 4, name: "Indices, Surds and Logarithms" },
      { number: 5, name: "Progressions" },
      { number: 6, name: "Linear Law" },
      { number: 7, name: "Coordinate Geometry" },
      { number: 8, name: "Vectors" },
      { number: 9, name: "Solution of Triangles" },
      { number: 10, name: "Index Numbers" },
    ],
    5: [
      { number: 1, name: "Circular Measure" },
      { number: 2, name: "Differentiation" },
      { number: 3, name: "Integration" },
      { number: 4, name: "Permutation and Combination" },
      { number: 5, name: "Probability" },
      { number: 6, name: "Probability Distributions" },
      { number: 7, name: "Linear Programming" },
      { number: 8, name: "Kinematics of Linear Motion" },
    ],
  },
};
