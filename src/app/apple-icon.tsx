import { ImageResponse } from "next/og";
import { brandImageData } from "@/lib/brand-image";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const dynamic = "force-static";
export default async function AppleIcon() {
  const logo = await brandImageData();
  return new ImageResponse(<div style={{ display: "flex", background: "white", width: 180, height: 180, borderRadius: 90, overflow: "hidden" }}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={logo} width={180} height={180} alt="" style={{ objectFit: "contain" }} />
  </div>, size);
}
