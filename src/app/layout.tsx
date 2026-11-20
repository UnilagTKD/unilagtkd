import type { Metadata } from "next";
import { PublicAnalytics } from "@/components/public-analytics";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ScrollNavButtons } from "@/components/scroll-nav-buttons";
import { headers } from "next/headers";
import { NonceProvider } from "@/components/nonce-provider";
import { SITE_NAME, SITE_ORIGIN, SITE_DESCRIPTION, PUBLIC_ROBOTS } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  applicationName: SITE_NAME,
  category: "sports",
  authors: [{ name: SITE_NAME, url: SITE_ORIGIN }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: PUBLIC_ROBOTS,
  icons: { icon: [{ url: "/icon.png?v=3", sizes: "64x64", type: "image/png" }], apple: [{ url: "/apple-icon?v=3", sizes: "180x180", type: "image/png" }] },
  openGraph: { type: "website", siteName: SITE_NAME, title: SITE_NAME, description: SITE_DESCRIPTION, locale: "en_NG" },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION },
  title: {
    default: "UNILAG Taekwondo Club",
    template: "%s | UNILAG Taekwondo Club",
  },
  description:
    SITE_DESCRIPTION,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Request-time rendering is required for a fresh script nonce on every page.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="sr-only z-50 rounded bg-white px-4 py-3 font-semibold text-brand-blue focus:not-sr-only focus:absolute focus:left-4 focus:top-4">Skip to content</a>
        <NonceProvider nonce={nonce}>
          {children}
          <ScrollNavButtons />
          <PublicAnalytics />
        </NonceProvider>
      </body>
    </html>
  );
}
