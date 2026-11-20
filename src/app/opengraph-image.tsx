import { ImageResponse } from "next/og";
import { brandImageData } from "@/lib/brand-image";
export const alt = "UNILAG Taekwondo Club — University of Lagos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";
export default async function OpenGraphImage() {
  const logo = await brandImageData();
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", gap: 60, padding: 80, background: "#0a1268", color: "white", borderBottom: "18px solid #c8102e" }}>
    <div style={{ display: "flex", background: "white", borderRadius: 24, padding: 24 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="" width={230} height={232} />
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}><div style={{ fontSize: 26, color: "#d5d9ff" }}>UNIVERSITY OF LAGOS</div><div style={{ display: "flex", flexDirection: "column", fontSize: 64, fontWeight: 700, lineHeight: 1.05 }}><span>UNILAG</span><span>TAEKWONDO CLUB</span></div><div style={{ fontSize: 24, color: "#d5d9ff", marginTop: 12 }}>Training · Discipline · Community</div></div>
  </div>, size);
}
