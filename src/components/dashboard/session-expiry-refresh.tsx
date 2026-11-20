"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function SessionExpiryRefresh({ deadline }: { deadline: string }) {
  const router = useRouter();
  useEffect(() => {
    const delay = new Date(deadline).getTime() - Date.now();
    if (delay <= 0) return;
    const timer = setTimeout(() => router.refresh(), Math.min(delay + 100, 2147483647));
    return () => clearTimeout(timer);
  }, [deadline, router]);
  return null;
}
