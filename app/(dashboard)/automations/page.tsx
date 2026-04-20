"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { getOperatorEmail } from "@/lib/demo-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Property { id: string; name: string; }

interface OperatorSettings {
  instantEnabled:   boolean;
  responseTarget:   number;
  tone:             string;
  followupEnabled:  boolean;
  noReplyMins:      number;
  tourNudgeEnabled: boolean;
  noTourHrs:        number;
  appNudgeEnabled:  boolean;
  incompleteAppHrs: number;
  noInventPrice:    boolean;
  noPromiseAvail:   boolean;
  alwaysQualify:    boolean;
  humanEscalate:    boolean;
  templates: Record<string, string>;
}

interface PropertySettings {
  active_special:       string;
  application_link:     string;
  tour_window:          string;
  confirm_availability: boolean;
  office_hours_only:    boolean;
}

const DEFAULT_SETTINGS: OperatorSettings = {
  instantEnabled: true, responseTarget: 60, tone: "friendly",
  followupEnabled: true, noReplyMins: 180,
  tourNudgeEnabled: true, noTourHrs: 48,
  appNudgeEnabled: false, incompleteAppHrs: 72,
  noInventPrice: true, noPromiseAvail: true, alwaysQualify: true, humanEscalate: true,
  templates: {
    first_response: "Hi {{first_name}}! 👋 Thanks for your interest in {{property_name}}. I'm the AI leasing assistant — I'm here 24/7 to answer questions and help you schedule a tour.\n\nA few quick questions: When are you looking to move? And how many bedrooms do you need?",
    followup:       "Hey {{first_name}}, just checking in! We still have availability at {{property_name}} and I'd love to help you find the right fit.\n\nWould a tour this week work for you?",
    tour_reminder:  "Hi {{first_name}}, just a reminder that your tour at {{property_name}} is scheduled for tomorrow at {{tour_time}}.\n\n📍 {{property_address}}\n\nReply CONFIRM to confirm or RESCHEDULE if needed.",
    app_push:       "{{first_name}}, it was great meeting you! Ready to move forward?\n\n{{application_link}}\n\nIt only takes about 10 minutes!",
  },
};

const DEFAULT_PROP_SETTINGS: PropertySettings = {
  active_special: "", application_link: "", tour_window: "9am-6pm",
  confirm_availability: true, office_hours_only: false,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors",
        enabled ? "bg-[#C8102E]" : "bg-gray-200 dark:bg-white/20"
      )}
    >
      <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform", enabled ? "translate-x-4" : "translate-x-0")} />
    </button>
  );
}

function SettingRow({ label, description, children, danger }: {
  label: string; description?: string; children: React.ReactNode; danger?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div className="flex-1">
        <p className={cn("text-sm font-medium", danger ? "text-red-600" : "text-gray-900 dark:text-gray-100")}>{label}</p>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>}
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
      <input type="number" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 rounded-lg border border-gray-200 px-2.5 py-1.5 text-center text-sm font-semibold text-gray-900 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-100" />
      <span className="text-xs text-gray-500">{suffix}</span>
    </div>
  );
}

function SelectInput({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-[#1C1F2E] dark:text-gray-300">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 dark:bg-white/5 ${className ?? ""}`} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AutomationsPage() {
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [savedMsg, setSavedMsg]             = useState("");
  const [email, setEmail]                   = useState("");
  const [properties, setProperties]         = useState<Property[]>([]);
  const [selectedPropId, setSelectedPropId] = useState("__global__");
  const [settings, setSettings]             = useState<OperatorSettings>(DEFAULT_SETTINGS);
  const [propSettings, setPropSettings]     = useState<Record<string, PropertySettings>>({});
  const [activeTemplate, setActiveTemplate] = useState("first_response");
  const [editingBody, setEditingBody]       = useState(DEFAULT_SETTINGS.templates.first_response);

  const TEMPLATE_META = [
    { id: "first_response", label: "First Response",        tag: "Sent within 60s of lead creation" },
    { id: "followup",       label: "Day 3 Follow-Up",       tag: "Sent if no reply in 3 days" },
    { id: "tour_reminder",  label: "Tour Reminder",         tag: "Sent 24h before scheduled tour" },
    { id: "app_push",       label: "Application Push",      tag: "Sent 24h after tour if no app started" },
  ];

  const currentPropSettings: PropertySettings = selectedPropId === "__global__"
    ? DEFAULT_PROP_SETTINGS
    : (propSettings[selectedPropId] ?? DEFAULT_PROP_SETTINGS);

  const updatePropSetting = useCallback((key: keyof PropertySettings, value: unknown) => {
    if (selectedPropId === "__global__") return;
    setPropSettings(prev => ({
      ...prev,
      [selectedPropId]: { ...(prev[selectedPropId] ?? DEFAULT_PROP_SETTINGS), [key]: value },
    }));
  }, [selectedPropId]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const email = await getOperatorEmail();
        if (!email) return;
        setEmail(email);

        const res = await fetch(`/api/automations/settings?email=${encodeURIComponent(email)}`);
        const json = await res.json();

        if (json.settings) setSettings({ ...DEFAULT_SETTINGS, ...json.settings });
        if (json.properties?.length) {
          setProperties(json.properties);
          setSelectedPropId(json.properties[0].id);
        }
        if (json.propertySettings) setPropSettings(json.propertySettings);
        const firstTemplate = json.settings?.templates?.first_response ?? DEFAULT_SETTINGS.templates.first_response;
        setEditingBody(firstTemplate);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function selectTemplate(id: string) {
    // Save current editing body into settings before switching
    setSettings(prev => ({ ...prev, templates: { ...prev.templates, [activeTemplate]: editingBody } }));
    setActiveTemplate(id);
    setEditingBody(settings.templates[id] ?? "");
  }

  async function saveAll() {
    if (!email) return;
    setSaving(true);
    try {
      // Merge current editing body
      const finalSettings = { ...settings, templates: { ...settings.templates, [activeTemplate]: editingBody } };

      await fetch("/api/automations/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, settings: finalSettings }),
      });

      // Save per-property settings
      for (const [propId, ps] of Object.entries(propSettings)) {
        await fetch("/api/automations/settings", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ propertyId: propId, settings: ps }),
        });
      }

      setSettings(finalSettings);
      setSavedMsg("Saved!");
      setTimeout(() => setSavedMsg(""), 2500);
    } finally {
      setSaving(false);
    }
  }

  const TONE_OPTS = [
    { value: "friendly",     label: "Friendly & Warm" },
    { value: "professional", label: "Professional" },
    { value: "concise",      label: "Direct & Concise" },
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

  const set = (key: keyof OperatorSettings) => (value: unknown) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  const divider = <div className="border-t border-gray-50 dark:border-white/5" />;

  return (
    <div className="space-y-8 p-4 lg:p-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Automation Settings</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            Configure how LUB responds to leads, follows up, and converts.
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving || loading}
          className={cn(
            "rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
            savedMsg ? "bg-green-50 text-green-700" : "bg-[#C8102E] text-white hover:bg-[#A50D25] disabled:opacity-50"
          )}
        >
          {savedMsg || (saving ? "Saving…" : "Save All Changes")}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
        </div>
      ) : (
        <>
          {/* 1. Instant Response */}
          <Card>
            <div className="mb-1 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Instant Response</h2>
                <p className="mt-0.5 text-xs text-gray-500">AI replies to every new lead within seconds of creation.</p>
              </div>
              <Toggle enabled={settings.instantEnabled} onToggle={() => set("instantEnabled")(!settings.instantEnabled)} />
            </div>
            <div className={cn("mt-4 divide-y divide-gray-50 transition-opacity", !settings.instantEnabled && "pointer-events-none opacity-40")}>
              {divider}
              <SettingRow label="Response target" description="How quickly the AI sends the first message after a lead is created.">
                <NumberInput value={settings.responseTarget} onChange={set("responseTarget")} suffix="seconds" min={10} max={300} />
              </SettingRow>
              {divider}
              <SettingRow label="AI tone" description="Sets the personality for all AI-generated messages.">
                <SelectInput value={settings.tone} onChange={set("tone")} options={TONE_OPTS} />
              </SettingRow>
              {divider}
              <div className="py-4">
                <p className="mb-2 text-xs font-medium text-gray-500">Tone preview</p>
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-white/5 dark:bg-white/5">
                  <p className="text-xs leading-relaxed text-gray-600 italic dark:text-gray-400">"{TONE_PREVIEWS[settings.tone]}"</p>
                </div>
              </div>
            </div>
          </Card>

          {/* 2. Follow-Up Rules */}
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Follow-Up Rules</h2>
            <p className="mt-0.5 text-xs text-gray-500">Define when and how the AI re-engages silent or stalled leads.</p>
            <div className="mt-4 divide-y divide-gray-50">
              {divider}
              <SettingRow label="No reply follow-up" description="Send a follow-up if a lead hasn't replied after a set time.">
                <div className="flex items-center gap-3">
                  <Toggle enabled={settings.followupEnabled} onToggle={() => set("followupEnabled")(!settings.followupEnabled)} />
                  <NumberInput value={settings.noReplyMins} onChange={set("noReplyMins")} suffix="min" min={30} max={2880} />
                </div>
              </SettingRow>
              {divider}
              <SettingRow label="No tour booked nudge" description="Prompt the lead to schedule if they've engaged but haven't booked a tour.">
                <div className="flex items-center gap-3">
                  <Toggle enabled={settings.tourNudgeEnabled} onToggle={() => set("tourNudgeEnabled")(!settings.tourNudgeEnabled)} />
                  <NumberInput value={settings.noTourHrs} onChange={set("noTourHrs")} suffix="hrs" min={12} max={168} />
                </div>
              </SettingRow>
              {divider}
              <SettingRow label="Incomplete application nudge" description="Re-engage leads who started but haven't completed their application.">
                <div className="flex items-center gap-3">
                  <Toggle enabled={settings.appNudgeEnabled} onToggle={() => set("appNudgeEnabled")(!settings.appNudgeEnabled)} />
                  <div className={cn(!settings.appNudgeEnabled && "opacity-40 pointer-events-none")}>
                    <NumberInput value={settings.incompleteAppHrs} onChange={set("incompleteAppHrs")} suffix="hrs" min={12} max={168} />
                  </div>
                </div>
              </SettingRow>
            </div>
          </Card>

          {/* 3. Property Rules */}
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Property Leasing Rules</h2>
            <p className="mt-0.5 text-xs text-gray-500">Per-property overrides. Select a property to configure.</p>

            {properties.length > 0 && (
              <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Editing rules for:</span>
                  <select
                    value={selectedPropId}
                    onChange={(e) => setSelectedPropId(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-[#1C1F2E] dark:text-gray-100"
                  >
                    {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            {selectedPropId !== "__global__" && (
              <div className="mt-4 divide-y divide-gray-50">
                {divider}
                <SettingRow label="Active special offer" description="Included automatically in AI's first response and follow-ups.">
                  <input type="text" value={currentPropSettings.active_special}
                    onChange={(e) => updatePropSetting("active_special", e.target.value)}
                    placeholder="e.g. 1 month free on 12-month leases"
                    className="w-72 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-300" />
                </SettingRow>
                {divider}
                <SettingRow label="Application link" description="The link AI will send when pushing leads to apply.">
                  <input type="url" value={currentPropSettings.application_link}
                    onChange={(e) => updatePropSetting("application_link", e.target.value)}
                    placeholder="https://apply.yourproperty.com"
                    className="w-72 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-mono text-gray-700 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-300" />
                </SettingRow>
                {divider}
                <SettingRow label="Tour scheduling window" description="AI will only offer tours during these hours.">
                  <SelectInput value={currentPropSettings.tour_window}
                    onChange={(v) => updatePropSetting("tour_window", v)} options={TOUR_WINDOWS} />
                </SettingRow>
                {divider}
                <SettingRow label="Confirm before showing availability" description="AI checks with you before confirming specific unit availability.">
                  <Toggle enabled={currentPropSettings.confirm_availability}
                    onToggle={() => updatePropSetting("confirm_availability", !currentPropSettings.confirm_availability)} />
                </SettingRow>
                {divider}
                <SettingRow label="Reply outside office hours" description="If disabled, AI holds replies until the next business day.">
                  <div className="flex items-center gap-2">
                    <Toggle enabled={!currentPropSettings.office_hours_only}
                      onToggle={() => updatePropSetting("office_hours_only", !currentPropSettings.office_hours_only)} />
                    <span className="text-xs text-gray-500">{currentPropSettings.office_hours_only ? "Office hours only" : "24/7 AI replies"}</span>
                  </div>
                </SettingRow>
              </div>
            )}
          </Card>

          {/* 4. Message Templates */}
          <Card>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Message Templates</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Customize the AI's outgoing messages. Use <code className="rounded bg-gray-100 px-1 font-mono text-[11px] dark:bg-white/10">{"{{variable}}"}</code> for dynamic fields.
            </p>

            <div className="mt-4 flex gap-4">
              <div className="w-48 shrink-0 space-y-1">
                {TEMPLATE_META.map((t) => (
                  <button key={t.id} onClick={() => selectTemplate(t.id)}
                    className={cn(
                      "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                      activeTemplate === t.id ? "bg-gray-900 text-white dark:bg-white/10" : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
                    )}>
                    <p className={cn("text-xs font-medium", activeTemplate === t.id ? "text-white" : "text-gray-900 dark:text-gray-100")}>{t.label}</p>
                    <p className="mt-0.5 text-[10px] leading-tight text-gray-400">{t.tag}</p>
                  </button>
                ))}
              </div>

              <div className="flex-1">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{TEMPLATE_META.find(t => t.id === activeTemplate)?.label}</p>
                    <p className="text-[11px] text-gray-400">{TEMPLATE_META.find(t => t.id === activeTemplate)?.tag}</p>
                  </div>
                </div>
                <textarea value={editingBody} onChange={(e) => setEditingBody(e.target.value)} rows={7}
                  className="w-full rounded-xl border border-gray-200 p-4 text-xs leading-relaxed text-gray-700 focus:border-gray-400 focus:outline-none resize-none font-mono dark:border-white/10 dark:bg-white/5 dark:text-gray-300" />
                <div className="mt-2 flex flex-wrap gap-2">
                  {["{{first_name}}", "{{property_name}}", "{{tour_time}}", "{{application_link}}", "{{property_address}}"].map((v) => (
                    <button key={v} onClick={() => setEditingBody(b => b + v)}
                      className="rounded bg-gray-100 px-2 py-0.5 font-mono text-[10px] text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20">
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* 5. Safety Guardrails */}
          <Card>
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Safety & Guardrails</h2>
              <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/20 dark:text-violet-400">
                Recommended: all on
              </span>
            </div>
            <p className="text-xs text-gray-500">Hard rules governing what the AI is allowed to say.</p>
            <div className="mt-4 divide-y divide-gray-50">
              {[
                { key: "noInventPrice" as const,  label: "Never invent pricing",           description: "AI will not quote specific rents unless configured in property settings." },
                { key: "noPromiseAvail" as const, label: "Never promise availability",      description: "AI will not confirm a specific unit is available without synced data." },
                { key: "alwaysQualify" as const,  label: "Always ask qualifying questions", description: "AI collects move-in timeline, bedroom count, and budget before offering a tour." },
                { key: "humanEscalate" as const,  label: "Escalate to human if requested",  description: "If a lead asks to speak to a person, AI will offer to connect them with an agent." },
              ].map((g) => (
                <div key={g.key}>
                  {divider}
                  <SettingRow label={g.label} description={g.description}>
                    <Toggle enabled={settings[g.key] as boolean} onToggle={() => set(g.key)(!settings[g.key])} />
                  </SettingRow>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-xs leading-relaxed text-violet-700 dark:border-violet-900/30 dark:bg-violet-900/10 dark:text-violet-400">
              <span className="font-semibold">Note:</span> These guardrails apply across all properties and cannot be overridden per-property.
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
