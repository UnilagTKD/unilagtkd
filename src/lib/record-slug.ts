import { slugify } from "./slugify";
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function recordSlug(label: string, id: string) { return `${slugify(label).slice(0, 70).replace(/-$/, "") || "record"}-${id}`; }
export function recordIdFromSlug(value: string) {
  const match = typeof value === "string" ? value.match(UUID) : null;
  if (!match || (value !== match[0] && value[value.length - match[0].length - 1] !== "-")) return null;
  return match[0].toLowerCase();
}
export function capabilityTokenFromSlug(value: string) {
  const match = typeof value === "string" ? value.match(/[a-f0-9]{64}$/) : null;
  if (!match || (value !== match[0] && value[value.length - 65] !== "-")) return null;
  return match[0];
}
