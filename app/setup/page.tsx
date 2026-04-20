"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOperatorEmail, saveOperatorEmail } from "@/lib/demo-auth";

type Step = "account" | "property" | "rentroll" | "webhook" | "done";

// ─── CSV parser (shared with properties/new) ──────────────────────────────────

interface ParsedUnit {
  unit_name: string; unit_type: string; bedrooms: number | null;
  sq_ft: number | null; status: string; current_resident: string;
  lease_end: string; monthly_rent: number | null;
}

function parseRentRollCsv(raw: string): ParsedUnit[] {
  const lines = raw.trim().split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].toLowerCase().split(",").map(h => h.trim().replace(/"/g, ""));
  const col = (row: string[], name: string) => {
    const idx = headers.findIndex(h => h.includes(name));
    return idx >= 0 ? (row[idx] ?? "").trim().replace(/"/g, "") : "";
  };
  return lines.slice(1).map(line => {
    const row = line.split(",");
    const unit_name = col(row, "unit");
    if (!unit_name) return null;
    const sr = col(row, "status").toLowerCase();
    const status = sr.includes("occup") ? "occupied" : sr.includes("notice") ? "notice" : sr.includes("unavail") ? "unavailable" : "vacant";
    const tr = col(row, "type").toLowerCase();
    const unit_type = tr.includes("studio") ? "studio" : tr.includes("4") ? "4br" : tr.includes("3") ? "3br" : tr.includes("2") ? "2br" : tr.includes("1") ? "1br" : tr || "";
    const bedsRaw = col(row, "bed");
    const sqftRaw = col(row, "sq") || col(row, "sqft") || col(row, "size");
    const rentRaw = col(row, "rent") || col(row, "price") || col(row, "amount");
    return {
      unit_name, unit_type,
      bedrooms: bedsRaw ? parseInt(bedsRaw, 10) || null : null,
      sq_ft: sqftRaw ? parseInt(sqftRaw.replace(/\D/g, ""), 10) || null : null,
      status,
      current_resident: col(row, "resident") || col(row, "tenant") || col(row, "name"),
      lease_end: col(row, "lease end") || col(row, "end date") || col(row, "move out"),
      monthly_rent: rentRaw ? parseInt(rentRaw.replace(/[^0-9]/g, ""), 10) || null : null,
    } as ParsedUnit;
  }).filter(Boolean) as ParsedUnit[];
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [account, setAccount] = useState({ name: "", email: "" });

  // Check if already logged in — skip account step if so
  useEffect(() => {
    getOperatorEmail().then(async (email) => {
      if (!email) { setChecking(false); return; }
      const res = await fetch(`/api/setup?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.operator) {
        setAccount({ name: data.operator.name ?? "", email });
        setStep("property");
      }
      setChecking(false);
    });
  }, []);
  const [property, setProperty] = useState({
    name: "", address: "", city: "", state: "", zip: "",
    neighborhood: "",
    phoneNumber: "", activeSpecial: "", websiteUrl: "",
    totalUnits: "", tourBookingUrl: "",
  });
  const [rentRollCsv, setRentRollCsv] = useState("");
  const [rentRollPreview, setRentRollPreview] = useState<ParsedUnit[]>([]);
  const [createdProperty, setCreatedProperty] = useState<{ id: string; name: string; phone_number: string } | null>(null);

  async function handleAccountNext() {
    if (!account.name || !account.email) return;
    setStep("property");
  }

  async function handlePropertyNext() {
    if (!property.name || !property.address || !property.city || !property.state || !property.zip || !property.phoneNumber) return;
    setStep("rentroll");
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
          neighborhood:    property.neighborhood || null,
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

      // Upload rent roll if provided
      if (rentRollCsv.trim() && data.property?.id) {
        const units = parseRentRollCsv(rentRollCsv);
        if (units.length > 0) {
          await fetch(`/api/properties/${data.property.id}/units`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ units }),
          });
        }
      }

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

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08080F]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

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
            {(["account", "property", "rentroll", "webhook", "done"] as Step[]).map((s, i) => {
              const ORDER = ["account","property","rentroll","webhook","done"];
              const cur = ORDER.indexOf(step), idx = ORDER.indexOf(s);
              return (
                <div key={s} className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    s === step ? "bg-[#C8102E] text-white" : idx < cur ? "bg-green-500 text-white" : "bg-[#1E1E2E] text-gray-500"
                  }`}>
                    {idx < cur ? "✓" : i + 1}
                  </div>
                  {i < 4 && <div className={`h-px w-6 sm:w-10 ${idx < cur ? "bg-green-500" : "bg-[#1E1E2E]"}`} />}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-500">
            {step === "account"   && "Step 1 of 4 — Your account"}
            {step === "property"  && "Step 2 of 4 — Your first property"}
            {step === "rentroll"  && "Step 3 of 4 — Rent roll (optional)"}
            {step === "webhook"   && "Step 4 of 4 — Connect Twilio"}
            {step === "done"      && "You're live!"}
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
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Neighborhood <span className="text-gray-600 font-normal">(optional)</span></label>
                <input
                  value={property.neighborhood}
                  onChange={e => setProperty(p => ({ ...p, neighborhood: e.target.value }))}
                  placeholder="e.g. Summerlin, Henderson, Downtown Las Vegas"
                  className="w-full rounded-xl border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#C8102E] focus:outline-none"
                />
                <p className="mt-1.5 text-xs text-gray-600">Used for neighborhood-level market analysis — more precise than ZIP code.</p>
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
                onClick={handlePropertyNext}
                disabled={!property.name || !property.address || !property.city || !property.state || !property.zip || !property.phoneNumber}
                className="flex-1 rounded-xl bg-[#C8102E] py-3.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Rent Roll ── */}
        {step === "rentroll" && (
          <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-8">
            <h1 className="text-2xl font-black mb-2">Upload your rent roll</h1>
            <p className="text-gray-400 text-sm mb-6">
              This lets Bulldog track your units, occupancy rate, and unit names automatically.
              You can skip this and add it later from the property settings.
            </p>

            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-400 mb-1.5">CSV format</p>
              <div className="rounded-lg bg-[#16161F] border border-[#1E1E2E] px-3 py-2">
                <code className="text-xs text-gray-500 font-mono">Unit Number,Unit Type,Status,Current Resident,Lease End Date,Monthly Rent</code>
              </div>
              <p className="mt-1 text-xs text-gray-600">Required: Unit Number, Status. Status values: Occupied, Vacant, Notice, Unavailable</p>
            </div>

            {/* File upload */}
            <div className="mb-3 flex items-center gap-3">
              <label className="cursor-pointer rounded-lg border border-[#1E1E2E] bg-[#16161F] px-4 py-2 text-xs font-semibold text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors">
                Upload CSV
                <input type="file" accept=".csv,.txt" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => {
                    const text = ev.target?.result as string;
                    setRentRollCsv(text);
                    setRentRollPreview(parseRentRollCsv(text));
                  };
                  reader.readAsText(file);
                }} />
              </label>
              <span className="text-xs text-gray-600">or paste CSV below</span>
            </div>

            <textarea
              value={rentRollCsv}
              onChange={e => {
                setRentRollCsv(e.target.value);
                setRentRollPreview(parseRentRollCsv(e.target.value));
              }}
              rows={5}
              placeholder={"101,1BR,Occupied,John Smith,2025-12-31,1250\n102,2BR,Vacant,,,1600\n103,Studio,Occupied,Jane Doe,2025-06-30,950"}
              className="w-full rounded-xl border border-[#1E1E2E] bg-[#16161F] px-4 py-3 text-xs font-mono text-gray-300 placeholder-gray-700 focus:border-[#C8102E] focus:outline-none resize-none"
            />

            {rentRollPreview.length > 0 && (
              <div className="mt-3 rounded-xl border border-[#1E1E2E] overflow-hidden">
                <div className="bg-[#16161F] px-4 py-2.5 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-300">
                    {rentRollPreview.length} units · {rentRollPreview.filter(u => u.status === "occupied" || u.status === "notice").length} occupied
                  </p>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-[#1E1E2E]">
                      {["Unit","Type","Status","Resident","Rent"].map(h => (
                        <th key={h} className="px-3 py-1.5 text-left font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {rentRollPreview.slice(0, 15).map((u, i) => (
                        <tr key={i} className="border-b border-[#1E1E2E]/50 last:border-0">
                          <td className="px-3 py-1.5 text-white font-medium">{u.unit_name}</td>
                          <td className="px-3 py-1.5 text-gray-400">{u.unit_type || "—"}</td>
                          <td className="px-3 py-1.5">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              u.status === "occupied" ? "bg-green-900/30 text-green-400" :
                              u.status === "notice"   ? "bg-amber-900/30 text-amber-400" :
                              "bg-white/5 text-gray-400"
                            }`}>{u.status}</span>
                          </td>
                          <td className="px-3 py-1.5 text-gray-400">{u.current_resident || "—"}</td>
                          <td className="px-3 py-1.5 text-gray-400">{u.monthly_rent ? `$${u.monthly_rent}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">{error}</div>
            )}

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setStep("property")}
                className="rounded-xl border border-[#1E1E2E] px-5 py-3.5 text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handlePropertySubmit}
                disabled={loading}
                className="flex-1 rounded-xl bg-[#C8102E] py-3.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors"
              >
                {loading ? "Creating property…" : rentRollPreview.length > 0 ? `Create Property + Upload ${rentRollPreview.length} Units →` : "Skip & Create Property →"}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Webhook ── */}
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
