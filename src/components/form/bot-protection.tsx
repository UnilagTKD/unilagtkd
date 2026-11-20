"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useNonce } from "@/components/nonce-provider";

export type BotProtectionInput = { website: string; token: string };
type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
const api = () => (window as unknown as { turnstile?: Turnstile }).turnstile;

export function BotProtection({ action, onChange }: { action: "register" | "contact"; onChange: (input: BotProtectionInput) => void }) {
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const nonce = useNonce();
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [website, setWebsite] = useState("");
  const [token, setToken] = useState("");
  useEffect(() => { onChange({ website, token }); }, [website, token, onChange]);
  useEffect(() => {
    const turnstile = api();
    if (!sitekey || !ready || !container.current || !turnstile) return;
    const id = turnstile.render(container.current, {
      sitekey, action, callback: setToken,
      "expired-callback": () => setToken(""), "error-callback": () => setToken(""),
    });
    return () => turnstile.remove(id);
  }, [action, ready, sitekey]);
  return <>
    <div className="hidden" aria-hidden="true">
      <label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} /></label>
    </div>
    {sitekey && <>
      <Script nonce={nonce} src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setReady(true)} />
      <div ref={container} />
    </>}
  </>;
}
