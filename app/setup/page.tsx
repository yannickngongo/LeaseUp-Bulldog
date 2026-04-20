"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveOperatorEmail } from "@/lib/demo-auth";

type Step = "account" | "property" | "webhook" | "done";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [account, setAccount] = useState({ name: "", email: "" });
  const [property, setProperty] = useState({
    name: "", address: "", city: "", state: "", zip: "",
    phoneNumber: "", activeSpecial: "", websiteUrl: "",
    totalUnits: "", tourBookingUrl: "",
  });
  const [createdProperty, setCreatedProperty] = useState<{ id: string; name: string; phone_number: string } | null>(null);

  async function handleAccountNext() {
    if (!account.name || !account.email) return;
    setStep("property");
  }

  async function handlePropertySubmit() {
    setLoading(true);
    setError(null);

    const email = account.email;

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorName:    account.name,
          email,
          propertyName:    property.name,
          address:         property.address,
          city:            property.city,
          state:           property.state,
          zip:             property.zip,
          phoneNumber:     property.phoneNumber,
          activeSpecial:   property.activeSpecial,
          websiteUrl:      property.websiteUrl,
          totalUnits:      property.totalUnits,
          tourBookingUrl:  property.tourBookingUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setLoading(false);
        return;
      }

      saveOperatorEmail(email);
      setCreatedProperty(data.property);
      setStep("webhook");
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/twilio/inbound`
    : "/api/twilio/inbound";

  return (
    <div className="min-h-screen bg-[#08080F] text-white font-sans">
      {/* Header */}
      <header className="border-b border-[#1E1E2E] px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight">
            LeaseUp<span className="text-[#C8102E]">Bulldog</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
            Skip to dashboard →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-12">

        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            {(["account", "property", "webhook", "done"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  s === step ? "bg-[#C8102E] text-white"
                  : ["account","property","webhook","done"].indexOf(s) < ["account","property","webhook","done"].indexOf(step)
                    ? "bg-green-500 text-white"
                    : "bg-[#1E1E2E] text-gray-500"
                }`}>
                  {["account","property","webhook","done"].indexOf(s) < ["account","property","webhook","done"].indexOf(step) ? "✓" : i + 1}
                </div>
                {i < 3 && <div className={`h-px w-8 sm:w-16 ${["account","property","webhook","done"].indexOf(s) < ["account","property","webhook","done"].indexOf(step) ? "bg-green-500" : "bg-[#1E1E2E]"}`} />}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            {step === "account" && "Step 1 of 3 — Your account"}
            {step === "property" && "Step 2 of 3 — Your first property"}
            {step === "webhook" && "Step 3 of 3 — Connect Twilio"}
            {step === "done" && "You're live!"}
          </p>
        </div>

        {/* ── Step 1: Account ── */}
        {step === "account" && (
          <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-8">
            <h1 className="text-2xl font-black mb-2">Welcome to LeaseUp Bulldog</h1>
            <p className="text-gray-400 text-sm mb-8">Let's get your account set up. This takes about 3 minutes.</p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Your Name *</label>
                <input
                  value={account.name}
                  onChange={e => setAccount(a => ({ ...a, name: e.target.value }))}
                  placeholder="Marcus Thompson"
                  className="w-full rounded-xl border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email Address *</label>
                <input
                  type="email"
                  value={account.email}
                  onChange={e => setAccount(a => ({ ...a, email: e.target.value }))}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                />
                <p className="mt-1.5 text-xs text-gray-600">We'll use this to link your account</p>
              </div>
            </div>

            <button
              onClick={handleAccountNext}
              disabled={!account.name || !account.email}
              className="mt-8 w-full rounded-xl bg-[#C8102E] py-3.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors"
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── Step 2: Property ── */}
        {step === "property" && (
          <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-8">
            <h1 className="text-2xl font-black mb-2">Add your first property</h1>
            <p className="text-gray-400 text-sm mb-8">This is the property Bulldog will manage leads for.</p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Property Name *</label>
                <input
                  value={property.name}
                  onChange={e => setProperty(p => ({ ...p, name: e.target.value }))}
                  placeholder="The Monroe Apartments"
                  className="w-full rounded-xl border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Street Address *</label>
                <input
                  value={property.address}
                  onChange={e => setProperty(p => ({ ...p, address: e.target.value }))}
                  placeholder="1234 Main Street"
                  className="w-full rounded-xl border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">City *</label>
                  <input
                    value={property.city}
                    onChange={e => setProperty(p => ({ ...p, city: e.target.value }))}
                    placeholder="Las Vegas"
                    className="w-full rounded-xl border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">State *</label>
                  <input
                    value={property.state}
                    onChange={e => setProperty(p => ({ ...p, state: e.target.value }))}
                    placeholder="NV"
                    maxLength={2}
                    className="w-full rounded-xl border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">ZIP *</label>
                  <input
                    value={property.zip}
                    onChange={e => setProperty(p => ({ ...p, zip: e.target.value }))}
                    placeholder="89101"
                    className="w-full rounded-xl border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Twilio Phone Number *</label>
                <input
                  value={property.phoneNumber}
                  onChange={e => setProperty(p => ({ ...p, phoneNumber: e.target.value }))}
                  placeholder="+17025551234"
                  className="w-full rounded-xl border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                />
                <p className="mt-1.5 text-xs text-gray-600">The Twilio number you bought — format: +1XXXXXXXXXX</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Current Special Offer <span className="text-gray-600 font-normal">(optional)</span></label>
                <input
                  value={property.activeSpecial}
                  onChange={e => setProperty(p => ({ ...p, activeSpecial: e.target.value }))}
                  placeholder="1 month free on 12-month leases"
                  className="w-full rounded-xl border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                />
                <p className="mt-1.5 text-xs text-gray-600">The AI will mention this in every conversation</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Property Website <span className="text-gray-600 font-normal">(optional)</span></label>
                <input
                  value={property.websiteUrl}
                  onChange={e => setProperty(p => ({ ...p, websiteUrl: e.target.value }))}
                  placeholder="https://themonroe.com"
                  className="w-full rounded-xl border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Total Units <span className="text-gray-600 font-normal">(optional)</span></label>
                  <input
                    type="number"
                    value={property.totalUnits}
                    onChange={e => setProperty(p => ({ ...p, totalUnits: e.target.value }))}
                    placeholder="120"
                    className="w-full rounded-xl border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Tour Booking URL <span className="text-gray-600 font-normal">(optional)</span></label>
                  <input
                    value={property.tourBookingUrl}
                    onChange={e => setProperty(p => ({ ...p, tourBookingUrl: e.target.value }))}
                    placeholder="https://calendly.com/..."
                    className="w-full rounded-xl border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-5 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setStep("account")}
                className="rounded-xl border border-[#1E1E2E] px-5 py-3.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handlePropertySubmit}
                disabled={loading || !property.name || !property.address || !property.city || !property.state || !property.zip || !property.phoneNumber}
                className="flex-1 rounded-xl bg-[#C8102E] py-3.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors"
              >
                {loading ? "Creating…" : "Create Property →"}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Webhook ── */}
        {step === "webhook" && createdProperty && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-green-800/50 bg-green-950/20 p-6 flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-xl">✓</div>
              <div>
                <p className="font-bold text-white">{createdProperty.name} created!</p>
                <p className="text-sm text-gray-400">Phone: {createdProperty.phone_number}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-8">
              <h1 className="text-2xl font-black mb-2">Connect Twilio</h1>
              <p className="text-gray-400 text-sm mb-8">One last step — tell Twilio to send incoming texts to Bulldog.</p>

              <ol className="space-y-6">
                <li className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C8102E] text-xs font-bold text-white">1</span>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">Go to Twilio Console</p>
                    <p className="text-xs text-gray-400">Phone Numbers → Manage → Active Numbers → click <strong className="text-gray-200">{createdProperty.phone_number}</strong></p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C8102E] text-xs font-bold text-white">2</span>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">Set the webhook URL</p>
                    <p className="text-xs text-gray-400 mb-2">Under <strong className="text-gray-200">Messaging → A message comes in</strong>, paste this URL:</p>
                    <div className="flex items-center gap-2 rounded-lg bg-[#16161F] border border-[#1E1E2E] px-3 py-2">
                      <code className="flex-1 text-xs text-[#C8102E] break-all">{webhookUrl}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(webhookUrl)}
                        className="shrink-0 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C8102E] text-xs font-bold text-white">3</span>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">Set method to HTTP POST</p>
                    <p className="text-xs text-gray-400">Make sure the dropdown next to the URL says <strong className="text-gray-200">HTTP POST</strong>, then click Save.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white">4</span>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">Test it</p>
                    <p className="text-xs text-gray-400">Text anything to <strong className="text-gray-200">{createdProperty.phone_number}</strong> from your personal phone. Bulldog will reply in under 60 seconds.</p>
                  </div>
                </li>
              </ol>

              <button
                onClick={() => setStep("done")}
                className="mt-8 w-full rounded-xl bg-[#C8102E] py-3.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors"
              >
                I've set the webhook →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Done ── */}
        {step === "done" && (
          <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-10 text-center">
            <div className="mb-5 text-5xl">🐾</div>
            <h1 className="text-3xl font-black mb-3">You're live!</h1>
            <p className="text-gray-400 mb-8 leading-relaxed">
              LeaseUp Bulldog is now managing leads for <strong className="text-white">{createdProperty?.name}</strong>.
              Text the number to test it, or add a lead manually from the dashboard.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-xl bg-[#C8102E] px-8 py-3.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors"
              >
                Go to Dashboard →
              </button>
              <button
                onClick={() => router.push("/leads")}
                className="rounded-xl border border-[#1E1E2E] px-8 py-3.5 text-sm font-semibold text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
              >
                Add a Lead Manually
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
