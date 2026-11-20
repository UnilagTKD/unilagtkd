import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
let logo: Promise<string> | undefined;
export function brandImageData() {
  return logo ??= readFile(path.join(process.cwd(), "public/brand/club-logo.png")).then(buffer => `data:image/png;base64,${buffer.toString("base64")}`);
}
