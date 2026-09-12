export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  xp: number;
  coins: number;
  created_at: string;
  status?: string;
}

export interface Guild {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  description?: string;
  icon?: string;
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
  timer_enabled?: boolean;
}

export interface QuestionData {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  user_answer?: number;
  table?: { columns: string[]; rows: string[][] };
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
  category: "avatar_frame" | "sound_effect" | "quiz_theme" | "taunt" | "title" | "name_glow";
  coin_cost: number;
  preview_data: string | null;
}

export interface PublicUser {
  id: string;
  name: string;
  avatar_url: string | null;
  xp: number;
  coins: number;
  status?: string;
  created_at: string;
}

export interface CustomTaunt {
  user_id: string;
  asset_key: string;
  sha256: string;
  is_equipped: boolean;
  created_at: string;
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
      { number: 1, name: "Introduction to Biology and Laboratory Rules" },
      { number: 2, name: "Cell Biology and Cell Organisation" },
      { number: 3, name: "Movement of Substances across a Plasma Membrane" },
      { number: 4, name: "Chemical Composition of the Cell" },
      { number: 5, name: "Metabolism and Enzymes" },
      { number: 6, name: "Cell Division" },
      { number: 7, name: "Cellular Respiration" },
      { number: 8, name: "Respiratory System in Humans and Animals" },
      { number: 9, name: "Nutrition and the Human Digestive System" },
      { number: 10, name: "Transport in Humans and Animals" },
      { number: 11, name: "Defence in Humans and Animals" },
      { number: 12, name: "Dynamic Ecosystem" },
      { number: 13, name: "Endangered Ecosystem" },
    ],
    5: [
      { number: 1, name: "Organisation of Plant Tissues and Growth" },
      { number: 2, name: "Structure and Leaf Function" },
      { number: 3, name: "Nutrition in Plants" },
      { number: 4, name: "Transport in Plants" },
      { number: 5, name: "Response in Plants" },
      { number: 6, name: "Sexual Reproduction in Flowering Plants" },
      { number: 7, name: "Adaptation of Plants to the Environment" },
    ],
  },
  Chemistry: {
    4: [
      { number: 1, name: "Introduction to Chemistry" },
      { number: 2, name: "Matter and Atomic Structure" },
      { number: 3, name: "Chemical Formulae and Equations" },
      { number: 4, name: "Periodic Table of Elements" },
      { number: 5, name: "Chemical Bonds" },
      { number: 6, name: "Electrochemistry" },
      { number: 7, name: "Acids, Bases and Salts" },
      { number: 8, name: "Manufactured Substances in Industry" },
    ],
    5: [
      { number: 1, name: "Redox Equilibrium" },
      { number: 2, name: "Carbon Compounds" },
      { number: 3, name: "Thermochemistry" },
      { number: 4, name: "Polymers" },
      { number: 5, name: "Chemicals for Consumers" },
    ],
  },
  Physics: {
    4: [
      { number: 1, name: "Measurement" },
      { number: 2, name: "Force and Motion I" },
      { number: 3, name: "Gravitation" },
      { number: 4, name: "Heat" },
      { number: 5, name: "Waves" },
      { number: 6, name: "Light and Optics" },
      { number: 7, name: "Force and Pressure" },
    ],
    5: [
      { number: 1, name: "Force and Motion II" },
      { number: 2, name: "Pressure" },
      { number: 3, name: "Electricity" },
      { number: 4, name: "Electromagnetism" },
      { number: 5, name: "Electronics" },
      { number: 6, name: "Nuclear Physics" },
      { number: 7, name: "Quantum Physics" },
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
      { number: 4, name: "Permutations and Combinations" },
      { number: 5, name: "Probability Distributions" },
      { number: 6, name: "Trigonometric Functions" },
      { number: 7, name: "Linear Programming" },
      { number: 8, name: "Kinematics of Linear Motion" },
    ],
  },
};
