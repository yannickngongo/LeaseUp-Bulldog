// Terms of Service — renders Termly-generated HTML from public/terms-content.html.
// To update: regenerate in Termly → copy HTML → replace public/terms-content.html → commit.

import Link from "next/link";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const metadata = { title: "Terms of Service | LeaseUp Bulldog" };

function getTermsHtml(): string {
  try {
    return readFileSync(join(process.cwd(), "public", "terms-content.html"), "utf8");
  } catch {
    // Fallback if the file is missing — shows a friendly placeholder rather than crashing
    return "<p>Terms are being updated. Please check back shortly or email <a href='mailto:support@leaseupbulldog.com'>support@leaseupbulldog.com</a>.</p>";
  }
}

export default function TermsPage() {
  const html = getTermsHtml();

  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans">
      <header className="border-b border-[#1E1E2E] px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight">
            LeaseUp<span className="text-[#C8102E]">Bulldog</span>
          </Link>
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Log in</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        {/* Termly-generated HTML rendered inside a white reading card.
            The Termly content brings its own <style> block + custom-class attributes. */}
        <div className="bg-white text-gray-800 rounded-2xl shadow-xl p-8 sm:p-12">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Questions? <a href="mailto:support@leaseupbulldog.com" className="text-[#C8102E] hover:underline">support@leaseupbulldog.com</a>
        </p>
      </main>
    </div>
  );
}
