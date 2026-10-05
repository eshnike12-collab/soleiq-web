"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, MessageCircle, Send, Sparkles, X } from "lucide-react";

/**
 * The patient's assistant, docked bottom-right.
 *
 * Patient surfaces only. The clinician keeps the in-report assistant exactly
 * where it was — a floating bubble over a clinical record is the wrong shape
 * for someone reading a report at a desk, and the two assistants answer
 * differently on purpose.
 *
 * Everything it knows comes from the server, which assembles THIS patient's
 * own records under their own session (see server/patientAssistant.ts). The
 * component sends messages and renders replies; it holds no record data of
 * its own and no patient identity.
 */

const MAX_IMAGES = 4;
/** Roughly the largest photo worth sending; bigger ones are downscaled first. */
const MAX_EDGE = 1280;
const MAX_BYTES = 4_000_000;

interface Attachment {
  /** Object URL for the thumbnail. Revoked on removal. */
  preview: string;
  mediaType: "image/jpeg";
  data: string;
}

interface Turn {
  role: "user" | "assistant";
  content: string;
  images?: { preview: string }[];
}

/**
 * Downscale to a sane edge and re-encode as JPEG.
 *
 * A modern phone photo is 3-4 MB and 4000px wide. Sending that raw is slow on
 * a patient's data connection and buys nothing — the assistant is describing
 * what is visible, not measuring it. Also normalises HEIC-ish inputs that the
 * browser can decode but the API will not accept.
 */
async function prepareImage(file: File): Promise<Attachment | null> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  if (base64.length > MAX_BYTES) return null;

  return {
    preview: dataUrl,
    mediaType: "image/jpeg",
    data: base64,
  };
}

export function PatientAssistant() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  /* Keep the newest turn in view. */
  useEffect(() => {
    if (open && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [turns, open, busy]);

  /* Escape closes, like every other dismissible layer in the app. */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const addFiles = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const room = MAX_IMAGES - attachments.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    const prepared = (await Promise.all(picked.map(prepareImage))).filter(
      (item): item is Attachment => item !== null
    );
    if (prepared.length < picked.length) {
      setError("Some photos could not be read. Try a JPEG or PNG.");
    }
    setAttachments((previous) => [...previous, ...prepared]);
  }, [attachments.length]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if ((!text && attachments.length === 0) || busy) return;

    const outgoing: Turn = {
      role: "user",
      content: text,
      images: attachments.map((a) => ({ preview: a.preview })),
    };
    const history = [...turns, outgoing];
    setTurns(history);
    setDraft("");
    const sending = attachments;
    setAttachments([]);
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/patient-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: history.map((turn, index) => ({
            role: turn.role,
            content: turn.content,
            // Images ride only on the turn being sent; earlier previews are
            // local object URLs with no payload behind them.
            ...(index === history.length - 1 && sending.length
              ? {
                  images: sending.map((a) => ({
                    mediaType: a.mediaType,
                    data: a.data,
                  })),
                }
              : {}),
          })),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(
          payload?.error?.message ?? "The assistant could not answer just now."
        );
      }
      setTurns((previous) => [
        ...previous,
        { role: "assistant", content: payload.data.reply },
      ]);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The assistant could not answer just now."
      );
    } finally {
      setBusy(false);
    }
  }, [draft, attachments, busy, turns]);

  return (
    <>
      {/* Launcher. Sits above the bottom bar on a phone so it never covers the
          navigation, and clear of the edge on a desktop. */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ask about my foot health"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-40 flex min-h-[56px] items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-bold text-white shadow-lifted transition-transform duration-150 hover:bg-primary-deep active:scale-95 lg:bottom-6 lg:right-6"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          Ask SoleIQ
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="SoleIQ assistant"
          className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-50 flex max-h-[min(34rem,70vh)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-surface-raised shadow-lifted sm:inset-x-auto sm:right-4 sm:w-[25rem] lg:bottom-6 lg:right-6"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
            <p className="flex items-center gap-2 text-[15px] font-bold text-ink">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              Ask SoleIQ
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-slate-100 hover:text-ink"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          <div
            ref={logRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
            aria-live="polite"
          >
            {turns.length === 0 && (
              <div className="rounded-xl bg-primary-soft px-4 py-3 text-[15px] leading-relaxed text-ink-soft">
                <p className="font-semibold text-ink">
                  Questions about your own foot checks
                </p>
                <p className="mt-1">
                  Ask what a word in your results means, what has changed since
                  your last check, or what to do next. You can add a photo too.
                </p>
                <p className="mt-2 text-[13px]">
                  This is not a diagnosis. For anything urgent, contact your
                  care team.
                </p>
              </div>
            )}

            {turns.map((turn, index) => (
              <div
                key={index}
                className={
                  turn.role === "user"
                    ? "ms-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[15px] leading-relaxed text-white"
                    : "w-fit max-w-[90%] rounded-2xl rounded-bl-md bg-slate-100 px-3.5 py-2.5 text-[15px] leading-relaxed text-ink"
                }
              >
                {turn.images && turn.images.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {turn.images.map((image, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={image.preview}
                        alt="Photo you attached"
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}
                {turn.content && (
                  <p className="whitespace-pre-wrap">{turn.content}</p>
                )}
              </div>
            ))}

            {busy && (
              <p className="flex items-center gap-2 text-[14px] text-ink-faint">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Thinking…
              </p>
            )}
            {error && (
              <p
                role="status"
                className="rounded-xl bg-warn-soft px-3.5 py-2.5 text-[14px] leading-relaxed text-warn"
              >
                {error}
              </p>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-200 px-3 py-3">
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((attachment, index) => (
                  <span key={index} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={attachment.preview}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((previous) =>
                          previous.filter((_, i) => i !== index)
                        )
                      }
                      aria-label={`Remove photo ${index + 1}`}
                      className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(event) => {
                  void addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={attachments.length >= MAX_IMAGES}
                aria-label="Add a photo"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-slate-100 hover:text-ink disabled:opacity-40"
              >
                <ImagePlus className="h-5 w-5" aria-hidden="true" />
              </button>

              <label htmlFor="assistant-draft" className="sr-only">
                Your question
              </label>
              <textarea
                id="assistant-draft"
                rows={1}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                placeholder="Ask about your results…"
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 bg-surface-raised px-3 py-2.5 text-[15px] text-ink outline-none transition-shadow placeholder:text-ink-faint focus:border-primary focus:ring-4 focus:ring-primary-soft"
              />

              <button
                type="button"
                onClick={() => void send()}
                disabled={busy || (!draft.trim() && attachments.length === 0)}
                aria-label="Send"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-deep disabled:opacity-40"
              >
                <Send className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            </div>

            <p className="mt-2 text-[12px] leading-snug text-ink-faint">
              SoleIQ is a wellness monitoring tool and is not a substitute for
              professional medical diagnosis.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
