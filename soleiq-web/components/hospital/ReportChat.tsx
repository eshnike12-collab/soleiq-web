"use client";

/**
 * Report-scoped clinical assistant. The server assembles the record under the
 * caller's RLS session, so answers are grounded only in what this clinician
 * is authorized to read for this exact report.
 */

import { useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Lightweight, safe markdown for assistant replies: paragraphs, dash bullets,
// bold. Built as React elements (no innerHTML), with stray code fences
// stripped defensively — the prompt forbids them, but a reply that slips
// through should still read as text, not raw ``` markers.
function inlineBold(text: string, keyPrefix: string) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={`${keyPrefix}-${i}`}>{part}</strong> : part
  );
}

function AssistantMessage({ content }: { content: string }) {
  const cleaned = content
    .replace(/```[a-zA-Z]*\n?/g, "")
    .replace(/```/g, "")
    .replace(/`([^`]+)`/g, "$1");

  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  let paragraph: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={key++} className="list-disc space-y-1 pl-4">
        {bullets.map((item, i) => (
          <li key={i}>{inlineBold(item, `b${key}-${i}`)}</li>
        ))}
      </ul>
    );
    bullets = [];
  };
  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(" ");
    blocks.push(<p key={key++}>{inlineBold(text, `p${key}`)}</p>);
    paragraph = [];
  };

  for (const raw of cleaned.split("\n")) {
    const line = raw.trim();
    if (!line) {
      flushBullets();
      flushParagraph();
      continue;
    }
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      bullets.push(bullet[1]);
    } else if (heading) {
      flushBullets();
      flushParagraph();
      blocks.push(
        <p key={key++} className="font-semibold">
          {inlineBold(heading[1], `h${key}`)}
        </p>
      );
    } else {
      flushBullets();
      paragraph.push(line);
    }
  }
  flushBullets();
  flushParagraph();

  return <div className="space-y-2">{blocks}</div>;
}

const STARTERS = [
  "Summarize this report for a clinical note.",
  "Which finding is most concerning and why?",
  "What follow-up would you suggest discussing with this patient?",
];

export function ReportChat({
  hospitalSlug,
  reportId,
  patientName,
}: {
  hospitalSlug: string;
  reportId: string;
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
      const response = await fetch(
        `/api/h/${hospitalSlug}/reports/${reportId}/chat`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: next }),
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error?.message ?? "The assistant could not answer."
        );
      }
      setMessages([...next, { role: "assistant", content: payload.data.reply }]);
      setTimeout(
        () =>
          scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
          }),
        50
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "The assistant could not answer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
        <Sparkles className="h-4 w-4 text-brand" />
        <div>
          <p className="text-sm font-semibold text-slate-950">
            Ask about {patientName ?? "this report"}
          </p>
          <p className="text-[11px] text-slate-500">
            Answers come only from this report and intake — screening support,
            not a diagnosis.
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="max-h-80 space-y-3 overflow-y-auto px-5 py-3">
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {STARTERS.map((starter) => (
              <button
                key={starter}
                type="button"
                disabled={busy}
                onClick={() => void send(starter)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs text-slate-700 hover:border-brand/40"
              >
                {starter}
              </button>
            ))}
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user"
                ? "ml-auto max-w-[92%] whitespace-pre-wrap rounded-2xl bg-brand px-3 py-2 text-sm leading-relaxed text-white"
                : "max-w-[92%] rounded-2xl bg-slate-50 px-3 py-2 text-sm leading-relaxed text-slate-800"
            }
          >
            {message.role === "assistant" ? (
              <AssistantMessage content={message.content} />
            ) : (
              message.content
            )}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading the report…
          </div>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-center gap-2 border-t border-slate-100 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this report…"
          className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand"
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
