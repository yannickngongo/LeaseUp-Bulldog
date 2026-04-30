import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[#C8102E] mb-3">404</p>
        <h1 className="text-3xl font-black mb-3">Page not found</h1>
        <p className="text-sm text-gray-400 leading-relaxed mb-8">
          The page you&apos;re looking for doesn&apos;t exist, or it may have moved. Check the URL or head back to your dashboard.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors"
            style={{ boxShadow: "0 4px 16px rgba(200,16,46,0.25)" }}
          >
            Go to Dashboard →
          </Link>
          <Link
            href="/"
            className="rounded-xl border border-[#1E1E2E] px-5 py-2.5 text-sm font-semibold text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
