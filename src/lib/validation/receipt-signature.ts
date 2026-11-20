import { z } from "zod";
import { isSafeImageReference } from "./image";
export const receiptSignatureSchema = z.string().trim().min(1, "Upload your signature.").max(2_800_000, "Signature image is too large.").refine(isSafeImageReference, "Choose a PNG, JPEG, or WebP signature image or an HTTPS image URL.");
