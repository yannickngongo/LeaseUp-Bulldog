import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#1E1E2E] bg-[#08080F] px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <span className="text-xl font-black tracking-tight text-white">
              LeaseUp<span className="text-[#C8102E]">Bulldog</span>
            </span>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              AI-powered lead management for multifamily operators. Respond in under 60 seconds, every time.
            </p>
          </div>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Product</p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
              <li><Link href="/free-trial" className="hover:text-white transition-colors">Free Trial</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Company</p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Get Started</p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/signup" className="hover:text-white transition-colors">Create Account</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Log In</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-[#1E1E2E] pt-8 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} LeaseUp Bulldog. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
