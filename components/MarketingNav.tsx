"use client";

import Link from "next/link";
import { useState } from "react";

// Single source of truth for the marketing site nav.
// Used on every public page — landing, features, how-it-works, pricing, contact, free-trial, waitlist.
// Match this with the footer to keep the brand cohesive across the site.

const NAV_LINKS = [
  { href: "/product",      label: "Product" },
  { href: "/features",     label: "Features" },
  { href: "/pricing",      label: "Pricing" },
  { href: "/customers", label: "Customers" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#1E1E2E] bg-[#08080F]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-[#C8102E] pulse-dot" />
          <span className="text-lg font-black tracking-tight text-white">
            LeaseUp <span className="text-[#C8102E]">Bulldog</span>
          </span>
        </Link>

        {/* Desktop links */}
        <nav className="hidden items-center gap-8 text-sm font-medium md:flex" style={{ color: "#C9D1CD" }}>
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white transition-colors">
              {l.label}
            </Link>
          ))}
          <Link href="/login" className="hover:text-white transition-colors">Log in</Link>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center">
          <Link
            href="/waitlist"
            className="rounded-full bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white transition-all hover:scale-105"
            style={{ boxShadow: "0 0 25px rgba(200,16,46,0.5)" }}
          >
            Get Started →
          </Link>
        </div>

        {/* Mobile: Log In + hamburger */}
        <div className="flex items-center gap-3 md:hidden">
          <Link href="/login" className="text-sm text-gray-300 hover:text-white transition-colors">Log in</Link>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1E1E2E] text-gray-300 hover:text-white transition-colors"
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
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-3 pt-3 border-t border-[#1E1E2E]">
              <Link
                href="/waitlist"
                onClick={() => setOpen(false)}
                className="block w-full rounded-full bg-[#C8102E] px-4 py-3 text-center text-sm font-bold text-white transition-all"
                style={{ boxShadow: "0 0 25px rgba(200,16,46,0.5)" }}
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
