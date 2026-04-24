"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppHeader } from "@/components/app/AppHeader";
import { PlatformTour } from "@/components/app/PlatformTour";
import { getOperatorEmail } from "@/lib/demo-auth";

// ─── Welcome / Onboarding Modal ───────────────────────────────────────────────

interface WelcomeModalProps {
  onStartTour: () => void;
}

function WelcomeModal({ onStartTour }: WelcomeModalProps) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("lub_welcome_seen")) return;
    getOperatorEmail().then(email => {
      if (!email) return;
      fetch(`/api/setup?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(d => { setName(d.operator?.name?.split(" ")[0] ?? ""); })
        .catch(() => {});
    });
    setShow(true);
  }, []);

  function dismiss(action: "tour" | "guide" | "skip") {
    localStorage.setItem("lub_welcome_seen", "1");
    setShow(false);
    if (action === "tour")  { onStartTour(); }
    if (action === "guide") { router.push("/getting-started"); }
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#10101A] p-8 shadow-2xl"
        style={{ boxShadow: "0 24px 80px rgba(200,16,46,0.18)" }}>

        {/* Brand mark */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C8102E]/10">
            <svg className="h-5 w-5 text-[#C8102E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8102E]">LeaseUp Bulldog</p>
            <p className="text-xs text-gray-500">Your AI leasing agent is ready</p>
          </div>
        </div>

        <h2 className="mb-2 text-2xl font-black text-white">
          {name ? `Welcome, ${name}!` : "Welcome to LUB!"}
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-gray-400">
          Your AI leasing agent is live and ready to qualify leads 24/7. How would you like to get started?
        </p>

        {/* Options */}
        <div className="mb-5 space-y-3">
          <button
            onClick={() => dismiss("tour")}
            className="group w-full rounded-xl border border-[#C8102E]/30 bg-[#C8102E]/5 p-4 text-left transition-colors hover:bg-[#C8102E]/10"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🗺️</span>
              <div>
                <p className="text-sm font-bold text-white">Take the platform tour</p>
                <p className="text-xs text-gray-400">A quick walkthrough of every section — takes 2 minutes</p>
              </div>
              <svg className="ml-auto h-4 w-4 shrink-0 text-[#C8102E] opacity-0 transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => dismiss("guide")}
            className="group w-full rounded-xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="text-sm font-bold text-white">Go to the setup checklist</p>
                <p className="text-xs text-gray-400">Step-by-step guide to go live in 10 minutes</p>
              </div>
              <svg className="ml-auto h-4 w-4 shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </button>
        </div>

        <button
          onClick={() => dismiss("skip")}
          className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Skip for now — I&apos;ll explore on my own
        </button>
      </div>
    </div>
  );
}

// ─── Co-pilot Chat Widget ─────────────────────────────────────────────────────

interface Message { role: "user" | "assistant"; text: string; }

function CopilotWidget() {
  const [open, setOpen]           = useState(false);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [operatorId, setOperatorId] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getOperatorEmail().then(email => {
      if (!email) return;
      fetch(`/api/setup?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(d => { if (d.operator?.id) setOperatorId(d.operator.id); })
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/copilot", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, operator_id: operatorId }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.answer ?? data.error ?? "Something went wrong." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        data-tour="copilot-btn"
        className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#C8102E] text-white shadow-lg hover:bg-[#A50D25] transition-colors"
        style={{ boxShadow: "0 4px 20px rgba(200,16,46,0.4)" }}
        title="LUB Co-Pilot"
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex w-80 flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1C1F2E]" style={{ height: "420px" }}>
          {/* Header */}
          <div className="flex items-center gap-2.5 rounded-t-2xl border-b border-gray-100 dark:border-white/5 bg-[#C8102E] px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-none">LUB Co-Pilot</p>
              <p className="text-[10px] text-white/70">Ask anything about your portfolio</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-1">Try asking:</p>
                {[
                  "Which property has the worst occupancy?",
                  "Draft a follow-up for a lead who toured yesterday",
                  "What should I do to get to 90% occupancy?",
                ].map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); }}
                    className="w-full text-left rounded-lg border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#C8102E] text-white"
                    : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200"
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl bg-gray-100 dark:bg-white/10 px-3 py-2.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 dark:border-white/5 p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask Co-Pilot…"
                className="flex-1 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-[#C8102E]"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C8102E] text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Human Takeover Alert ─────────────────────────────────────────────────────

function HumanTakeoverBanner() {
  const [alerts, setAlerts]   = useState<{ id: string; leadName: string; propertyName: string; time: string }[]>([]);
  const [operatorId, setOpId] = useState("");
  const seenRef               = useRef<Set<string>>(new Set());

  useEffect(() => {
    getOperatorEmail().then(email => {
      if (!email) return;
      fetch(`/api/setup?email=${encodeURIComponent(email)}`)
        .then(r => r.json())
        .then(d => { if (d.operator?.id) setOpId(d.operator.id); })
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (!operatorId) return;
    async function poll() {
      const res  = await fetch(`/api/activity?operator_id=${operatorId}&limit=20`).catch(() => null);
      if (!res?.ok) return;
      const json = await res.json();
      const items: { id: string; action: string; created_at: string; metadata?: Record<string, unknown> }[] = json.activity ?? [];
      const takeovers = items.filter(a => a.action === "human_takeover" && !seenRef.current.has(a.id));
      if (takeovers.length === 0) return;
      takeovers.forEach(t => seenRef.current.add(t.id));
      setAlerts(prev => [
        ...takeovers.map(t => ({
          id: t.id,
          leadName:     (t.metadata?.lead_name as string) ?? "A lead",
          propertyName: (t.metadata?.property_name as string) ?? "",
          time:         new Date(t.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        })),
        ...prev,
      ].slice(0, 3));
    }
    poll();
    const timer = setInterval(poll, 30_000);
    return () => clearInterval(timer);
  }, [operatorId]);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 max-w-sm">
      {alerts.map(a => (
        <div key={a.id} className="flex items-start gap-3 rounded-xl border border-red-200 bg-white shadow-xl px-4 py-3 dark:border-red-900/40 dark:bg-[#1C1F2E]"
          style={{ boxShadow: "0 8px 32px rgba(200,16,46,0.2)" }}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm dark:bg-red-900/30">👤</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Human Takeover Needed</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {a.leadName}{a.propertyName ? ` · ${a.propertyName}` : ""}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">{a.time}</p>
          </div>
          <button onClick={() => setAlerts(prev => prev.filter(x => x.id !== a.id))}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0">×</button>
        </div>
      ))}
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export function MobileLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tourActive,  setTourActive]  = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA] dark:bg-[#0D0F17]">

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 overflow-hidden lg:relative lg:flex lg:translate-x-0
        transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <AppSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Co-Pilot floating widget */}
      <CopilotWidget />

      {/* Human takeover notifications */}
      <HumanTakeoverBanner />

      {/* First-login welcome modal */}
      <WelcomeModal onStartTour={() => setTourActive(true)} />

      {/* Platform tour */}
      {tourActive && <PlatformTour onFinish={() => setTourActive(false)} />}
    </div>
  );
}
