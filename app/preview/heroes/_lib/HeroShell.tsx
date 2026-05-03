import Link from "next/link";
import type { ReactNode } from "react";

// Shared hero shell — same nav, title, CTAs across all 5 hero animation variants.
// `background` is the animation component (rendered absolutely behind the title).

const RED = "#C8102E";
const RED_LIGHT = "#F87171";
const BG = "#08080F";
const SURFACE = "#10101A";
const BORDER = "#1E1E2E";

export function HeroShell({ background, label }: { background: ReactNode; label: string }) {
  return (
    <div style={{ background: BG, color: "#FFFFFF" }} className="min-h-screen">

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />

      <style>{`
        :root { --red: ${RED}; --red-light: ${RED_LIGHT}; }
        body { font-family: 'Inter', system-ui, sans-serif; }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; box-shadow: 0 0 0 0 ${RED}80; } 50% { opacity: 0.7; box-shadow: 0 0 0 6px ${RED}00; } }
        .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
      `}</style>

      {/* Nav */}
      <nav className="relative z-50 border-b px-6 py-4" style={{ borderColor: BORDER, background: `${BG}EE`, backdropFilter: "blur(12px)" }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-black tracking-tight">
            <span className="inline-block h-2 w-2 rounded-full pulse-dot" style={{ background: RED }} />
            LeaseUp<span style={{ color: RED }}>Bulldog</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium md:flex" style={{ color: "#C9D1CD" }}>
            <Link href="/how-it-works" className="hover:text-white transition-colors">Product</Link>
            <Link href="/features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/login" className="hover:text-white transition-colors">Log in</Link>
          </div>
          <Link
            href="/waitlist"
            className="rounded-full px-5 py-2.5 text-sm font-bold text-white transition-all hover:scale-105"
            style={{ background: RED, boxShadow: `0 0 25px ${RED}60` }}
          >
            Get Started →
          </Link>
        </div>
      </nav>

      {/* Variant label (small badge top-right of hero so user knows which one they're on) */}
      <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em]" style={{ borderColor: BORDER, background: `${BG}DD`, color: "#9CA3AF", backdropFilter: "blur(8px)" }}>
        Variant {label}
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-32">

        {/* Animation layer — sits behind everything */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
          {background}
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto flex min-h-[560px] max-w-5xl flex-col items-center justify-center text-center sm:min-h-[620px]">

          <div
            className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{ borderColor: `${RED}40`, background: `${RED}10`, color: RED_LIGHT, backdropFilter: "blur(8px)" }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full pulse-dot" style={{ background: RED }} />
            AI Leasing Automation
          </div>

          <h1
            className="mb-6 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl md:text-7xl lg:text-[88px]"
            style={{ textShadow: `0 2px 24px rgba(0,0,0,0.85), 0 0 60px rgba(0,0,0,0.6)` }}
          >
            AI Leasing<br />
            <span style={{ color: RED }}>Automation</span><br />
            for Multifamily.
          </h1>

          <p
            className="mx-auto mb-10 max-w-2xl text-base font-medium leading-relaxed sm:text-lg"
            style={{ color: "#E5E7EB", textShadow: `0 2px 16px rgba(0,0,0,0.85)` }}
          >
            LeaseUp Bulldog replies to every lead in under 60 seconds, qualifies them with AI,
            books tours automatically — so your portfolio fills itself.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/waitlist"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white transition-all hover:scale-105 sm:w-auto"
              style={{ background: RED, boxShadow: `0 0 40px ${RED}80` }}
            >
              Start Free Trial
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border px-8 py-4 text-base font-semibold text-white transition-colors hover:border-white sm:w-auto"
              style={{ borderColor: BORDER, background: `${SURFACE}CC`, backdropFilter: "blur(8px)" }}
            >
              See It Work
            </Link>
          </div>
        </div>
      </section>

      {/* Compare-bar at the bottom — quick switch between variants */}
      <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border px-2 py-1.5 text-xs font-semibold" style={{ borderColor: BORDER, background: `${BG}DD`, backdropFilter: "blur(12px)" }}>
        <div className="flex items-center gap-1">
          {[
            { id: "skyline", label: "A · Skyline" },
            { id: "building", label: "B · Building" },
            { id: "floorplan", label: "C · Floor plan" },
            { id: "pipeline", label: "D · Pipeline" },
            { id: "facade", label: "E · Facade" },
          ].map((v) => (
            <Link
              key={v.id}
              href={`/preview/heroes/${v.id}`}
              className={`rounded-full px-3 py-1.5 transition-colors ${v.id === labelToId(label) ? "text-white" : ""}`}
              style={v.id === labelToId(label) ? { background: RED } : { color: "#9CA3AF" }}
            >
              {v.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function labelToId(label: string) {
  return label.toLowerCase().replace(/^[a-z] · /, "");
}
