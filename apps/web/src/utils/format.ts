export function calculateXP(
  correctAnswers: number,
  difficulty: string,
  streak: number,
): number {
  const base = 10;
  const difficultyMultiplier: Record<string, number> = {
    Easy: 1,
    Medium: 1.5,
    Hard: 2,
    KBAT: 2.5,
  };
  let streakBonus = 1;
  if (streak >= 5) streakBonus = 1.5;
  else if (streak >= 3) streakBonus = 1.2;

  return Math.round(
    correctAnswers *
      base *
      (difficultyMultiplier[difficulty] ?? 1) *
      streakBonus,
  );
}

export function calculateCoins(
  score: number,
  difficulty: string,
): number {
  const multiplier: Record<string, number> = {
    Easy: 1,
    Medium: 1.5,
    Hard: 2,
    KBAT: 2.5,
  };
  return Math.round(score * (multiplier[difficulty] ?? 1) / 5) * 5;
}

export function getLevel(xp: number): { level: number; currentXP: number; nextLevelXP: number } {
  let level = 1;
  let remainingXP = xp;
  let required = 200;

  while (remainingXP >= required) {
    remainingXP -= required;
    level++;
    required = level * 200;
  }

  return { level, currentXP: remainingXP, nextLevelXP: required };
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatAccuracy(correct: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((correct / total) * 100)}%`;
}

export const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "text-green-400 bg-green-400/10",
  Medium: "text-yellow-400 bg-yellow-400/10",
  Hard: "text-orange-400 bg-orange-400/10",
  KBAT: "text-red-400 bg-red-400/10",
};
