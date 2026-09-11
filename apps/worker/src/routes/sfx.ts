import type { Env } from "../types";

export async function handleSfx(request: Request, env: Env, path: string): Promise<Response> {
  const m = /^\/api\/sfx\/(.+)$/.exec(path);
  if (!m || request.method !== "GET") return new Response("Not found", { status: 404 });
  const key = decodeURIComponent(m[1]!);
  const obj = await env.TAUNTS_R2.get(`sfx/${key}`);
  if (!obj) return new Response("Not found", { status: 404 });
  const body = (await obj.arrayBuffer()) as ArrayBuffer;
  return new Response(body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=604800",
    },
  });
}