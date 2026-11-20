import { headers } from "next/headers";
import { serializeStructuredData } from "@/lib/seo";
export async function StructuredData({ value }: { value: unknown }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeStructuredData(value) }} />;
}
