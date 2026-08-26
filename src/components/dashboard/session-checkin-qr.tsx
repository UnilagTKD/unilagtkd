import "server-only";

import { headers } from "next/headers";
import QRCode from "qrcode";

async function getBaseUrl() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  if (!host) return process.env.NEXTAUTH_URL ?? "http://localhost:5213";

  const proto = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function SessionCheckInQr({
  sessionId,
  title,
}: {
  sessionId: string;
  title: string;
}) {
  const baseUrl = await getBaseUrl();
  const checkInUrl = `${baseUrl}/dashboard/checkin/${sessionId}`;
  const qrDataUrl = await QRCode.toDataURL(checkInUrl, { margin: 1, width: 220 });

  return (
    <div className="rounded-xl border border-black/10 bg-white p-6">
      <h2 className="font-semibold text-brand-black">Today&apos;s Check-In QR</h2>
      <p className="mt-1 text-xs text-zinc-500">
        {title} &mdash; members scan this to mark themselves present.
      </p>
      <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt={`Check-in QR code for ${title}`}
          width={180}
          height={180}
          className="rounded-lg border border-black/10"
        />
        <div className="text-xs text-zinc-500">
          <p>Or share this link directly:</p>
          <code className="mt-1 block break-all rounded bg-zinc-50 p-2 text-zinc-700">
            {checkInUrl}
          </code>
        </div>
      </div>
    </div>
  );
}
