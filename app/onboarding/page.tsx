"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getOperatorEmail, authFetch } from "@/lib/demo-auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://lease-up-bulldog.vercel.app";

type Step = 1 | 2 | 3 | 4;

// ─── Step indicator ───────────────────────────────────────────────────────────

function Steps({ current }: { current: Step }) {
  const labels = ["Welcome", "Your Property", "Lead Source", "You're Ready"];
  return (
    <div className="flex items-center gap-0 mb-10">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const done    = n < current;
        const active  = n === current;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition-colors ${
                done   ? "bg-green-500 text-white" :
                active ? "bg-[#C8102E] text-white" :
                         "border-2 border-gray-200 dark:border-white/10 text-gray-400"
              }`}>
                {done ? "✓" : n}
              </div>
              <p className={`mt-1 text-[10px] font-semibold whitespace-nowrap hidden sm:block ${active ? "text-gray-900 dark:text-gray-100" : "text-gray-400"}`}>{label}</p>
            </div>
            {i < labels.length - 1 && (
              <div className={`h-px w-8 sm:w-16 mx-1 mt-[-14px] sm:mt-[-18px] transition-colors ${done ? "bg-green-400" : "bg-gray-200 dark:bg-white/10"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Welcome ─────────────────────────────────────────────────────────

function Step1({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C8102E]/10">
        <span className="text-3xl">🐾</span>
      </div>
      <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-3">Welcome to LeaseUp<span className="text-[#C8102E]">Bulldog</span></h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed mb-2">
        Let&apos;s get you set up in 3 minutes. You&apos;ll add your first property, connect a lead source, and your AI starts following up automatically.
      </p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-8">Free 14-day trial · no credit card required to start</p>
      <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-10 text-center">
        {[
          { icon: "⚡", label: "60-second AI reply" },
          { icon: "📱", label: "Two-way SMS loop" },
          { icon: "📊", label: "Owner reports" },
        ].map(f => (
          <div key={f.label} className="rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 p-3">
            <div className="text-2xl mb-1">{f.icon}</div>
            <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 leading-tight">{f.label}</p>
          </div>
        ))}
      </div>
      <button onClick={onNext} className="rounded-xl bg-[#C8102E] px-8 py-3.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors">
        Let&apos;s Get Started →
      </button>
    </div>
  );
}

// ─── Step 2: Add first property ───────────────────────────────────────────────

interface PropertyForm {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone_number: string;
  total_units: string;
  occupied_units: string;
}

function Step2({ onNext }: { onNext: (propertyId: string) => void }) {
  const [form, setForm]     = useState<PropertyForm>({ name: "", address: "", city: "", state: "", zip: "", phone_number: "", total_units: "", occupied_units: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const set = (k: keyof PropertyForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const email = await getOperatorEmail();
      if (!email) { setError("Session expired — please refresh."); setSaving(false); return; }

      // Get operator ID
      const setupRes = await authFetch(`/api/setup`);
      const { operator } = await setupRes.json();
      if (!operator?.id) { setError("Operator not found."); setSaving(false); return; }

      // Create property via the new-property API
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator_id:    operator.id,
          name:           form.name,
          address:        form.address,
          city:           form.city,
          state:          form.state,
          zip:            form.zip,
          phone_number:   form.phone_number.replace(/\D/g, "").replace(/^(\d{10})$/, "+1$1"),
          total_units:    parseInt(form.total_units) || 1,
          occupied_units: parseInt(form.occupied_units) || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create property."); setSaving(false); return; }
      onNext(json.property?.id ?? json.id ?? "");
    } catch {
      setError("Network error — please try again.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">Add your first property</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">You can add more properties later from the Properties page.</p>
      </div>

      <Field label="Property Name" placeholder="Maple Grove Apartments" value={form.name} onChange={set("name")} required />
      <Field label="Street Address" placeholder="123 Main Street" value={form.address} onChange={set("address")} />
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1"><Field label="City" placeholder="Atlanta" value={form.city} onChange={set("city")} /></div>
        <div><Field label="State" placeholder="GA" value={form.state} onChange={set("state")} /></div>
        <div><Field label="ZIP" placeholder="30301" value={form.zip} onChange={set("zip")} /></div>
      </div>
      <Field label="Twilio Phone Number" placeholder="+14045551234" value={form.phone_number} onChange={set("phone_number")} hint="The Twilio number for this property — leads receive SMS from this number." />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Total Units" placeholder="24" value={form.total_units} onChange={set("total_units")} type="number" />
        <Field label="Occupied Units" placeholder="18" value={form.occupied_units} onChange={set("occupied_units")} type="number" />
      </div>

      {error && <p className="rounded-lg border border-red-900/40 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">{error}</p>}

      <button type="submit" disabled={saving || !form.name.trim()} className="w-full rounded-xl bg-[#C8102E] py-3.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors">
        {saving ? "Creating property…" : "Save & Continue →"}
      </button>
    </form>
  );
}

function Field({ label, placeholder, value, onChange, hint, required, type = "text" }: {
  label: string; placeholder: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hint?: string; required?: boolean; type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</label>
      <input
        type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-[#C8102E] focus:outline-none"
      />
      {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

// ─── Step 3: Connect lead source ──────────────────────────────────────────────

const PLATFORMS = [
  { id: "zillow",     name: "Zillow / Trulia / HotPads", path: "zillow",     icon: "Z" },
  { id: "apartments", name: "Apartments.com",             path: "apartments", icon: "A" },
  { id: "facebook",   name: "Facebook Lead Ads",          path: "facebook",   icon: "f" },
  { id: "generic",    name: "Website / Other",            path: "webhook",    icon: "W" },
];

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="shrink-0 rounded px-2 py-0.5 text-[10px] font-bold text-[#C8102E] hover:bg-red-50 dark:hover:bg-red-900/10"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function Step3({ propertyId, onNext }: { propertyId: string; onNext: () => void }) {
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const webhookUrl = `${APP_URL}/api/leads/${platform.path}?property_id=${propertyId}`;

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-100">Connect a lead source</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Every inquiry becomes an AI-followed lead in seconds.</p>
      </div>

      {/* Platform picker */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        {PLATFORMS.map(p => (
          <button
            key={p.id} type="button"
            onClick={() => setPlatform(p)}
            className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors text-left ${
              platform.id === p.id
                ? "border-[#C8102E] bg-[#C8102E]/5 text-gray-900 dark:text-gray-100"
                : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:border-gray-400"
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white ${platform.id === p.id ? "bg-[#C8102E]" : "bg-gray-400 dark:bg-white/20"}`}>{p.icon}</span>
            {p.name}
          </button>
        ))}
      </div>

      {/* Webhook URL */}
      <div className="rounded-xl border border-[#C8102E]/20 bg-[#C8102E]/5 dark:bg-[#C8102E]/10 p-4 mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#C8102E] mb-2">Your {platform.name} Webhook URL</p>
        <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-black/20 border border-[#C8102E]/20 px-3 py-2">
          <code className="flex-1 truncate text-xs font-mono text-gray-700 dark:text-gray-300">{webhookUrl}</code>
          <CopyBtn value={webhookUrl} />
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Paste this URL into <strong>{platform.name}</strong> → Lead Delivery Settings → Webhook URL. Method: POST.
        </p>
      </div>

      {platform.id === "facebook" && (
        <div className="mb-4 rounded-lg border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] px-4 py-3">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Facebook Verify Token</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-gray-700 dark:text-gray-300">leaseup_bulldog_fb_verify</code>
            <CopyBtn value="leaseup_bulldog_fb_verify" />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onNext} className="flex-1 rounded-xl bg-[#C8102E] py-3.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors">
          I&apos;ve configured it →
        </button>
        <button type="button" onClick={onNext} className="rounded-xl border border-gray-200 dark:border-white/10 px-4 py-3.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
          Skip for now
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Done ─────────────────────────────────────────────────────────────

function Step4({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="text-center max-w-md mx-auto">
      <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20 text-4xl">🎉</div>
      <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-3">You&apos;re all set!</h2>
      <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-8">
        Your AI is ready to follow up with leads 24/7. The moment a lead inquires through your connected platform, LUB sends a personalized SMS within 60 seconds — no action needed from you.
      </p>
      <div className="grid gap-3 text-left mb-8">
        {[
          { icon: "📥", text: "Lead comes in from Zillow / Apartments / Facebook" },
          { icon: "🤖", text: "AI sends first message within 60 seconds" },
          { icon: "💬", text: "Lead replies → AI continues the conversation" },
          { icon: "🏡", text: "Tour scheduled → you close the lease" },
        ].map(s => (
          <div key={s.text} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] px-4 py-3">
            <span className="text-xl">{s.icon}</span>
            <p className="text-sm text-gray-700 dark:text-gray-300">{s.text}</p>
          </div>
        ))}
      </div>
      <button onClick={onFinish} className="w-full rounded-xl bg-[#C8102E] py-3.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors">
        Go to Dashboard →
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep]           = useState<Step>(1);
  const [propertyId, setPropertyId] = useState("");

  function handlePropertyCreated(id: string) {
    setPropertyId(id);
    setStep(3);
  }

  function handleFinish() {
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#08080F] text-white">
      <header className="border-b border-[#1E1E2E] px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <p className="text-xl font-black tracking-tight">
            LeaseUp<span className="text-[#C8102E]">Bulldog</span>
          </p>
          <button onClick={handleFinish} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Skip setup →
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Steps current={step} />

        {step === 1 && <Step1 onNext={() => setStep(2)} />}
        {step === 2 && <Step2 onNext={handlePropertyCreated} />}
        {step === 3 && <Step3 propertyId={propertyId} onNext={() => setStep(4)} />}
        {step === 4 && <Step4 onFinish={handleFinish} />}
      </div>
    </div>
  );
}
