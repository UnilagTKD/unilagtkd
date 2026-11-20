import { z } from "zod";
import { isSafeImageReference } from "./image";

const image = z.string().refine(
  (value) => value === "" || isSafeImageReference(value),
  "Choose a valid image URL or uploaded photo."
);
export const achievementContentSchema = z.object({
  athleteName: z.string().trim().min(1).max(255),
  matricNo: z.string().trim().max(100).optional(),
  sex: z.string().trim().max(20).optional(),
  course: z.string().trim().max(150).optional(),
  level: z.string().trim().max(20).optional(),
  medal: z.enum(["gold", "silver", "bronze"]),
  competitionName: z.string().trim().min(1).max(255),
  competitionDate: z.string().date(),
  venue: z.string().trim().max(255).optional(),
});
export const galleryContentSchema = z.object({
  imageUrl: image.refine((value) => value.length > 0, "Upload a photo."),
  caption: z.string().trim().max(255).optional(),
  category: z.enum(["training", "demo", "tournament"]),
});
export const insightContentSchema = z.object({
  title: z.string().trim().min(1).max(255),
  excerpt: z.string().trim().min(1).max(2000),
  body: z.string().trim().min(1).max(100000),
  coverImageUrl: image.optional(),
  category: z.enum(["training", "competition", "club_news", "wellness"]),
  authorName: z.string().trim().max(150).optional(),
});
