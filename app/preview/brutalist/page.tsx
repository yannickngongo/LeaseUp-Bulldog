import Link from "next/link";

// PREVIEW: Direction B — Brutalist / 37signals
// White + black + LUB red. Massive Inter. Hard edges, thick borders, no shadows.

export const metadata = { title: "LeaseUp Bulldog — Brutalist Preview" };

const SANS = "'Inter Tight', 'Inter', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

export default function BrutalistPreview() {
  return (
    <div style={{ background: "#FFFFFF", color: "#000000", fontFamily: SANS }} className="min-h-screen">

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap"
        rel="stylesheet"
      />

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight">
            LeaseUp<span style={{ color: "#C8102E" }}>Bulldog</span>
          </Link>
          <div className="hidden items-center gap-1 text-sm font-bold uppercase md:flex">
            {["How it works", "Features", "Pricing", "Log in"].map((label, i) => (
              <Link
                key={label}
                href={`/${["how-it-works", "features", "pricing", "login"][i]}`}
                className="border-r-2 border-black px-4 py-1 last:border-r-0 hover:bg-black hover:text-white"
              >
                {label}
              </Link>
            ))}
          </div>
          <Link
            href="/waitlist"
            className="border-2 border-black px-5 py-2 text-sm font-black uppercase hover:bg-black hover:text-white"
          >
            Get access ↗
          </Link>
        </div>
      </nav>

      {/* ── Marquee ─────────────────────────────────────────────────────────── */}
      <div className="overflow-hidden border-b-2 border-black py-2" style={{ background: "#C8102E" }}>
        <div
          className="whitespace-nowrap text-sm font-bold uppercase tracking-wider text-white"
          style={{ animation: "marquee 30s linear infinite" }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="mx-8">
              ★ Replies in 60 seconds &nbsp;·&nbsp; Built for multifamily &nbsp;·&nbsp; No setup fees &nbsp;·&nbsp; Cancel any time
            </span>
          ))}
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0%); } to { transform: translateX(-50%); } }`}</style>
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="border-b-2 border-black px-6 py-16">
        <div className="mx-auto max-w-[1400px]">

          <div className="mb-8 flex items-baseline gap-3 text-xs font-bold uppercase tracking-widest" style={{ fontFamily: MONO }}>
            <span style={{ color: "#C8102E" }}>●</span>
            <span>v1.0 — shipping to operators now</span>
          </div>

          <h1
            className="font-black uppercase leading-[0.85] tracking-[-0.04em]"
            style={{ fontSize: "clamp(3.5rem, 12vw, 11rem)", fontFamily: SANS, fontWeight: 900 }}
          >
            Stop losing<br />
            <span style={{ color: "#C8102E" }}>$73/day</span><br />
            per empty unit.
          </h1>

          <div className="mt-12 grid grid-cols-12 gap-6 border-t-2 border-black pt-12">
            <div className="col-span-12 md:col-span-7">
              <p className="text-2xl font-medium leading-tight md:text-3xl">
                LeaseUp Bulldog is the AI leasing agent that answers every inquiry in under 60
                seconds, qualifies prospects, and books tours — while you sleep, eat, or do
                literally anything else.
              </p>
            </div>
            <div className="col-span-12 md:col-span-5 md:border-l-2 md:border-black md:pl-6">
              <div className="flex flex-col gap-3">
                <Link
                  href="/waitlist"
                  className="block border-2 border-black bg-black px-6 py-5 text-center text-base font-black uppercase text-white hover:bg-white hover:text-black"
                >
                  Get access →
                </Link>
                <Link
                  href="/how-it-works"
                  className="block border-2 border-black px-6 py-5 text-center text-base font-black uppercase hover:bg-black hover:text-white"
                >
                  See it work
                </Link>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest" style={{ fontFamily: MONO }}>
                  → 14 day trial · no card · cancel any time
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Data table ──────────────────────────────────────────────────────── */}
      <section className="border-b-2 border-black px-6 py-16">
        <div className="mx-auto max-w-[1400px]">
          <h2 className="mb-10 text-3xl font-black uppercase tracking-tight md:text-5xl">
            The numbers, with no rounding.
          </h2>

          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="py-4 pr-4 text-left text-xs font-bold uppercase tracking-widest" style={{ fontFamily: MONO }}>Metric</th>
                <th className="py-4 px-4 text-left text-xs font-bold uppercase tracking-widest" style={{ fontFamily: MONO }}>Without Bulldog</th>
                <th className="py-4 px-4 text-left text-xs font-bold uppercase tracking-widest" style={{ fontFamily: MONO }}>With Bulldog</th>
                <th className="py-4 pl-4 text-right text-xs font-bold uppercase tracking-widest" style={{ fontFamily: MONO }}>Δ</th>
              </tr>
            </thead>
            <tbody>
              {[
                { metric: "First-reply time", before: "4 hr 12 min", after: "47 seconds", delta: "−99%" },
                { metric: "Lead coverage (incl. nights/weekends)", before: "62%", after: "100%", delta: "+38pp" },
                { metric: "Tours booked / 100 leads", before: "11", after: "31", delta: "+182%" },
                { metric: "Days a unit sits vacant", before: "47", after: "29", delta: "−18 days" },
                { metric: "Cost to your team", before: "1.5 FTE", after: "0", delta: "−$72k/yr" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-black/30 hover:bg-yellow-100">
                  <td className="py-5 pr-4 text-base font-bold">{row.metric}</td>
                  <td className="py-5 px-4 text-base font-medium text-black/60">{row.before}</td>
                  <td className="py-5 px-4 text-base font-bold">{row.after}</td>
                  <td
                    className="py-5 pl-4 text-right text-base font-black"
                    style={{ color: "#C8102E", fontFamily: MONO }}
                  >
                    {row.delta}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Pull quote ──────────────────────────────────────────────────────── */}
      <section className="border-b-2 border-black px-6 py-24" style={{ background: "#000000", color: "#FFFFFF" }}>
        <div className="mx-auto max-w-[1400px]">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-1 text-7xl font-black leading-none" style={{ color: "#C8102E", fontFamily: SANS }}>“</div>
            <div className="col-span-12 md:col-span-11">
              <blockquote
                className="font-black uppercase leading-[0.9] tracking-[-0.03em]"
                style={{ fontSize: "clamp(2rem, 5vw, 4.5rem)", fontFamily: SANS }}
              >
                We were losing forty percent of after-hours leads.<br />
                Now we lose zero.
              </blockquote>
              <div className="mt-8 flex items-center gap-4 text-xs font-bold uppercase tracking-widest" style={{ fontFamily: MONO }}>
                <span style={{ color: "#C8102E" }}>―</span>
                <span>Operator, 280 units, Dallas TX</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Three principles ────────────────────────────────────────────────── */}
      <section className="border-b-2 border-black px-6 py-16">
        <div className="mx-auto max-w-[1400px]">
          <h2 className="mb-12 text-3xl font-black uppercase tracking-tight md:text-5xl">
            Three things we believe.
          </h2>
          <div className="grid grid-cols-1 divide-y-2 divide-black border-2 border-black md:grid-cols-3 md:divide-x-2 md:divide-y-0">
            {[
              {
                num: "01",
                title: "Speed beats polish.",
                body: "An okay reply in 60 seconds beats a great reply in 6 hours. Every time. The lead has already moved on.",
              },
                            {
                num: "02",
                title: "AI is the floor, not the ceiling.",
                body: "Our AI handles the first three rounds. Your team handles the close. Hand-offs are surgical, not awkward.",
              },
              {
                num: "03",
                title: "Bill on outcomes.",
                body: "Subscription covers the platform. Performance fees only fire when a lease signs. Skin in the game.",
              },
            ].map((p) => (
              <div key={p.num} className="p-8">
                <div className="mb-6 text-xs font-bold uppercase tracking-widest" style={{ fontFamily: MONO, color: "#C8102E" }}>
                  No. {p.num}
                </div>
                <h3 className="mb-4 text-2xl font-black uppercase leading-tight">{p.title}</h3>
                <p className="text-base leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="border-b-2 border-black px-6 py-32" style={{ background: "#C8102E", color: "#FFFFFF" }}>
        <div className="mx-auto max-w-[1400px]">
          <h2
            className="mb-12 font-black uppercase leading-[0.85] tracking-[-0.04em]"
            style={{ fontSize: "clamp(3rem, 10vw, 9rem)", fontFamily: SANS }}
          >
            Stop reading.<br />
            Start filling units.
          </h2>
          <Link
            href="/waitlist"
            className="inline-block border-2 border-white bg-white px-10 py-6 text-lg font-black uppercase text-black hover:bg-black hover:text-white"
          >
            Get access →
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="px-6 py-8">
        <div className="mx-auto flex max-w-[1400px] items-baseline justify-between">
          <div className="text-xl font-black tracking-tight">
            LeaseUp<span style={{ color: "#C8102E" }}>Bulldog</span>
          </div>
          <div className="text-xs font-bold uppercase tracking-widest" style={{ fontFamily: MONO }}>
            © 2026 · Lewisville, TX · v1.0.0
          </div>
        </div>
      </footer>

    </div>
  );
}
