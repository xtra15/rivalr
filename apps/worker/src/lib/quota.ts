import type { Env } from "../types";

const TOTAL_KEY = "r2_total_bytes";

function budget(env: Env): number {
  const raw = Number(env.R2_MAX_TOTAL_BYTES ?? 0);
  return raw > 0 ? raw : 128 * 1024 * 1024;
}

export async function getTotalBytes(env: Env): Promise<number> {
  const raw = await env.QUESTIONS_KV.get(TOTAL_KEY);
  const n = Number(raw ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function applyR2Bytes(env: Env, delta: number): Promise<{ ok: boolean; total: number }> {
  const total = await getTotalBytes(env);
  const next = total + delta;
  if (delta >= 0 && next > budget(env)) return { ok: false, total };
  await env.QUESTIONS_KV.put(TOTAL_KEY, String(Math.max(0, next)));
  return { ok: true, total: Math.max(0, next) };
}