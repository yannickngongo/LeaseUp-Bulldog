"use client";

// Manual SMS reply input for /leads/[id]. When the operator starts typing,
// the AI auto-pauses for this lead so the two don't talk over each other.
// "Resume AI" puts it back in autopilot.

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/demo-auth";

export function ManualReplyBox({
  leadId,
  leadName,
  initialAiPaused,
}: {
  leadId: string;
  leadName: string;
  initialAiPaused: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [aiPaused, setAiPaused] = useState(initialAiPaused);
  const [autoTogglingRef] = useState({ current: false });
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When the operator starts typing, auto-pause the AI so it doesn't
  // race with them. Only fires once per typing session.
  async function handleFirstKeystroke() {
    if (aiPaused || autoTogglingRef.current) return;
    autoTogglingRef.current = true;
    setAiPaused(true);
    try {
      await authFetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_paused: true }),
      });
    } catch (err) {
      console.error("[manual-reply] failed to pause AI:", err);
      setAiPaused(false); // revert optimistic state
    } finally {
      autoTogglingRef.current = false;
    }
  }

  async function toggleAi(paused: boolean) {
    setAiPaused(paused);
    try {
      await authFetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ai_paused: paused }),
      });
      router.refresh();
    } catch (err) {
      console.error("[manual-reply] failed to toggle AI:", err);
      setAiPaused(!paused); // revert
    }
  }

  async function handleSend() {
    const message = text.trim();
    if (!message || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await authFetch("/api/sms/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId, message }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Send failed (${res.status})`);
      }
      setText("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [text]);

  return (
    <div className="mt-4 space-y-2">
      {/* AI status banner */}
      <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          {aiPaused ? (
            <>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              </span>
              <span className="font-medium text-amber-800">AI paused</span>
              <span className="text-gray-500">— Bulldog will not auto-reply to {leadName}</span>
            </>
          ) : (
            <>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              </span>
              <span className="font-medium text-green-800">AI active</span>
              <span className="text-gray-500">— Bulldog handles {leadName} automatically</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => toggleAi(!aiPaused)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            aiPaused
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          {aiPaused ? "Resume AI" : "Pause AI"}
        </button>
      </div>

      {/* Reply box */}
      <div className="rounded-xl border border-gray-200 bg-white focus-within:border-[#C8102E]/40 focus-within:shadow-[0_0_0_3px_rgba(200,16,46,0.08)]">
        <textarea
          ref={textareaRef}
          value={text}
          rows={2}
          placeholder={`Reply to ${leadName} as the leasing agent…`}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.length === 1) handleFirstKeystroke();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="w-full resize-none rounded-xl bg-transparent px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
        />
        <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
          <span className="text-[11px] text-gray-400">
            ⌘ + Enter to send · {text.length}/1600 chars
          </span>
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#C8102E] px-4 py-1.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(200,16,46,0.25)] transition-colors hover:bg-[#A50D25] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
          >
            {sending ? "Sending…" : "Send"}
            {!sending && (
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                <path d="M2 8l12-6-4 14-3-6-5-2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-600">⚠ {error}</p>
      )}
    </div>
  );
}
