const THEME_HEX_TO_CLASS: Record<string, string> = {
  "#C9F73A": "bg-[#C9F73A]",
  "#FF3CAC": "bg-[#FF3CAC]",
  "#3ABEF9": "bg-[#3ABEF9]",
  "#FF5733": "bg-[#FF5733]",
};

export function hexToProgressClass(hex?: string | null): string {
  if (!hex) return "bg-volt";
  return THEME_HEX_TO_CLASS[hex] ?? "bg-volt";
}

export async function playCorrectSfx(audio: HTMLAudioElement, url: string) {
  audio.src = url;
  audio.currentTime = 0;
  try { await audio.play(); } catch { /* autoplay blocked */ }
}