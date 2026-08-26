import Image from "next/image";

export function ClubLogo({ size = 36 }: { size?: number }) {
  return (
    <Image
      src="/brand/club-logo.png"
      alt="UNILAG Taekwondo Club logo"
      width={958}
      height={966}
      style={{ width: size, height: "auto" }}
    />
  );
}
