import Link from "next/link";

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#1E1E2E] bg-[#08080F]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight text-white">
            LeaseUp<span className="text-[#C8102E]">Bulldog</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-gray-400 md:flex">
          <Link href="/features" className="hover:text-white transition-colors">Features</Link>
          <Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link>
          <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/free-trial"
            className="rounded-lg bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A50D25] transition-colors"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </header>
  );
}
