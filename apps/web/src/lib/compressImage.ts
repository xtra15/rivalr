const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_DIM = 512;
const MAX_OUTPUT_BYTES = 512 * 1024;

export class CompressError extends Error {
  code: "too-large" | "unsupported" | "unreadable";
  constructor(code: CompressError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

async function decodeToCanvas(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new CompressError("unreadable", "Could not decode this image."));
      el.src = url;
    });
    const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new CompressError("unreadable", "Canvas unavailable.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function canvasToWebP(canvas: HTMLCanvasElement, maxBytes: number): Promise<Blob> {
  for (let quality = 0.85; quality >= 0.4; quality -= 0.15) {
    const webp = await toBlob(canvas, "image/webp", quality);
    if (webp && webp.type === "image/webp" && webp.size <= maxBytes) return webp;
  }
  for (let quality = 0.85; quality >= 0.4; quality -= 0.15) {
    const jpeg = await toBlob(canvas, "image/jpeg", quality);
    if (jpeg && jpeg.size <= maxBytes) return jpeg;
  }
  const jpeg = await toBlob(canvas, "image/jpeg", 0.4);
  if (!jpeg) throw new CompressError("unreadable", "Encoding failed.");
  return jpeg;
}

export async function compressImage(file: File): Promise<Blob> {
  if (!["image/gif", "image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new CompressError("unsupported", "Unsupported format — use GIF, PNG, JPG, or WebP.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new CompressError("too-large", "File too large — please use a file under 8 MB.");
  }
  const canvas = await decodeToCanvas(file);
  const blob = await canvasToWebP(canvas, MAX_OUTPUT_BYTES);
  if (blob.size > MAX_OUTPUT_BYTES) {
    throw new CompressError("too-large", "Re-encoded image is still too large after compression.");
  }
  return blob;
}