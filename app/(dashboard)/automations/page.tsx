"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { SectionLabel } from "@/components/ui/SectionLabel";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Template {
  id: string;
  label: string;
  tag: string;
  body: string;
}

// ─── Mock state ───────────────────────────────────────────────────────────────

const INITIAL_TEMPLATES: Template[] = [
  {
    id: "first_response",
    label: "First Response",
    tag: "Sent within 60s of lead creation",
    body: "Hi {{first_name}}! 👋 Thanks for your interest in {{property_name}}. I'm the AI leasing assistant — I'm here 24/7 to answer questions and help you schedule a tour.\n\nA few quick questions: When are you looking to move? And how many bedrooms do you need?",
  },
  {
    id: "followup",
    label: "Day 3 Follow-Up",
    tag: "Sent if no reply in 3 days",
    body: "Hey {{first_name}}, just checking in! We still have availability at {{property_name}} and I'd love to help you find the right fit.\n\nWould a tour this week work for you? I can set something up in just a few taps.",
  },
  {
    id: "tour_reminder",
    label: "Tour Reminder",
    tag: "Sent 24h before scheduled tour",
    body: "Hi {{first_name}}, just a reminder that your tour at {{property_name}} is scheduled for tomorrow at {{tour_time}}.\n\n📍 {{property_address}}\n\nReply CONFIRM to confirm or RESCHEDULE if you need a different time.",
  },
  {
    id: "app_push",
    label: "Application Push",
    tag: "Sent 24h after tour if no app started",
    body: "{{first_name}}, it was great meeting you! If you're ready to move forward, here's your application link:\n\n{{application_link}}\n\nIt only takes about 10 minutes. Let me know if you have any questions!",
  },
];

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors focus:outline-none",
        enabled ? "bg-[#C8102E]" : "bg-gray-200"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          enabled ? "translate-x-4" : "translate-x-0"
        )}
      />
    </button>
  );
}

function SettingRow({
  label,
  description,
  children,
  danger,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="flex-1">
        <p className={cn("text-sm font-medium", danger ? "text-red-600" : "text-gray-900")}>{label}</p>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function NumberInput({ value, onChange, suffix, min = 1, max = 999 }: {
  value: number; onChange: (v: number) => void; suffix: string; min?: number; max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 rounded-lg border border-gray-200 px-2.5 py-1.5 text-center text-sm font-semibold text-gray-900 focus:border-gray-400 focus:outline-none"
      />
      <span className="text-xs text-gray-500">{suffix}</span>
    </div>
  );
}

function SelectInput({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 focus:border-gray-400 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  // Instant response
  const [instantEnabled, setInstantEnabled]   = useState(true);
  const [responseTarget, setResponseTarget]   = useState(60);
  const [tone, setTone]                       = useState("friendly");

  // Follow-up rules
  const [noReplyMins, setNoReplyMins]         = useState(180);
  const [noTourHrs, setNoTourHrs]             = useState(48);
  const [incompleteAppHrs, setIncompleteAppHrs] = useState(72);
  const [followupEnabled, setFollowupEnabled] = useState(true);
  const [tourNudgeEnabled, setTourNudgeEnabled] = useState(true);
  const [appNudgeEnabled, setAppNudgeEnabled] = useState(false);

  // Property rules
  const [officeHoursOnly, setOfficeHoursOnly] = useState(false);
  const [confirmAvailability, setConfirmAvailability] = useState(true);
  const [tourWindow, setTourWindow]           = useState("9am-6pm");
  const [appLink, setAppLink]                 = useState("https://apply.themonroe.com");
  const [special, setSpecial]                 = useState("1 month free on 12-month leases");

  // Guardrails
  const [noInventPrice, setNoInventPrice]     = useState(true);
  const [noPromiseAvail, setNoPromiseAvail]   = useState(true);
  const [alwaysQualify, setAlwaysQualify]     = useState(true);
  const [humanEscalate, setHumanEscalate]     = useState(true);

  // Templates
  const [templates, setTemplates]             = useState<Template[]>(INITIAL_TEMPLATES);
  const [activeTemplate, setActiveTemplate]   = useState<string>("first_response");
  const [editingBody, setEditingBody]         = useState(INITIAL_TEMPLATES[0].body);
  const [saved, setSaved]                     = useState(false);

  const currentTemplate = templates.find((t) => t.id === activeTemplate)!;

  function selectTemplate(id: string) {
    setActiveTemplate(id);
    setEditingBody(templates.find((t) => t.id === id)!.body);
    setSaved(false);
  }

  function saveTemplate() {
    setTemplates((prev) => prev.map((t) => t.id === activeTemplate ? { ...t, body: editingBody } : t));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const TONE_OPTS = [
    { value: "friendly",    label: "Friendly & Warm" },
    { value: "professional", label: "Professional" },
    { value: "concise",     label: "Direct & Concise" },
  ];

  const TONE_PREVIEWS: Record<string, string> = {
    friendly:     "Hey {{first_name}}! 👋 So glad you reached out about {{property_name}}. I'd love to help you find a place you'll actually love living in.",
    professional: "Hello {{first_name}}, thank you for your inquiry regarding {{property_name}}. I'd be happy to assist you with any questions.",
    concise:      "Hi {{first_name}} — thanks for reaching out. What's your move-in timeline and how many bedrooms do you need?",
  };

  const TOUR_WINDOWS = [
    { value: "9am-5pm",  label: "9 AM – 5 PM" },
    { value: "9am-6pm",  label: "9 AM – 6 PM" },
    { value: "10am-6pm", label: "10 AM – 6 PM" },
    { value: "8am-8pm",  label: "8 AM – 8 PM (extended)" },
  ];

  const divider = <div className="border-t border-gray-50" />;

  return (
    <div className="space-y-8 p-6">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Automation Settings</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Configure how LUB responds to leads, follows up, and converts.
          </p>
        </div>
        <button className="rounded-lg bg-[#C8102E] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#A50D25]">
          Save All Changes
        </button>
      </div>

      {/* ── 1. Instant Response ─────────────────────────────────────────── */}
      <Card>
        <div className="mb-1 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Instant Response</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              AI replies to every new lead within seconds of creation.
            </p>
          </div>
          <Toggle enabled={instantEnabled} onToggle={() => setInstantEnabled((v) => !v)} />
        </div>

        <div className={cn("mt-4 divide-y divide-gray-50 transition-opacity", !instantEnabled && "pointer-events-none opacity-40")}>
          {divider}
          <SettingRow
            label="Response target"
            description="How quickly the AI should send the first message after a lead is created."
          >
            <NumberInput value={responseTarget} onChange={setResponseTarget} suffix="seconds" min={10} max={300} />
          </SettingRow>
          {divider}
          <SettingRow
            label="AI tone"
            description="Sets the personality and register for all AI-generated messages at this property."
          >
            <SelectInput value={tone} onChange={setTone} options={TONE_OPTS} />
          </SettingRow>
          {divider}
          <div className="py-4">
            <p className="mb-2 text-xs font-medium text-gray-500">Tone preview</p>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <p className="text-xs leading-relaxed text-gray-600 italic">"{TONE_PREVIEWS[tone]}"</p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 2. Follow-Up Rules ──────────────────────────────────────────── */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-900">Follow-Up Rules</h2>
        <p className="mt-0.5 text-xs text-gray-500">Define when and how the AI re-engages silent or stalled leads.</p>

        <div className="mt-4 divide-y divide-gray-50">
          {divider}
          <SettingRow
            label="No reply follow-up"
            description="Send a follow-up if a lead hasn't replied after a set time."
          >
            <div className="flex items-center gap-3">
              <Toggle enabled={followupEnabled} onToggle={() => setFollowupEnabled((v) => !v)} />
              <NumberInput value={noReplyMins} onChange={setNoReplyMins} suffix="min" min={30} max={2880} />
            </div>
          </SettingRow>
          {divider}
          <SettingRow
            label="No tour booked nudge"
            description="Prompt the lead to schedule if they've engaged but haven't booked a tour."
          >
            <div className="flex items-center gap-3">
              <Toggle enabled={tourNudgeEnabled} onToggle={() => setTourNudgeEnabled((v) => !v)} />
              <NumberInput value={noTourHrs} onChange={setNoTourHrs} suffix="hrs" min={12} max={168} />
            </div>
          </SettingRow>
          {divider}
          <SettingRow
            label="Incomplete application nudge"
            description="Re-engage leads who started but haven't completed their application."
          >
            <div className="flex items-center gap-3">
              <Toggle enabled={appNudgeEnabled} onToggle={() => setAppNudgeEnabled((v) => !v)} />
              <div className={cn(!appNudgeEnabled && "opacity-40 pointer-events-none")}>
                <NumberInput value={incompleteAppHrs} onChange={setIncompleteAppHrs} suffix="hrs" min={12} max={168} />
              </div>
            </div>
          </SettingRow>
          {!appNudgeEnabled && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              ⚠ Incomplete application nudge is disabled. 5 applications are currently stalled at The Monroe.
            </div>
          )}
        </div>
      </Card>

      {/* ── 3. Property-Specific Rules ──────────────────────────────────── */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-900">Property Leasing Rules</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Override defaults for a specific property. Select a property to configure.
        </p>

        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500">Editing rules for:</span>
            <select className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 focus:border-gray-400 focus:outline-none">
              <option>The Monroe</option>
              <option>Parkview Commons</option>
              <option>Sonoran Ridge</option>
              <option>All Properties (default)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 divide-y divide-gray-50">
          {divider}
          <SettingRow
            label="Active special offer"
            description="This will be included automatically in the AI's first response and follow-ups."
          >
            <input
              type="text"
              value={special}
              onChange={(e) => setSpecial(e.target.value)}
              placeholder="e.g. 1 month free on 12-month leases"
              className="w-72 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 focus:border-gray-400 focus:outline-none"
            />
          </SettingRow>
          {divider}
          <SettingRow
            label="Application link"
            description="The link AI will send when pushing leads to apply."
          >
            <input
              type="url"
              value={appLink}
              onChange={(e) => setAppLink(e.target.value)}
              className="w-72 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-mono text-gray-700 focus:border-gray-400 focus:outline-none"
            />
          </SettingRow>
          {divider}
          <SettingRow
            label="Tour scheduling window"
            description="AI will only offer tours during these hours."
          >
            <SelectInput value={tourWindow} onChange={setTourWindow} options={TOUR_WINDOWS} />
          </SettingRow>
          {divider}
          <SettingRow
            label="Confirm before showing availability"
            description="AI checks with you before confirming specific unit availability to a lead."
          >
            <Toggle enabled={confirmAvailability} onToggle={() => setConfirmAvailability((v) => !v)} />
          </SettingRow>
          {divider}
          <SettingRow
            label="Reply outside office hours"
            description="If disabled, AI will hold replies until the next business day."
          >
            <div className="flex items-center gap-2">
              <Toggle enabled={!officeHoursOnly} onToggle={() => setOfficeHoursOnly((v) => !v)} />
              <span className="text-xs text-gray-500">{officeHoursOnly ? "Office hours only" : "24/7 AI replies"}</span>
            </div>
          </SettingRow>
        </div>
      </Card>

      {/* ── 4. Message Templates ────────────────────────────────────────── */}
      <Card>
        <h2 className="text-sm font-semibold text-gray-900">Message Templates</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Customize the AI's outgoing messages. Use <code className="rounded bg-gray-100 px-1 font-mono text-[11px]">{"{{variable}}"}</code> for dynamic fields.
        </p>

        <div className="mt-4 flex gap-4">
          {/* Template selector */}
          <div className="w-48 shrink-0 space-y-1">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTemplate(t.id)}
                className={cn(
                  "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                  activeTemplate === t.id
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <p className={cn("text-xs font-medium", activeTemplate === t.id ? "text-white" : "text-gray-900")}>
                  {t.label}
                </p>
                <p className={cn("mt-0.5 text-[10px] leading-tight", activeTemplate === t.id ? "text-gray-400" : "text-gray-400")}>
                  {t.tag}
                </p>
              </button>
            ))}
          </div>

          {/* Editor */}
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-900">{currentTemplate.label}</p>
                <p className="text-[11px] text-gray-400">{currentTemplate.tag}</p>
              </div>
              <button
                onClick={saveTemplate}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  saved
                    ? "bg-green-50 text-green-700"
                    : "bg-gray-900 text-white hover:bg-gray-700"
                )}
              >
                {saved ? "✓ Saved" : "Save Template"}
              </button>
            </div>
            <textarea
              value={editingBody}
              onChange={(e) => { setEditingBody(e.target.value); setSaved(false); }}
              rows={7}
              className="w-full rounded-xl border border-gray-200 p-4 text-xs leading-relaxed text-gray-700 focus:border-gray-400 focus:outline-none resize-none font-mono"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {["{{first_name}}", "{{property_name}}", "{{tour_time}}", "{{application_link}}", "{{property_address}}"].map((v) => (
                <button
                  key={v}
                  onClick={() => setEditingBody((b) => b + v)}
                  className="rounded bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-600 transition-colors hover:bg-gray-200"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ── 5. Safety / Guardrails ──────────────────────────────────────── */}
      <Card>
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Safety & Guardrails</h2>
          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
            Recommended: all on
          </span>
        </div>
        <p className="text-xs text-gray-500">
          Hard rules that govern what the AI is allowed to say. Disabling these may reduce trust and increase liability.
        </p>

        <div className="mt-4 divide-y divide-gray-50">
          {[
            {
              label: "Never invent pricing",
              description: "AI will not quote specific rents or fees unless they are configured in the property settings.",
              value: noInventPrice,
              toggle: () => setNoInventPrice((v) => !v),
            },
            {
              label: "Never promise availability",
              description: "AI will not confirm that a specific unit is available unless availability is synced and confirmed.",
              value: noPromiseAvail,
              toggle: () => setNoPromiseAvail((v) => !v),
            },
            {
              label: "Always ask qualifying questions",
              description: "AI will collect move-in timeline, bedroom count, and budget before offering a tour.",
              value: alwaysQualify,
              toggle: () => setAlwaysQualify((v) => !v),
            },
            {
              label: "Escalate to human if lead requests",
              description: "If a lead asks to speak to a person, AI will offer to connect them with a leasing agent.",
              value: humanEscalate,
              toggle: () => setHumanEscalate((v) => !v),
            },
          ].map((g, i) => (
            <div key={i}>
              {divider}
              <SettingRow label={g.label} description={g.description}>
                <Toggle enabled={g.value} onToggle={g.toggle} />
              </SettingRow>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-xs leading-relaxed text-violet-700">
          <span className="font-semibold">Note:</span> These guardrails are enforced at the AI model level. They apply across all properties and cannot be overridden per-property.
        </div>
      </Card>
    </div>
  );
}
