import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const local = ["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.DATABASE_URL).hostname);
const client = postgres(process.env.DATABASE_URL, { prepare: false, ssl: local && process.env.NODE_ENV !== "production" ? false : "verify-full" });

export const db = drizzle(client, { schema });
