"use client";

import { useState } from "react";
import { sendChat } from "@/server/actions/chat";

export function ChatBox({
  locale,
  requestId = "",
  bookingId = "",
  label,
  sendLabel,
}: {
  locale: string;
  requestId?: string;
  bookingId?: string;
  label: string;
  sendLabel: string;
}) {
  const [body, setBody] = useState("");
  return (
    <form className="stack" action={sendChat} style={{ marginTop: 12 }}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="requestId" value={requestId} />
      <label>
        {label}
        <input name="body" value={body} onChange={(event) => setBody(event.target.value)} required maxLength={500} />
      </label>
      <button className="btn" type="submit">{sendLabel}</button>
    </form>
  );
}
