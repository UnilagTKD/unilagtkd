import { z } from "zod";
import { isRasterImage } from "./image";
export const receiptImageSchema = z.string().max(1_400_000).refine(value => isRasterImage(value) && Math.floor((value.length-value.indexOf(",")-1)*3/4) <= 1024*1024, "Upload a PNG, JPEG, or WebP receipt image under 1MB.");
