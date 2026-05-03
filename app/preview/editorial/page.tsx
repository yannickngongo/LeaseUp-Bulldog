import Link from "next/link";

// PREVIEW: Direction A — Editorial / real-estate-magazine
// Cream + navy + LUB red. Serif display, clean sans body. Asymmetric. Photography-driven.

export const metadata = { title: "LeaseUp Bulldog — Editorial Preview" };

const HEADLINE_FONT = "'Tiempos Headline', 'Source Serif 4', 'Georgia', serif";
const BODY_FONT = "'Inter', system-ui, sans-serif";

export default function EditorialPreview() {
  return (
    <div style={{ background: "#F4EFE6", color: "#1A2740", fontFamily: BODY_FONT }} className="min-h-screen">

      {/* Google Fonts loader for preview */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,700&display=swap"
        rel="stylesheet"
      />

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="border-b border-[#1A2740]/15 px-8 py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight" style={{ color: "#1A2740" }}>
            LeaseUp<span style={{ color: "#C8102E" }}>Bulldog</span>
          </Link>
          <div className="hidden items-center gap-10 text-sm font-medium md:flex" style={{ color: "#1A2740" }}>
            <Link href="/how-it-works" className="hover:opacity-60 transition-opacity">How it works</Link>
            <Link href="/features" className="hover:opacity-60 transition-opacity">Features</Link>
            <Link href="/pricing" className="hover:opacity-60 transition-opacity">Pricing</Link>
            <Link href="/login" className="hover:opacity-60 transition-opacity">Log in</Link>
          </div>
          <Link
            href="/waitlist"
            className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "#C8102E" }}
          >
            Get access
          </Link>
        </div>
      </nav>

      {/* ── Hero (asymmetric editorial) ─────────────────────────────────────── */}
      <section className="px-8 pt-24 pb-32">
        <div className="mx-auto max-w-7xl">

          {/* Eyebrow */}
          <div className="mb-12 flex items-center gap-4">
            <span className="h-px w-16" style={{ background: "#1A2740" }} />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Issue 01 — The Lease-Up Quarterly</span>
          </div>

          <div className="grid grid-cols-12 gap-8">
            {/* Headline */}
            <div className="col-span-12 lg:col-span-8">
              <h1
                className="mb-10 leading-[0.95] tracking-tight"
                style={{ fontFamily: HEADLINE_FONT, fontSize: "clamp(3rem, 7vw, 7rem)", fontWeight: 500 }}
              >
                Every lead,
                <br />
                <em style={{ fontStyle: "italic", color: "#C8102E" }}>answered.</em>
                <br />
                Every time.
              </h1>
            </div>

            {/* Aside */}
            <div className="col-span-12 lg:col-span-4 lg:pt-8">
              <p className="text-lg leading-relaxed" style={{ color: "#3D4A5F" }}>
                Built for the operator who is tired of losing the 8&nbsp;p.m. lead to the
                competitor who replied first. LeaseUp Bulldog is the AI leasing agent that
                works the hours you can&apos;t.
              </p>
              <div className="mt-8 flex items-center gap-6">
                <Link
                  href="/waitlist"
                  className="rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: "#1A2740" }}
                >
                  Request access →
                </Link>
                <Link href="/how-it-works" className="text-sm font-semibold underline underline-offset-4">
                  Read the field guide
                </Link>
              </div>
            </div>
          </div>

          {/* Editorial photo + caption */}
          <figure className="mt-24">
            <div
              className="aspect-[16/8] w-full overflow-hidden rounded-sm"
              style={{
                background: "linear-gradient(135deg, #2A3D5F 0%, #1A2740 50%, #0F1828 100%)",
                position: "relative",
              }}
            >
              <img
                src="https://placehold.co/1600x800/1A2740/F4EFE6?text=Apartment+interior+at+golden+hour&font=source-serif-pro"
                alt="Apartment interior, golden hour"
                className="h-full w-full object-cover opacity-90"
                style={{ mixBlendMode: "multiply" }}
              />
            </div>
            <figcaption className="mt-4 flex items-baseline justify-between text-sm" style={{ color: "#3D4A5F" }}>
              <span style={{ fontStyle: "italic", fontFamily: HEADLINE_FONT }}>
                A vacant unit costs the average operator $73 per day.
              </span>
              <span className="text-xs uppercase tracking-widest">Photo: Internal data, 2026</span>
            </figcaption>
          </figure>

        </div>
      </section>

      {/* ── Three column editorial: the workflow as story ───────────────────── */}
      <section className="border-t border-[#1A2740]/15 px-8 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="mb-20 flex items-end justify-between">
            <h2
              className="max-w-2xl leading-[1.05] tracking-tight"
              style={{ fontFamily: HEADLINE_FONT, fontSize: "clamp(2rem, 4vw, 3.75rem)", fontWeight: 500 }}
            >
              How a lead becomes a lease, in three acts.
            </h2>
            <span className="hidden text-xs uppercase tracking-[0.2em] md:block" style={{ color: "#3D4A5F" }}>
              Pages 4–11
            </span>
          </div>

          <div className="grid gap-16 md:grid-cols-3">
            {[
              {
                num: "I.",
                title: "The reply",
                body: "A prospect inquires on Zillow at 9:14 p.m. By 9:14 and 47 seconds, the AI has answered with a personalized message that references their move-in date, their budget, and the unit they were viewing.",
              },
              {
                num: "II.",
                title: "The qualification",
                body: "Across two or three messages, the AI confirms the three things every leasing agent needs to know: when, what, how much. Bad-fit leads are politely set aside. Good-fit leads are prioritized for tour booking.",
              },
              {
                num: "III.",
                title: "The handoff",
                body: "When the prospect agrees to a tour, the AI books a calendar slot, sends a reminder, and notifies your team. The conversation history is one click away. You walk into the tour already knowing them.",
              },
            ].map((act) => (
              <article key={act.num}>
                <div
                  className="mb-6 text-3xl"
                  style={{ fontFamily: HEADLINE_FONT, fontStyle: "italic", color: "#C8102E", fontWeight: 500 }}
                >
                  {act.num}
                </div>
                <h3
                  className="mb-4 text-2xl leading-tight"
                  style={{ fontFamily: HEADLINE_FONT, fontWeight: 600 }}
                >
                  {act.title}
                </h3>
                <p className="text-base leading-[1.8]" style={{ color: "#3D4A5F" }}>
                  {act.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pull quote ──────────────────────────────────────────────────────── */}
      <section className="px-8 py-32" style={{ background: "#1A2740", color: "#F4EFE6" }}>
        <div className="mx-auto max-w-5xl">
          <blockquote
            className="text-balance text-center leading-[1.15]"
            style={{ fontFamily: HEADLINE_FONT, fontSize: "clamp(2rem, 5vw, 4.5rem)", fontWeight: 500 }}
          >
            <span style={{ color: "#C8102E", fontStyle: "italic" }}>&ldquo;</span>
            We were losing forty percent of after-hours leads. Now we lose none. The math is
            embarrassingly good.
            <span style={{ color: "#C8102E", fontStyle: "italic" }}>&rdquo;</span>
          </blockquote>
          <div className="mt-12 text-center text-sm uppercase tracking-[0.2em]" style={{ color: "#C9A876" }}>
            Operator, 280 units · Dallas, TX
          </div>
        </div>
      </section>

      {/* ── Closing / CTA ───────────────────────────────────────────────────── */}
      <section className="px-8 py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-7">
              <h2
                className="mb-8 leading-[0.95] tracking-tight"
                style={{ fontFamily: HEADLINE_FONT, fontSize: "clamp(2.5rem, 6vw, 5.5rem)", fontWeight: 500 }}
              >
                The next lease<br />you sign should not<br />
                <em style={{ color: "#C8102E", fontStyle: "italic" }}>require you.</em>
              </h2>
            </div>
            <div className="col-span-12 lg:col-span-5 lg:pt-12">
              <p className="mb-8 text-lg leading-relaxed" style={{ color: "#3D4A5F" }}>
                A 14-day trial. No credit card. We will set up your first property with you on a
                15-minute call.
              </p>
              <Link
                href="/waitlist"
                className="inline-flex items-center gap-3 rounded-full px-8 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "#C8102E" }}
              >
                Begin your subscription <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#1A2740]/15 px-8 py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-baseline md:justify-between">
          <div className="text-xl font-black tracking-tight" style={{ color: "#1A2740" }}>
            LeaseUp<span style={{ color: "#C8102E" }}>Bulldog</span>
          </div>
          <div className="text-xs uppercase tracking-[0.2em]" style={{ color: "#3D4A5F" }}>
            © 2026 · Lewisville, TX · An imprint of LeaseUp Bulldog
          </div>
        </div>
      </footer>

    </div>
  );
}
