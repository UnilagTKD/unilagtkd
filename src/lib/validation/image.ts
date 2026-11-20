export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Validate bytes as well as MIME; SVG/HTML are never accepted as uploads. */
export function isRasterImage(dataUrl: string): boolean {
  if (dataUrl.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 64) return false;
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if (!match || match[2].length % 4 !== 0) return false;
  try {
    const bytes = atob(match[2]);
    if (bytes.length > MAX_IMAGE_BYTES || bytes.length < 12) return false;
    if (match[1] === "image/png") return bytes.startsWith("\x89PNG\r\n\x1a\n") && bytes.length >= 24 && bytes.slice(12, 16) === "IHDR";
    if (match[1] === "image/jpeg") return bytes.startsWith("\xff\xd8\xff") && bytes.endsWith("\xff\xd9");
    return bytes.startsWith("RIFF") && bytes.slice(8, 12) === "WEBP";
  } catch { return false; }
}

export function isSafeImageReference(value: string): boolean {
  if (value.startsWith("data:")) return isRasterImage(value);
  if (value.length > 2048 || /[\x00-\x20\\]/.test(value)) return false;
  if (/^\/(?!\/)/.test(value)) return !value.includes("?") && /\.(?:png|jpe?g|webp)$/i.test(value);
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}
