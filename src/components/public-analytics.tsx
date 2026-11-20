"use client";
import { Analytics } from "@vercel/analytics/next";
import { isPortalPath } from "@/lib/domains";

export function PublicAnalytics() {
  return <Analytics debug={false} beforeSend={(event) => {
    const url = new URL(event.url);
    if (isPortalPath(url.pathname)) return null;
    url.search = ""; url.hash = "";
    return { ...event, url: url.toString() };
  }} />;
}
