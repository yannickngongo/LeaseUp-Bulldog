"use client";
import { useState, useEffect } from "react";
import { getOperatorEmail } from "@/lib/demo-auth";

interface Property {
  id: string;
  name: string;
  phone_number: string;
}

type Platform = "zillow" | "apartments_com" | "appfolio" | "facebook" | "website" | "manual";

const PLATFORMS: { id: Platform; name: string; logo: string }[] = [
  { id: "zillow",         name: "Zillow Rental Manager", logo: "Z"   },
  { id: "apartments_com", name: "Apartments.com",         logo: "A"   },
  { id: "appfolio",       name: "AppFolio",               logo: "AF"  },
  { id: "facebook",       name: "Facebook Lead Ads",      logo: "f"   },
  { id: "website",        name: "Website / Form",         logo: "W"   },
  { id: "manual",         name: "Manual / CSV",           logo: "CSV" },
];

export default function IntegrationsPage() {
  const [properties, setProperties]         = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [activePlatform, setActivePlatform] = useState<Platform>("zillow");
  const [email, setEmail]                   = useState<string>("");
  const [copied, setCopied]                 = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://lease-up-bulldog.vercel.app";

  useEffect(() => {
    getOperatorEmail().then(async (e) => {
      if (!e) return;
      setEmail(e);
      const res  = await fetch(`/api/properties?email=${encodeURIComponent(e)}`);
      const json = await res.json();
      if (json.properties?.length) {
        setProperties(json.properties);
        setSelectedProperty(json.properties[0].id);
      }
    });
  }, []);

  const webhookUrl = selectedProperty
    ? `${appUrl}/api/leads/webhook?property_id=${selectedProperty}`
    : `${appUrl}/api/leads/webhook?property_id=YOUR_PROPERTY_ID`;

  function handleCopy() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#08080F] text-white p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10">
          <h1 className="text-3xl font-black mb-2">Lead Source Integrations</h1>
          <p className="text-gray-400">Connect Zillow, Apartments.com, Facebook, and more — leads flow in automatically and your AI starts qualifying them within 60 seconds.</p>
        </div>

        {/* Property selector */}
        {properties.length > 1 && (
          <div className="mb-8">
            <label className="block text-xs font-semibold text-gray-400 mb-2">Showing setup for:</label>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="rounded-lg border border-[#1E1E2E] bg-[#10101A] px-4 py-2.5 text-sm text-white focus:border-[#C8102E] focus:outline-none"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Webhook URL banner */}
        <div className="mb-8 rounded-xl border border-[#C8102E]/30 bg-[#C8102E]/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#C8102E] mb-1">Your Webhook URL</p>
          <p className="text-xs text-gray-400 mb-3">Paste this into every lead source. Any lead sent here gets an AI reply within 60 seconds, 24/7.</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded-lg bg-[#0a0a12] border border-[#1E1E2E] px-4 py-3 text-xs text-green-400 font-mono break-all">{webhookUrl}</code>
            <button
              onClick={handleCopy}
              className="shrink-0 rounded-lg border border-[#1E1E2E] bg-[#10101A] px-4 py-3 text-xs font-semibold text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Platform tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePlatform(p.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                activePlatform === p.id
                  ? "bg-[#C8102E] text-white"
                  : "border border-[#1E1E2E] bg-[#10101A] text-gray-400 hover:text-white hover:border-gray-500"
              }`}
            >
              <span className="text-xs font-black">{p.logo}</span>
              {p.name}
            </button>
          ))}
        </div>

        {/* Instructions panel */}
        <div className="rounded-2xl border border-[#1E1E2E] bg-[#10101A] p-6">
          {activePlatform === "zillow" && (
            <PlatformGuide
              title="Zillow Rental Manager"
              steps={[
                { title: "Open Zillow Rental Manager", desc: "Go to zillow.com/rental-manager → select your listing." },
                { title: 'Find "Lead Notification Settings"', desc: 'Inside your listing → Renter Leads tab → look for Webhook URL or Lead forwarding.' },
                { title: "Paste your webhook URL", desc: "Set Method: POST. Paste the URL above.", code: webhookUrl },
                { title: "Send a test lead", desc: "Use Zillow's test lead button. Check your Leads page — the lead should appear within 30 seconds with a sent SMS." },
              ]}
              fieldMap={[
                { platform: "first_name + last_name", lub: "name" },
                { platform: "phone_number", lub: "phone" },
                { platform: "email_address", lub: "email" },
                { platform: "move_date", lub: "move_in_date" },
                { platform: "bedrooms", lub: "unit type" },
              ]}
            />
          )}

          {activePlatform === "apartments_com" && (
            <PlatformGuide
              title="Apartments.com"
              steps={[
                { title: "Log in to your Apartments.com dashboard", desc: "Go to your CoStar / Apartments.com property management account." },
                { title: 'Go to "Lead Routing" → CRM Integration', desc: "Look for Webhook, API, or third-party CRM settings under your listing." },
                { title: "Set your POST webhook URL", desc: "Paste your webhook URL below and set method to POST.", code: webhookUrl },
                { title: "Add your webhook secret header", desc: "If available, add header: X-Webhook-Secret: [from Settings → Integrations in your LUB dashboard]." },
              ]}
              fieldMap={[
                { platform: "name or full_name", lub: "name" },
                { platform: "phone or phone_number", lub: "phone" },
                { platform: "email", lub: "email" },
              ]}
            />
          )}

          {activePlatform === "appfolio" && (
            <div>
              <h2 className="text-xl font-bold mb-2">AppFolio — Setup Guide</h2>
              <p className="text-sm text-gray-400 mb-6">AppFolio doesn&apos;t support direct webhooks, so you&apos;ll use Zapier as the bridge. Setup takes about 10 minutes.</p>

              <div className="mb-6 rounded-xl border border-amber-800/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-400">
                <span className="font-semibold">Requirement:</span> AppFolio API access must be enabled on your plan. Contact your AppFolio rep to confirm.
              </div>

              <div className="space-y-5 mb-8">
                {[
                  {
                    title: "Create a free Zapier account",
                    desc: "Go to zapier.com and sign up. The free plan supports this integration.",
                  },
                  {
                    title: "Create a new Zap",
                    desc: 'Click "Create Zap" in the Zapier dashboard.',
                  },
                  {
                    title: "Set the trigger — AppFolio",
                    desc: 'Search for "AppFolio" as the trigger app. Select the trigger event: New Prospect. Connect your AppFolio account when prompted, then test the trigger to confirm Zapier can see your leads.',
                  },
                  {
                    title: "Set the action — Webhooks by Zapier",
                    desc: 'Search for "Webhooks by Zapier" as the action app. Select action: POST. Paste your webhook URL below.',
                    code: webhookUrl,
                  },
                  {
                    title: "Map the fields",
                    desc: "In Zapier, match AppFolio's fields to what LUB expects (see field mapping below).",
                  },
                  {
                    title: "Turn the Zap on",
                    desc: "Click Publish. Every new AppFolio prospect from this point will automatically appear in LUB and receive an AI text within 60 seconds.",
                  },
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/20 text-xs font-bold text-[#C8102E]">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">{step.title}</p>
                      <p className="text-sm text-gray-400 mt-0.5">{step.desc}</p>
                      {"code" in step && step.code && (
                        <code className="mt-2 block rounded-lg bg-[#0a0a12] border border-[#1E1E2E] px-3 py-2 text-xs text-green-400 font-mono break-all">
                          {step.code}
                        </code>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Field Mapping</p>
              <div className="rounded-xl border border-[#1E1E2E] overflow-hidden mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1E1E2E] bg-[#0a0a12]">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">AppFolio field</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Map to (LUB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { from: "First Name",    to: "first_name"    },
                      { from: "Last Name",     to: "last_name"     },
                      { from: "Phone",         to: "phone_number"  },
                      { from: "Email",         to: "email_address" },
                      { from: "Move-in Date",  to: "move_in_date"  },
                      { from: "Bedrooms",      to: "bedrooms"      },
                    ].map((row, i, arr) => (
                      <tr key={i} className={i < arr.length - 1 ? "border-b border-[#1E1E2E]" : ""}>
                        <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{row.from}</td>
                        <td className="px-4 py-2.5 text-green-400 font-mono text-xs">{row.to}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-blue-900/30 bg-blue-950/20 px-4 py-3 text-sm text-blue-300">
                <span className="font-semibold">What happens after setup:</span> Every new AppFolio prospect gets an instant AI text from your property&apos;s number. You see the lead and full conversation in your LUB dashboard — no manual follow-up needed.
              </div>
            </div>
          )}

          {activePlatform === "facebook" && (
            <PlatformGuide
              title="Facebook Lead Ads"
              steps={[
                { title: "Open Meta Business Suite", desc: "Go to business.facebook.com → your Page → Instant Forms." },
                { title: 'Go to Page Settings → Subscriptions → "leadgen"', desc: "Under Webhooks, subscribe to leadgen events for your page." },
                { title: "Set the callback URL", desc: "Paste your webhook URL. Facebook will verify it with a GET request — our endpoint handles this automatically.", code: webhookUrl },
                { title: "Map your form fields", desc: 'Ensure your lead form captures "Full Name" and "Phone Number". LeaseUp Bulldog normalizes Facebook\'s field names automatically.' },
                { title: "Test with Lead Ads Testing Tool", desc: "Use developers.facebook.com/tools/lead-ads-testing to submit a test. Check your Leads page within 30 seconds." },
              ]}
              fieldMap={[
                { platform: "full_name", lub: "name" },
                { platform: "phone_number", lub: "phone" },
                { platform: "email", lub: "email" },
              ]}
              note="Facebook delivers leads in real-time via webhook — average delivery is under 5 seconds after form submit."
            />
          )}

          {activePlatform === "website" && (
            <div>
              <h2 className="text-xl font-bold mb-6">Website / Landing Page</h2>
              <p className="text-sm text-gray-400 mb-5">Add this fetch call to your existing contact form&apos;s submit handler:</p>

              <div className="rounded-xl bg-[#0a0a12] border border-[#1E1E2E] p-4 mb-6">
                <pre className="text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">{`fetch("${webhookUrl}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name:         form.name,         // required
    phone:        form.phone,        // required
    email:        form.email,        // optional
    move_in_date: form.moveDate,     // optional — YYYY-MM-DD
    source:       "website",
  })
})`}</pre>
              </div>

              <div className="rounded-xl border border-[#1E1E2E] p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Field Reference</p>
                <FieldTable rows={[
                  { field: "name",         type: "string",  req: true,  desc: "Full name of the prospect" },
                  { field: "phone",        type: "string",  req: true,  desc: "10-digit US number or E.164 (+1...)" },
                  { field: "email",        type: "string",  req: false, desc: "Email address" },
                  { field: "move_in_date", type: "string",  req: false, desc: "YYYY-MM-DD format" },
                  { field: "source",       type: "string",  req: false, desc: "Label, e.g. \"website\", \"instagram\"" },
                ]} />
              </div>
            </div>
          )}

          {activePlatform === "manual" && (
            <div>
              <h2 className="text-xl font-bold mb-6">Manual / CSV Import</h2>
              <p className="text-sm text-gray-400 mb-6">Already have a list of leads? Import them via CSV or the bulk API.</p>

              <div className="space-y-4">
                <div className="rounded-xl border border-[#1E1E2E] p-5">
                  <h3 className="font-semibold mb-1">Option 1 — Leads page import</h3>
                  <p className="text-sm text-gray-400">Go to Leads → click "Import" → upload a CSV with columns: <code className="text-green-400">name, phone, email, move_in_date</code></p>
                </div>
                <div className="rounded-xl border border-[#1E1E2E] p-5">
                  <h3 className="font-semibold mb-3">Option 2 — cURL (one lead at a time)</h3>
                  <pre className="text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap bg-[#0a0a12] rounded-lg p-4">{`curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Sarah Johnson","phone":"7025551234","email":"sarah@example.com"}'`}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick test */}
        <div className="mt-6 rounded-xl border border-[#1E1E2E] p-5">
          <h3 className="font-bold mb-1">Quick integration test</h3>
          <p className="text-sm text-gray-400 mb-3">Run this in your terminal — use your own phone number to see the full flow live:</p>
          <pre className="text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap bg-[#0a0a12] rounded-lg p-4">{`curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Test Lead","phone":"YOUR_PHONE_NUMBER","source":"test"}'`}</pre>
        </div>
      </div>
    </div>
  );
}

function PlatformGuide({
  title, steps, fieldMap, note,
}: {
  title: string;
  steps: { title: string; desc: string; code?: string }[];
  fieldMap?: { platform: string; lub: string }[];
  note?: string;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-6">{title} — Setup Guide</h2>
      <div className="space-y-5 mb-8">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C8102E]/20 text-xs font-bold text-[#C8102E]">
              {i + 1}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white">{step.title}</p>
              <p className="text-sm text-gray-400 mt-0.5">{step.desc}</p>
              {step.code && (
                <code className="mt-2 block rounded-lg bg-[#0a0a12] border border-[#1E1E2E] px-3 py-2 text-xs text-green-400 font-mono break-all">
                  {step.code}
                </code>
              )}
            </div>
          </div>
        ))}
      </div>

      {fieldMap && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Field Mapping</p>
          <div className="rounded-xl border border-[#1E1E2E] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1E1E2E] bg-[#0a0a12]">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Platform sends</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">LUB receives</th>
                </tr>
              </thead>
              <tbody>
                {fieldMap.map((row, i) => (
                  <tr key={i} className={i < fieldMap.length - 1 ? "border-b border-[#1E1E2E]" : ""}>
                    <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{row.platform}</td>
                    <td className="px-4 py-2.5 text-green-400 font-mono text-xs">{row.lub}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {note && (
        <div className="mt-4 rounded-xl border border-blue-900/30 bg-blue-950/20 px-4 py-3 text-sm text-blue-300">
          {note}
        </div>
      )}
    </div>
  );
}

function FieldTable({ rows }: { rows: { field: string; type: string; req: boolean; desc: string }[] }) {
  return (
    <div className="rounded-xl border border-[#1E1E2E] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#1E1E2E] bg-[#0a0a12]">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Field</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Required</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i < rows.length - 1 ? "border-b border-[#1E1E2E]" : ""}>
              <td className="px-4 py-2.5 text-green-400 font-mono text-xs">{row.field}</td>
              <td className="px-4 py-2.5 text-xs">
                {row.req
                  ? <span className="text-[#C8102E] font-semibold">required</span>
                  : <span className="text-gray-600">optional</span>}
              </td>
              <td className="px-4 py-2.5 text-gray-400 text-xs">{row.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
