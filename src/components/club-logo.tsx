import Image from "next/image";

export function ClubLogo({ size = 36, preload = false }: { size?: number; preload?: boolean }) {
  return (
    <Image
      src="/brand/club-logo.png"
      alt="UNILAG Taekwondo Club logo"
      width={size}
      height={Math.round(size * 966 / 958)}
      sizes={`${size}px`}
      preload={preload}
      className="rounded-full"
      style={{ width: size, height: "auto" }}
    />
  );
}
