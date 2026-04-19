import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans flex flex-col">
      <header className="border-b border-[#1E1E2E] px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight">
            LeaseUp<span className="text-[#C8102E]">Bulldog</span>
          </Link>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="relative w-full max-w-xl text-center">
          <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-[#C8102E]/10 blur-[100px]" />

          <div className="relative">
            {/* Success icon */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10">
              <svg className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="mb-3 text-4xl font-black">You&apos;re in. Let&apos;s go.</h1>
            <p className="mb-8 text-gray-400 leading-relaxed">
              Your 14-day free trial is active. Your account is ready — let&apos;s set up your first property and get your AI agent live in minutes.
            </p>

            {/* Steps */}
            <div className="mb-10 rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-6 text-left space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">What happens next</p>
              {[
                { step: "1", title: "Add your first property", desc: "Name it, add the address, and we'll assign a Twilio phone number instantly." },
                { step: "2", title: "Send a test lead", desc: "Text your new property number — watch the AI respond in under 60 seconds." },
                { step: "3", title: "Connect your lead sources", desc: "Point Zillow, Apartments.com, or your website to route leads into Bulldog." },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/20 text-xs font-bold text-[#C8102E]">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto rounded-xl bg-[#C8102E] px-8 py-4 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors shadow-lg shadow-[#C8102E]/25"
              >
                Go to Dashboard →
              </Link>
              <Link
                href="/how-it-works"
                className="w-full sm:w-auto rounded-xl border border-[#1E1E2E] px-8 py-4 text-sm font-semibold text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
              >
                Setup Guide
              </Link>
            </div>

            <p className="mt-8 text-xs text-gray-600">
              Confirmation sent to your email · Trial ends in 14 days · No charge until then
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
