"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markMessageRead, deleteContactMessage } from "@/app/dashboard/actions";

type Message = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  read: boolean;
  createdAt: Date;
};

export function ContactMessageRow({ message, canDelete = true }: { message: Message; canDelete?: boolean }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={async () => {
            setExpanded((e) => !e);
            if (!message.read) {
              await markMessageRead(message.id);
              router.refresh();
            }
          }}
          className="flex-1 text-left"
        >
          <div className="flex items-center gap-2">
            {!message.read && <span className="h-2 w-2 rounded-full bg-brand-red" />}
            <span className="font-medium text-brand-black">
              {message.subject || "(No subject)"}
            </span>
          </div>
          <div className="text-xs text-zinc-500">
            {message.name} &lt;{message.email}&gt; ·{" "}
            {new Date(message.createdAt).toLocaleDateString()}
          </div>
        </button>
        {canDelete && <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await deleteContactMessage(message.id);
            router.refresh();
          }}
          className="text-xs font-medium text-brand-red hover:underline disabled:opacity-60"
        >
          Delete
        </button>}
      </div>
      {expanded && (
        <p className="mt-2 whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-sm text-zinc-700">
          {message.message}
        </p>
      )}
    </li>
  );
}
