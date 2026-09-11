import { importX509, jwtVerify, base64url } from "jose";

const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

interface CachedKey {
  key: CryptoKey;
  expires: number;
}

const certCache = new Map<string, CachedKey>();

async function getCertKey(kid: string): Promise<CryptoKey> {
  const hit = certCache.get(kid);
  if (hit && hit.expires > Date.now()) return hit.key;

  const res = await fetch(CERTS_URL, { cf: { cacheTtl: 3600 } });
  if (!res.ok) throw new Error(`Failed to fetch Google certs: ${res.status}`);
  const cacheControl = res.headers.get("cache-control") ?? "";
  const maxAge = Number(/max-age=(\d+)/.exec(cacheControl)?.[1] ?? 3600);
  const certs = (await res.json()) as Record<string, string>;
  const pem = certs[kid];
  if (!pem) throw new Error("Unknown key id in token header");
  const key = await importX509(pem, "RS256");
  certCache.set(kid, { key, expires: Date.now() + maxAge * 1000 });
  return key;
}

export async function verifyFirebaseToken(token: string, projectId: string): Promise<{ uid: string }> {
  const [headerB64] = token.split(".");
  if (!headerB64) throw new Error("Malformed token");
  const header = JSON.parse(new TextDecoder().decode(base64url.decode(headerB64))) as { kid?: string };
  if (!header.kid) throw new Error("Token missing kid");
  const key = await getCertKey(header.kid);
  const { payload } = await jwtVerify(token, key, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  if (!payload.sub) throw new Error("Token missing subject");
  return { uid: payload.sub };
}