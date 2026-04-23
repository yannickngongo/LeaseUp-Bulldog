"use client";

import { useState, useEffect } from "react";
import { getOperatorEmail } from "@/lib/demo-auth";

// ─── Types ────────────────────────────────────────────────────────────────────

type TriggerType = "new_lead" | "no_reply" | "tour_scheduled" | "tour_completed" | "application_submitted" | "lease_expiring";
type ActionType  = "send_sms" | "send_followup" | "notify_agent" | "mark_hot";

interface Automation {
  id: string;
  name: string;
  trigger: TriggerType;
  triggerLabel: string;
  triggerDetail: string;
  action: ActionType;
  actionLabel: string;
  actionDetail: string;
  enabled: boolean;
  runsTotal: number;
  runLast7d: number;
  category: "follow_up" | "nurture" | "conversion" | "retention";
  isCustom?: boolean;
}

// ─── Default automations ──────────────────────────────────────────────────────

const DEFAULT_AUTOMATIONS: Automation[] = [
  {
    id: "auto-1",
    name: "Instant New Lead Reply",
    trigger: "new_lead",
    triggerLabel: "New lead comes in",
    triggerDetail: "Any inbound SMS or web form submission",
    action: "send_sms",
    actionLabel: "AI sends instant reply",
    actionDetail: "Within 60 seconds — introduces property, asks about move-in date",
    enabled: true,
    runsTotal: 0,
    runLast7d: 0,
    category: "follow_up",
  },
  {
    id: "auto-2",
    name: "48-Hour No-Reply Follow-Up",
    trigger: "no_reply",
    triggerLabel: "No reply in 48 hours",
    triggerDetail: "Lead contacted but hasn't responded",
    action: "send_followup",
    actionLabel: "AI sends follow-up nudge",
    actionDetail: "Friendly check-in with current availability and special offer",
    enabled: true,
    runsTotal: 0,
    runLast7d: 0,
    category: "follow_up",
  },
  {
    id: "auto-3",
    name: "Tour Confirmation Reminder",
    trigger: "tour_scheduled",
    triggerLabel: "Tour is scheduled",
    triggerDetail: "24 hours before the tour time",
    action: "send_sms",
    actionLabel: "Send tour reminder SMS",
    actionDetail: "Confirms the tour, includes address and parking info",
    enabled: true,
    runsTotal: 0,
    runLast7d: 0,
    category: "conversion",
  },
  {
    id: "auto-4",
    name: "Post-Tour Application Push",
    trigger: "tour_completed",
    triggerLabel: "Tour is completed",
    triggerDetail: "Same day as the tour (4–6 hours after)",
    action: "send_sms",
    actionLabel: "Send application link",
    actionDetail: "Strikes while the iron is hot — application link + concession if available",
    enabled: true,
    runsTotal: 0,
    runLast7d: 0,
    category: "conversion",
  },
  {
    id: "auto-5",
    name: "7-Day Ghosted Lead Recovery",
    trigger: "no_reply",
    triggerLabel: "No reply in 7 days",
    triggerDetail: "Lead has been silent for a full week",
    action: "send_followup",
    actionLabel: "AI sends breakup text",
    actionDetail: "Last-chance message — creates urgency with limited availability",
    enabled: false,
    runsTotal: 0,
    runLast7d: 0,
    category: "nurture",
  },
  {
    id: "auto-6",
    name: "Lease Renewal Early Warning",
    trigger: "lease_expiring",
    triggerLabel: "Lease expires in 90 days",
    triggerDetail: "Triggered 90, 60, and 30 days before lease end",
    action: "send_sms",
    actionLabel: "Send renewal offer SMS",
    actionDetail: "Personalized renewal terms with an early-bird incentive",
    enabled: true,
    runsTotal: 0,
    runLast7d: 0,
    category: "retention",
  },
  {
    id: "auto-7",
    name: "Hot Lead Agent Alert",
    trigger: "application_submitted",
    triggerLabel: "Application submitted",
    triggerDetail: "Lead fills out rental application",
    action: "notify_agent",
    actionLabel: "Alert leasing agent",
    actionDetail: "Immediate SMS to agent — applicant name, unit, and contact info",
    enabled: true,
    runsTotal: 0,
    runLast7d: 0,
    category: "conversion",
  },
  {
    id: "auto-8",
    name: "Referral Ask After Move-In",
    trigger: "tour_completed",
    triggerLabel: "Lease signed (move-in)",
    triggerDetail: "3 days after lease is marked as Won",
    action: "send_sms",
    actionLabel: "Ask for referral",
    actionDetail: "Congratulates new resident, asks if they know anyone looking — converts at 3× cold leads",
    enabled: false,
    runsTotal: 0,
    runLast7d: 0,
    category: "nurture",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  follow_up:  "Follow-Up",
  nurture:    "Nurture",
  conversion: "Conversion",
  retention:  "Retention",
};

const CATEGORY_COLORS: Record<string, string> = {
  follow_up:  "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400",
  nurture:    "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400",
  conversion: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400",
  retention:  "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
};

const ACTION_ICONS: Record<ActionType, string> = {
  send_sms:      "💬",
  send_followup: "🔁",
  notify_agent:  "👤",
  mark_hot:      "🔥",
};

// ─── Create Modal ─────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS: { value: TriggerType; label: string; detail: string }[] = [
  { value: "new_lead",            label: "New lead comes in",       detail: "Inbound SMS or web form" },
  { value: "no_reply",            label: "No reply after X hours",  detail: "Lead went silent" },
  { value: "tour_scheduled",      label: "Tour scheduled",          detail: "Lead books a tour" },
  { value: "tour_completed",      label: "Tour completed",          detail: "Tour marked as done" },
  { value: "application_submitted", label: "Application submitted", detail: "Lead fills out application" },
  { value: "lease_expiring",      label: "Lease expiring soon",     detail: "90 / 60 / 30 days before end" },
];

const ACTION_OPTIONS: { value: ActionType; label: string; detail: string }[] = [
  { value: "send_sms",      label: "Send AI SMS",          detail: "AI drafts and sends a text message" },
  { value: "send_followup", label: "Send follow-up text",  detail: "Automated follow-up based on context" },
  { value: "notify_agent",  label: "Alert leasing agent",  detail: "Sends SMS alert to your agent" },
  { value: "mark_hot",      label: "Flag as hot lead",     detail: "Moves lead to top of priority queue" },
];

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (a: Automation) => void }) {
  const [name, setName]           = useState("");
  const [trigger, setTrigger]     = useState<TriggerType>("new_lead");
  const [action, setAction]       = useState<ActionType>("send_sms");
  const [customMsg, setCustomMsg] = useState("");

  function handleCreate() {
    if (!name.trim()) return;
    const triggerOpt = TRIGGER_OPTIONS.find((t) => t.value === trigger)!;
    const actionOpt  = ACTION_OPTIONS.find((a)  => a.value === action)!;
    onCreate({
      id:            `custom-${Date.now()}`,
      name:          name.trim(),
      trigger,
      triggerLabel:  triggerOpt.label,
      triggerDetail: triggerOpt.detail,
      action,
      actionLabel:   actionOpt.label,
      actionDetail:  customMsg || actionOpt.detail,
      enabled:       true,
      runsTotal:     0,
      runLast7d:     0,
      category:      "follow_up",
      isCustom:      true,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1C1F2E]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/5">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">Create Automation</h2>
          <button onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">×</button>
        </div>
        <div className="space-y-5 p-6">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 3-Day Silent Lead Recovery"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Trigger — when should this run?</label>
            <div className="space-y-2">
              {TRIGGER_OPTIONS.map((t) => (
                <button key={t.value} onClick={() => setTrigger(t.value)}
                  className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                    trigger === t.value
                      ? "border-[#C8102E] bg-[#C8102E]/5 dark:bg-[#C8102E]/10"
                      : "border-gray-200 hover:border-gray-300 dark:border-white/10"
                  }`}>
                  <span className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${trigger === t.value ? "border-[#C8102E] bg-[#C8102E]" : "border-gray-300 dark:border-white/30"}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.label}</p>
                    <p className="text-xs text-gray-400">{t.detail}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Action — what should happen?</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ACTION_OPTIONS.map((a) => (
                <button key={a.value} onClick={() => setAction(a.value)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    action === a.value
                      ? "border-[#C8102E] bg-[#C8102E]/5 dark:bg-[#C8102E]/10"
                      : "border-gray-200 hover:border-gray-300 dark:border-white/10"
                  }`}>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ACTION_ICONS[a.value]} {a.label}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{a.detail}</p>
                </button>
              ))}
            </div>
          </div>

          {(action === "send_sms" || action === "send_followup") && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-gray-300">Custom Message Guidance <span className="font-normal text-gray-400">(optional — AI will use this as direction)</span></label>
              <textarea
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                rows={3}
                placeholder='e.g. "Mention the rooftop deck and the $500 move-in special. Keep it under 2 sentences."'
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-gray-100 placeholder-gray-400"
              />
            </div>
          )}
        </div>
        <div className="flex gap-3 border-t border-gray-100 px-6 py-4 dark:border-white/5">
          <button onClick={handleCreate} disabled={!name.trim()}
            className="flex-1 rounded-xl bg-[#C8102E] py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] disabled:opacity-40 transition-colors">
            Create Automation
          </button>
          <button onClick={onClose}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Automation Card ──────────────────────────────────────────────────────────

function AutomationCard({
  automation,
  onToggle,
  onDelete,
  canManage,
}: {
  automation: Automation;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  canManage: boolean;
}) {
  return (
    <div className={`relative flex flex-col gap-4 rounded-2xl border bg-white p-5 shadow-sm transition-all dark:bg-[#1C1F2E] ${
      automation.enabled
        ? "border-gray-100 dark:border-white/5"
        : "border-dashed border-gray-200 opacity-60 dark:border-white/10"
    }`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{automation.name}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CATEGORY_COLORS[automation.category]}`}>
              {CATEGORY_LABELS[automation.category]}
            </span>
            {automation.isCustom && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-white/10 dark:text-gray-400">Custom</span>
            )}
          </div>
        </div>

        {/* Toggle — read-only for sub-accounts */}
        {canManage ? (
          <button
            onClick={() => onToggle(automation.id)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${automation.enabled ? "bg-[#C8102E]" : "bg-gray-200 dark:bg-white/20"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${automation.enabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
          </button>
        ) : (
          <div className={`relative h-6 w-11 shrink-0 rounded-full opacity-50 cursor-not-allowed ${automation.enabled ? "bg-[#C8102E]" : "bg-gray-200 dark:bg-white/20"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${automation.enabled ? "translate-x-[22px]" : "translate-x-0.5"}`} />
          </div>
        )}
      </div>

      {/* Rule flow */}
      <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3 dark:bg-white/5">
        <div className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">When</p>
          <p className="mt-0.5 text-xs font-semibold text-gray-800 dark:text-gray-200">{automation.triggerLabel}</p>
          <p className="text-[10px] text-gray-400">{automation.triggerDetail}</p>
        </div>
        <svg className="h-5 w-5 shrink-0 text-[#C8102E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
        <div className="flex-1 rounded-lg border border-[#C8102E]/20 bg-[#C8102E]/5 px-3 py-2 dark:bg-[#C8102E]/10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#C8102E]">Then</p>
          <p className="mt-0.5 text-xs font-semibold text-gray-800 dark:text-gray-200">{automation.actionLabel}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-400">{automation.actionDetail}</p>
        </div>
      </div>

      {/* Stats + delete */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div>
            <p className="text-[10px] text-gray-400">All time</p>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{automation.runsTotal} runs</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400">Last 7 days</p>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{automation.runLast7d} runs</p>
          </div>
        </div>
        {canManage && automation.isCustom && (
          <button onClick={() => onDelete(automation.id)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "lub_automations_v1";

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [showCreate, setShowCreate]   = useState(false);
  const [filter, setFilter]           = useState<"all" | "enabled" | "disabled">("all");
  const [canManage, setCanManage]     = useState(true);

  // Resolve role
  useEffect(() => {
    getOperatorEmail().then(async (email) => {
      if (!email) return;
      const res = await fetch(`/api/org/members?email=${encodeURIComponent(email)}`);
      if (!res.ok) return;
      const json = await res.json();
      const members: { email: string; role: string }[] = json.members ?? [];
      const me = members.find((m) => m.email === email);
      const isOwner = !me || me.role === "owner";
      setCanManage(isOwner || me?.role === "admin");
    });
  }, []);

  // Load from localStorage (merge with defaults)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Automation[] = JSON.parse(stored);
        // Merge: keep stored enabled state for defaults, keep all custom
        const merged = DEFAULT_AUTOMATIONS.map((def) => {
          const found = parsed.find((p) => p.id === def.id);
          return found ? { ...def, enabled: found.enabled } : def;
        });
        const customs = parsed.filter((p) => p.isCustom);
        setAutomations([...merged, ...customs]);
      } else {
        setAutomations(DEFAULT_AUTOMATIONS);
      }
    } catch {
      setAutomations(DEFAULT_AUTOMATIONS);
    }
  }, []);

  function save(updated: Automation[]) {
    setAutomations(updated);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
  }

  function toggle(id: string) {
    save(automations.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a));
  }

  function deleteAuto(id: string) {
    save(automations.filter((a) => a.id !== id));
  }

  function handleCreate(newAuto: Automation) {
    save([...automations, newAuto]);
  }

  const filtered = automations.filter((a) =>
    filter === "all" ? true : filter === "enabled" ? a.enabled : !a.enabled
  );

  const enabledCount  = automations.filter((a) => a.enabled).length;
  const disabledCount = automations.filter((a) => !a.enabled).length;

  return (
    <div className="space-y-6 p-4 lg:p-6">

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Automations</h1>
          <p className="mt-0.5 text-sm text-gray-400 dark:text-gray-500">Set rules once — LUB runs them forever</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-[#C8102E] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#A50D25] transition-colors"
            style={{ boxShadow: "0 4px 16px rgba(200,16,46,0.25)" }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create Automation
          </button>
        )}
      </div>

      {/* Stats banner */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active",   value: enabledCount,  color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-900/20" },
          { label: "Paused",   value: disabledCount, color: "text-gray-500 dark:text-gray-400",    bg: "bg-gray-100 dark:bg-white/5" },
          { label: "Total",    value: automations.length, color: "text-gray-900 dark:text-gray-100", bg: "bg-white dark:bg-[#1C1F2E]" },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border border-gray-100 p-4 shadow-sm dark:border-white/5 ${s.bg}`}>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{s.label}</p>
            <p className={`mt-1 text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-100 bg-gray-50 p-1 dark:border-white/5 dark:bg-white/5 w-fit">
        {(["all", "enabled", "disabled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
              filter === f
                ? "bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-gray-100"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {f === "all" ? `All (${automations.length})` : f === "enabled" ? `Active (${enabledCount})` : `Paused (${disabledCount})`}
          </button>
        ))}
      </div>

      {/* Automations grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((a) => (
          <AutomationCard key={a.id} automation={a} onToggle={toggle} onDelete={deleteAuto} canManage={canManage} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-gray-400">No automations in this filter.</p>
        </div>
      )}

      {/* Info banner */}
      <div className="rounded-2xl border border-[#C8102E]/15 bg-[#C8102E]/5 p-5 dark:bg-[#C8102E]/10">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C8102E]/10">
            <svg className="h-5 w-5 text-[#C8102E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">How automations work</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              Every automation runs against your live lead and tenant data. When a trigger fires, LUB AI crafts the message using real context — the lead&apos;s name, the property they inquired about, your active specials, and their place in the pipeline. You set the rule once. LUB handles every lead from that point forward, 24/7.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
