import type { Env } from "../types";
import { verifyFirebaseToken } from "../lib/verify";
import { validateWebP } from "../lib/webp";
import { applyR2Bytes } from "../lib/quota";

const MAX_BYTES = 512 * 1024;

export async function handleTaunts(request: Request, env: Env, path: string): Promise<Response> {
  if (request.method === "GET") {
    return handleServe(request, env, path);
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return Response.json({ error: "Missing authorization" }, { status: 401 });

  let uid: string;
  try {
    ({ uid } = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID));
  } catch (err) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  if (request.method === "DELETE") {
    const listed = await env.TAUNTS_R2.list({ prefix: `taunts/${uid}/` });
    const removedBytes = listed.objects.reduce((acc, o) => acc + o.size, 0);
    await Promise.all(listed.objects.map((o) => env.TAUNTS_R2.delete(o.key)));
    await applyR2Bytes(env, -removedBytes);
    return Response.json({ ok: true });
  }

  if (request.method === "POST") {
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.length === 0) return Response.json({ error: "Empty body" }, { status: 400 });
    if (bytes.length > MAX_BYTES) return Response.json({ error: "File too large" }, { status: 413 });
    const check = validateWebP(bytes);
    if (!check.ok) return Response.json({ error: check.reason }, { status: 422 });

    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha256 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    const assetKey = `taunts/${uid}/${sha256}.webp`;

    const existing = await env.TAUNTS_R2.list({ prefix: `taunts/${uid}/` });
    const replacedBytes = existing.objects.reduce((acc, o) => acc + o.size, 0);
    const quota = await applyR2Bytes(env, bytes.length - replacedBytes);
    if (!quota.ok) {
      return Response.json({ error: "Storage quota reached — contact the admin." }, { status: 413 });
    }

    await Promise.all(existing.objects.map((o) => env.TAUNTS_R2.delete(o.key)));
    await env.TAUNTS_R2.put(assetKey, bytes, {
      httpMetadata: { contentType: "image/webp" },
    });

    return Response.json({
      sha256,
      size: bytes.length,
      asset_key: assetKey,
    });
  }

  return new Response("Method not allowed", { status: 405 });
}

async function handleServe(request: Request, env: Env, path: string): Promise<Response> {
  const m = /^\/api\/taunts\/([^/]+)\/(.+)$/.exec(path);
  if (!m) return new Response("Not found", { status: 404 });
  const [, uid, file] = m;
  const key = `taunts/${decodeURIComponent(uid)}/${decodeURIComponent(file)}`;
  const obj = await env.TAUNTS_R2.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const body = (await obj.arrayBuffer()) as ArrayBuffer;
  return new Response(body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}