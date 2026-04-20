"use client";

import Link from "next/link";
import { useState } from "react";

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#1E1E2E] bg-[#08080F]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tight text-white">
            LeaseUp<span className="text-[#C8102E]">Bulldog</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 text-sm text-gray-400 md:flex">
          <Link href="/#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="/#how-it-works" className="hover:text-white transition-colors">How It Works</Link>
          <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Log In</Link>
          <Link href="/signup" className="rounded-lg bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A50D25] transition-colors">
            Get Started
          </Link>
        </div>

        {/* Mobile: Log In + hamburger */}
        <div className="flex items-center gap-3 md:hidden">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Log In</Link>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1E1E2E] text-gray-400 hover:text-white transition-colors"
            aria-label="Menu"
          >
            {open ? (
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M2 2l14 14M16 2L2 16" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M2 4.5h14M2 9h14M2 13.5h14" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-[#1E1E2E] bg-[#10101A] px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {[
              { href: "/#features",    label: "Features" },
              { href: "/#how-it-works", label: "How It Works" },
              { href: "/#pricing",     label: "Pricing" },
            ].map(l => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-3 pt-3 border-t border-[#1E1E2E]">
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="block w-full rounded-xl bg-[#C8102E] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[#A50D25] transition-colors"
              >
                Get Started →
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
