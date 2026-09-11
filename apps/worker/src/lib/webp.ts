export interface ValidationResult {
  ok: boolean;
  reason?: string;
  width?: number;
  height?: number;
}

const MAX_DIM = 512;

export function validateWebP(bytes: Uint8Array): ValidationResult {
  if (bytes.length < 20) return { ok: false, reason: "File too small to be a WebP" };
  const sig = new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF";
  const webp = new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP";
  if (!sig || !webp) return { ok: false, reason: "Not a WebP image" };

  const chunk = new TextDecoder().decode(bytes.subarray(12, 16));
  let width: number;
  let height: number;

  if (chunk === "VP8X") {
    width = bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16);
    height = bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16);
    width += 1;
    height += 1;
  } else if (chunk === "VP8L") {
    const b1 = bytes[21]!;
    const b2 = bytes[22]!;
    const b3 = bytes[23]!;
    const b4 = bytes[24]!;
    width = (b1 | ((b2 & 0x3f) << 8)) + 1;
    height = (((b2 >> 6) & 0x03) | (b3 << 2) | ((b4 & 0x0f) << 10)) + 1;
  } else if (chunk === "VP8 ") {
    width = bytes[26]! | (bytes[27]! << 8);
    height = bytes[28]! | (bytes[29]! << 8);
  } else {
    return { ok: false, reason: "Unsupported WebP variant" };
  }

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return { ok: false, reason: "Invalid WebP dimensions" };
  }
  if (width > MAX_DIM || height > MAX_DIM) return { ok: false, reason: "Dimensions too large" };
  return { ok: true, width, height };
}