import type { Env } from "../types";
import { verifyFirebaseToken } from "../lib/verify";
import { applyR2Bytes } from "../lib/quota";

const MAX_BYTES = 5 * 1024 * 1024;

type ImageCheck = { ok: true; ext: string; mime: string } | { ok: false; reason: string };

function detectImage(bytes: Uint8Array): ImageCheck {
  if (bytes.length >= 6) {
    const gif89 = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];
    const gif87 = [0x47, 0x49, 0x46, 0x38, 0x37, 0x61];
    const head = [...bytes.slice(0, 6)];
    if (head.every((b, i) => b === gif89[i])) return { ok: true, ext: "gif", mime: "image/gif" };
    if (head.every((b, i) => b === gif87[i])) return { ok: true, ext: "gif", mime: "image/gif" };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { ok: true, ext: "png", mime: "image/png" };
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ok: true, ext: "jpg", mime: "image/jpeg" };
  }
  return { ok: false, reason: "Only GIF, PNG or JPEG images are supported" };
}

export async function handleAvatars(request: Request, env: Env, path: string): Promise<Response> {
  if (request.method === "GET") {
    return handleServe(request, env, path);
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return Response.json({ error: "Missing authorization" }, { status: 401 });

  let uid: string;
  try {
    ({ uid } = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID));
  } catch {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  if (request.method === "DELETE") {
    const listed = await env.TAUNTS_R2.list({ prefix: `avatars/${uid}/` });
    const removedBytes = listed.objects.reduce((acc, o) => acc + o.size, 0);
    await Promise.all(listed.objects.map((o) => env.TAUNTS_R2.delete(o.key)));
    await applyR2Bytes(env, -removedBytes);
    return Response.json({ ok: true });
  }

  if (request.method === "POST") {
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.length === 0) return Response.json({ error: "Empty body" }, { status: 400 });
    if (bytes.length > MAX_BYTES) return Response.json({ error: "File too large" }, { status: 413 });
    const check = detectImage(bytes);
    if (!check.ok) return Response.json({ error: check.reason }, { status: 422 });

    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const sha256 = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    const assetKey = `avatars/${uid}/${sha256}.${check.ext}`;

    const existing = await env.TAUNTS_R2.list({ prefix: `avatars/${uid}/` });
    const replacedBytes = existing.objects.reduce((acc, o) => acc + o.size, 0);
    const quota = await applyR2Bytes(env, bytes.length - replacedBytes);
    if (!quota.ok) {
      return Response.json({ error: "Storage quota reached — contact the admin." }, { status: 413 });
    }

    await Promise.all(existing.objects.map((o) => env.TAUNTS_R2.delete(o.key)));
    await env.TAUNTS_R2.put(assetKey, bytes, {
      httpMetadata: { contentType: check.mime },
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
  const m = /^\/api\/avatar\/([^/]+)\/(.+)$/.exec(path);
  if (!m) return new Response("Not found", { status: 404 });
  const [, uid, file] = m;
  const key = `avatars/${decodeURIComponent(uid)}/${decodeURIComponent(file)}`;
  const obj = await env.TAUNTS_R2.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const body = (await obj.arrayBuffer()) as ArrayBuffer;
  const ext = file.split(".").pop()?.toLowerCase();
  const mime =
    ext === "gif" ? "image/gif" : ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/octet-stream";
  return new Response(body, {
    headers: {
      "Content-Type": mime,
      "Cache-Control": "public, max-age=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}