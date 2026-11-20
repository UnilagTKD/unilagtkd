import { ImageResponse } from "next/og";
import { brandImageData } from "@/lib/brand-image";
export const dynamic = "force-static";
export async function GET() {
  const logo = await brandImageData();
  return new ImageResponse(<div style={{ display: "flex", background: "white", width: 64, height: 64, borderRadius: 32, overflow: "hidden" }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={logo} width={64} height={64} alt="" style={{ objectFit: "contain" }} />
  </div>, { width: 64, height: 64, headers: { "Cache-Control": "public, max-age=86400" } });
}
