import { auth } from "./firebase";

export const API_BASE = import.meta.env.VITE_API_URL as string;

export async function fetchQuestions(params: {
  form: number;
  subject: string;
  chapter_number: number;
  chapter_name: string;
  difficulty: string;
  count: number;
}) {
  const res = await fetch(`${API_BASE}/api/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error("Failed to fetch questions");
  return res.json() as Promise<{
    questions: {
      question: string;
      options: string[];
      correct: number;
      explanation: string;
      table?: { columns: string[]; rows: string[][] };
    }[];
    cached: boolean;
  }>;
}

export const api = {
  async uploadTaunt(blob: Blob) {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`${API_BASE}/api/taunts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: blob,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Upload failed — please try again.");
    }
    return res.json() as Promise<{ sha256: string; size: number; asset_key: string }>;
  },

  async deleteTaunt() {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`${API_BASE}/api/taunts`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Could not delete taunt.");
  },

  async uploadAvatar(blob: Blob) {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`${API_BASE}/api/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: blob,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Avatar upload failed — please try again.");
    }
    return res.json() as Promise<{ sha256: string; size: number; asset_key: string }>;
  },

  async deleteAvatar() {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`${API_BASE}/api/avatar`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Could not delete avatar.");
  },

  tauntAssetUrl(uid: string, file: string) {
    return `${API_BASE}/api/taunts/${encodeURIComponent(uid)}/${encodeURIComponent(file)}`;
  },

  avatarAssetUrl(uid: string, file: string) {
    return `${API_BASE}/api/avatar/${encodeURIComponent(uid)}/${encodeURIComponent(file)}`;
  },

  sfxUrl(key: string) {
    return `${API_BASE}/api/sfx/${encodeURIComponent(key)}`;
  },
};