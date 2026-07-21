"use client";

/**
 * Per-patient AI assistant for the doctor/caregiver view. Sends the chat to
 * /api/patient-chat with the viewer's Supabase JWT; the server builds the
 * patient's record under RLS, so the assistant only knows what this viewer
 * is allowed to see.
 */

import { useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "Summarize this patient's history and current status.",
  "Any recurring findings or trends I should watch?",
  "When were the last photos taken, and is a re-check overdue?",
];

export function PatientChat({
  patientAuthUid,
  patientName,
}: {
  patientAuthUid: string;
  patientName?: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setError(null);
    setInput("");
    const next: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setBusy(true);
    try {
      const sb = getSupabase();
      const { data } = (await sb?.auth.getSession()) ?? { data: null };
      const token = data?.session?.access_token;
      const response = await fetch("/api/patient-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ patientAuthUid, messages: next }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "The assistant could not answer.");
      }
      setMessages([...next, { role: "assistant", content: payload.reply }]);
      setTimeout(
        () => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }),
        50
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "The assistant could not answer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-warmGray-100 bg-white">
      <header className="flex items-center gap-2 border-b border-warmGray-100 px-4 py-3">
        <Sparkles className="h-4 w-4 text-brand" />
        <div>
          <p className="text-sm font-semibold text-warmGray-800">
            Ask about {patientName ?? "this patient"}
          </p>
          <p className="text-[11px] text-warmGray-600">
            Answers come only from this patient&apos;s saved checks and intake — screening
            support, not a diagnosis.
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="max-h-80 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                disabled={busy}
                onClick={() => void send(starter)}
                className="rounded-full border border-warmGray-100 bg-warmGray-50/60 px-3 py-1.5 text-left text-xs text-warmGray-800 hover:border-brand/40"
              >
                {starter}
              </button>
            ))}
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
              message.role === "user"
                ? "ml-auto bg-brand text-white"
                : "bg-warmGray-50 text-warmGray-800"
            )}
          >
            {message.content}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-warmGray-600">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the record…
          </div>
        )}
        {error && <p className="text-xs text-risk-medium">{error}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-center gap-2 border-t border-warmGray-100 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about this patient's record…"
          className="h-10 flex-1 rounded-xl border border-warmGray-100 bg-white px-3 text-sm text-warmGray-800 outline-none focus:border-brand/50"
        />
        <button
          type="submit"
          disabled={busy || input.trim().length === 0}
          aria-label="Send"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}
