import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#1E1E2E] bg-[#08080F] px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-5">

          {/* Brand block */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[#C8102E] animate-pulse" />
              <span className="text-xl font-black tracking-tight text-white">
                LeaseUp<span className="text-[#C8102E]">Bulldog</span>
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-400">
              AI leasing automation for multifamily operators. Respond in under 60 seconds, qualify automatically, fill units faster.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link
                href="/waitlist"
                className="inline-flex items-center gap-2 rounded-full bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white transition-all hover:scale-105"
                style={{ boxShadow: "0 0 25px rgba(200,16,46,0.5)" }}
              >
                Join the Waitlist →
              </Link>
            </div>
          </div>

          {/* Link columns */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white">Product</p>
            <ul className="space-y-2.5 text-sm text-gray-400">
              <li><Link href="/product" className="hover:text-white transition-colors">Plans</Link></li>
              <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/free-trial" className="hover:text-white transition-colors">Free Trial</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white">Company</p>
            <ul className="space-y-2.5 text-sm text-gray-400">
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><Link href="/waitlist" className="hover:text-white transition-colors">Waitlist</Link></li>
              <li><a href="mailto:support@leaseupbulldog.com" className="hover:text-white transition-colors">Support</a></li>
            </ul>
          </div>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white">Legal</p>
            <ul className="space-y-2.5 text-sm text-gray-400">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Log In</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col-reverse gap-4 border-t border-[#1E1E2E] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-gray-500" style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
            © {new Date().getFullYear()} LeaseUp Bulldog · 880 Union Station Prkwy · Lewisville, TX
          </p>
          <p className="text-xs text-gray-600" style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}>
            Built for multifamily operators
          </p>
        </div>
      </div>
    </footer>
  );
}
