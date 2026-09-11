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

export function formatCoins(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs < 1000) return `${sign}${abs}`;
  const units = ["K", "M", "B", "T"];
  let idx = -1;
  let v = abs;
  while (v >= 1000 && idx < units.length - 1) {
    v /= 1000;
    idx++;
  }
  const decimals = v >= 100 ? 0 : v >= 10 ? 1 : 2;
  const text = v.toFixed(decimals).replace(/(\.\d*?)0+(?=$)/, "$1").replace(/\.$/, "");
  return `${sign}${text}${units[idx]}`;
}

export const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "border-success/25 bg-success/10 text-success",
  Medium: "border-gold/25 bg-gold/10 text-gold",
  Hard: "border-orange/25 bg-orange/10 text-orange",
  KBAT: "border-danger/25 bg-danger/10 text-danger",
};
