"use client";

// Tabbed lead profile (Contact info / Conversation / Activity).
// Reference: brand assets/lead.jpg — clean cards, action buttons,
// underline tab navigation. Conversation tab keeps the manual reply +
// auto AI-pause functionality.

import { useState } from "react";
import Link from "next/link";
import { ManualReplyBox } from "@/components/leads/ManualReplyBox";
import { ConsentAuditTrail } from "@/components/leads/ConsentAuditTrail";
import { MarkLeaseSignedButton } from "@/components/leads/MarkLeaseSignedButton";
import type { LeadStatus } from "@/lib/types";
import type { Conversation } from "@/types/lead";

interface LeadRow {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  status: LeadStatus;
  source?: string | null;
  preferred_contact?: "sms" | "email" | "call" | null;
  property_id: string;
  property_name?: string | null;
  property_phone?: string | null;
  move_in_date?: string | null;
  bedrooms?: number | null;
  budget_min?: number | null;
  budget_max?: number | null;
  pets?: boolean | null;
  ai_score?: number | null;
  ai_summary?: string | null;
  ai_paused?: boolean | null;
  notes?: string | null;
  created_at: string;
  last_contacted_at?: string | null;
  first_contact_date?: string | null;
  attribution_window_end?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  opt_out?: boolean | null;
  opt_out_at?: string | null;
  ingestion_metadata?: Record<string, unknown> | null;
}

const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New", contacted: "Contacted", engaged: "Engaged",
  tour_scheduled: "Tour Booked", applied: "Applied", won: "Won", lost: "Lost",
};
const STATUS_BG: Record<LeadStatus, string> = {
  new: "bg-gray-100 text-gray-600",
  contacted: "bg-sky-100 text-sky-700",
  engaged: "bg-violet-100 text-violet-700",
  tour_scheduled: "bg-amber-100 text-amber-700",
  applied: "bg-orange-100 text-orange-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-slate-100 text-slate-500",
};

function avatarGradient(id: string): string {
  const palette = [
    "linear-gradient(135deg, #C8102E, #A50D25)",
    "linear-gradient(135deg, #A78BFA, #7C5BE6)",
    "linear-gradient(135deg, #F59E0B, #D97706)",
    "linear-gradient(135deg, #F87171, #C8102E)",
    "linear-gradient(135deg, #34D399, #059669)",
  ];
  return palette[id.charCodeAt(0) % palette.length];
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

type TabKey = "contact" | "conversation" | "activity";

export function LeadProfile({
  lead, conversations, performanceFeePerLease, operatorId,
}: {
  lead: LeadRow;
  conversations: Conversation[];
  performanceFeePerLease: number;
  operatorId: string;
}) {
  const [tab, setTab] = useState<TabKey>("contact");

  return (
    <main className="min-h-screen bg-[#F5F5F7] px-4 py-6 dark:bg-[#0A0B11] sm:px-8">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Back */}
        <Link href="/leads" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-3.5 w-3.5">
            <polyline points="10 13 5 8 10 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to leads
        </Link>

        {/* Header card */}
        <section className="relative rounded-2xl border border-gray-200/80 bg-white p-6 dark:border-white/5 dark:bg-[#10101A] sm:p-7">
          {/* Three-dot menu */}
          {operatorId && (
            <div className="absolute right-5 top-5">
              <MarkLeaseSignedButton
                leadId={lead.id}
                propertyId={lead.property_id}
                operatorId={operatorId}
                leadStatus={lead.status}
                firstContactDate={lead.first_contact_date ?? null}
                attributionWindowEnd={lead.attribution_window_end ?? null}
                performanceFeePerLease={performanceFeePerLease}
              />
            </div>
          )}

          {/* Avatar + identity */}
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white shadow-[0_10px_30px_rgba(200,16,46,0.25)]"
              style={{ background: avatarGradient(lead.id) }}
            >
              {initials(lead.name)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{lead.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_BG[lead.status]}`}>
                  {STATUS_LABEL[lead.status]}
                </span>
                {lead.property_name && (
                  <span className="text-xs text-gray-500 dark:text-gray-500">at {lead.property_name}</span>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex items-center gap-2">
                <ActionButton href={`tel:${lead.phone}`} label="Call" icon="phone" />
                {lead.email && <ActionButton href={`mailto:${lead.email}`} label="Email" icon="mail" />}
                <ActionButton href={`/conversations?lead=${lead.id}`} label="Chat" icon="chat" primary />
              </div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <nav className="flex items-center gap-6 border-b border-gray-200/80 px-1 dark:border-white/5">
          <TabButton active={tab === "contact"} onClick={() => setTab("contact")}>
            Contact info
          </TabButton>
          <TabButton active={tab === "conversation"} onClick={() => setTab("conversation")}>
            Conversation
            {conversations.length > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 text-[10px] font-bold ${tab === "conversation" ? "bg-[#C8102E] text-white" : "bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-400"}`}>
                {conversations.length}
              </span>
            )}
          </TabButton>
          <TabButton active={tab === "activity"} onClick={() => setTab("activity")}>
            Activity
          </TabButton>
        </nav>

        {/* Tab panels */}
        {tab === "contact" && <ContactInfoTab lead={lead} />}

        {tab === "conversation" && (
          <ConversationTab lead={lead} conversations={conversations} />
        )}

        {tab === "activity" && <ActivityTab lead={lead} conversations={conversations} />}
      </div>
    </main>
  );
}

// ─── Tab navigation button ───────────────────────────────────────────────────
function TabButton({
  active, onClick, children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex items-center px-1 pb-3 pt-2 text-sm transition-colors ${
        active ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      }`}
    >
      {children}
      <span
        className={`absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-[#C8102E] transition-all duration-200 ${
          active ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
        }`}
      />
    </button>
  );
}

// ─── Action button (call / email / chat) ─────────────────────────────────────
function ActionButton({
  href, label, icon, primary = false,
}: {
  href: string;
  label: string;
  icon: "phone" | "mail" | "chat";
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-all hover:scale-110 ${
        primary
          ? "bg-[#C8102E] text-white shadow-[0_4px_14px_rgba(200,16,46,0.25)] hover:bg-[#A50D25]"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
      }`}
      title={label}
      aria-label={label}
    >
      {icon === "phone" && (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M3 2h2.5l1 3-1.5 1a8 8 0 004 4l1-1.5 3 1V13a1 1 0 01-1 1A11 11 0 012 3a1 1 0 011-1z" />
        </svg>
      )}
      {icon === "mail" && (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
          <polyline points="2 4 8 9 14 4" />
        </svg>
      )}
      {icon === "chat" && (
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v6a2 2 0 01-2 2H6l-4 3V4z" />
        </svg>
      )}
    </a>
  );
}

// ─── Contact info tab (cards) ────────────────────────────────────────────────
function ContactInfoTab({ lead }: { lead: LeadRow }) {
  return (
    <div className="space-y-3">
      <InfoCard title="Basic">
        <Field label="Name" value={lead.name} />
        <Field label="Status" value={STATUS_LABEL[lead.status]} />
        <Field label="Source" value={lead.source ?? "—"} />
        <Field label="Preferred contact" value={lead.preferred_contact ?? "—"} />
      </InfoCard>

      <InfoCard title="Communication">
        <Field label="Phone" value={lead.phone} />
        <Field label="Email" value={lead.email ?? "—"} />
        <Field label="Property" value={lead.property_name ?? "—"} />
        <Field label="Property number" value={lead.property_phone ?? "—"} />
      </InfoCard>

      <InfoCard title="Qualification">
        <Field label="Move-in date" value={formatDate(lead.move_in_date)} />
        <Field
          label="Budget"
          value={lead.budget_min && lead.budget_max ? `$${lead.budget_min.toLocaleString()} – $${lead.budget_max.toLocaleString()}` : "—"}
        />
        <Field label="Bedrooms" value={lead.bedrooms != null ? `${lead.bedrooms === 0 ? "Studio" : lead.bedrooms}` : "—"} />
        <Field label="Pets" value={lead.pets == null ? "—" : lead.pets ? "Yes" : "No"} />
      </InfoCard>

      {(lead.ai_score != null || lead.ai_summary) && (
        <InfoCard title="AI Insights" accent="violet">
          {lead.ai_score != null && (
            <Field label="AI score" value={`${lead.ai_score}/10`} />
          )}
          {lead.ai_summary && (
            <div className="col-span-full mt-1">
              <p className="text-[11px] font-medium text-gray-400">Summary</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{lead.ai_summary}</p>
            </div>
          )}
        </InfoCard>
      )}

      {/* TCPA / consent record */}
      <ConsentAuditTrail
        createdAt={lead.created_at}
        firstContactDate={lead.first_contact_date ?? null}
        source={lead.source ?? undefined}
        utmSource={lead.utm_source ?? null}
        utmMedium={lead.utm_medium ?? null}
        utmCampaign={lead.utm_campaign ?? null}
        optOut={lead.opt_out ?? null}
        optOutAt={lead.opt_out_at ?? null}
        ingestionMetadata={lead.ingestion_metadata ?? null}
      />
    </div>
  );
}

function InfoCard({
  title, accent = "default", children,
}: {
  title: string;
  accent?: "default" | "violet";
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-2xl border bg-white p-5 dark:bg-[#10101A] ${
      accent === "violet" ? "border-violet-200/60 dark:border-violet-900/40" : "border-gray-200/80 dark:border-white/5"
    }`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
        <button
          type="button"
          className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/5"
          title="Edit"
          aria-label={`Edit ${title}`}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
            <path d="M11.5 2.5l2 2-7 7H4.5v-2l7-7z" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold capitalize text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}

// ─── Conversation tab ────────────────────────────────────────────────────────
function ConversationTab({
  lead, conversations,
}: {
  lead: LeadRow;
  conversations: Conversation[];
}) {
  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white p-5 dark:border-white/5 dark:bg-[#10101A]">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Conversation</h2>
        <Link
          href={`/conversations?lead=${lead.id}`}
          className="text-[11px] font-semibold text-[#C8102E] transition-colors hover:underline"
        >
          Open in chat workspace →
        </Link>
      </div>

      {conversations.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">No messages yet.</p>
      ) : (
        <div className="max-h-[480px] space-y-3 overflow-y-auto pr-1">
          {conversations.map((c) => {
            const isOutbound = c.direction === "outbound";
            return (
              <div key={c.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                    isOutbound
                      ? "rounded-br-sm bg-[#C8102E] text-white"
                      : "rounded-bl-sm bg-gray-100 text-gray-800 dark:bg-white/5 dark:text-gray-200"
                  }`}
                >
                  <p>{c.body}</p>
                  <p className={`mt-1 text-[10px] ${isOutbound ? "text-white/70" : "text-gray-400"}`}>
                    {formatTime(c.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply input */}
      <ManualReplyBox
        leadId={lead.id}
        leadName={lead.name}
        initialAiPaused={Boolean(lead.ai_paused)}
      />
    </section>
  );
}

// ─── Activity tab ────────────────────────────────────────────────────────────
function ActivityTab({
  lead, conversations,
}: {
  lead: LeadRow;
  conversations: Conversation[];
}) {
  // Build a simple timeline from conversations + key lead events
  type Event = { id: string; ts: string; label: string; tag: string };
  const events: Event[] = [
    { id: "created", ts: lead.created_at, label: `Lead created${lead.source ? ` via ${lead.source}` : ""}`, tag: "system" },
  ];
  if (lead.first_contact_date) {
    events.push({ id: "first_contact", ts: lead.first_contact_date, label: "First contacted by Bulldog", tag: "ai" });
  }
  if (lead.opt_out_at) {
    events.push({ id: "opt_out", ts: lead.opt_out_at, label: "Opted out (STOP)", tag: "system" });
  }
  conversations.forEach((c) => {
    events.push({
      id: c.id,
      ts: c.created_at,
      label: c.direction === "inbound" ? `${lead.name} replied: "${c.body.slice(0, 60)}${c.body.length > 60 ? "…" : ""}"` : `Sent: "${c.body.slice(0, 60)}${c.body.length > 60 ? "…" : ""}"`,
      tag: c.direction === "outbound" ? "ai" : "lead",
    });
  });
  events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

  const TAG_STYLE: Record<string, string> = {
    ai:     "bg-violet-100 text-violet-700",
    lead:   "bg-sky-100 text-sky-700",
    system: "bg-gray-100 text-gray-600",
  };

  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white p-5 dark:border-white/5 dark:bg-[#10101A]">
      <h2 className="mb-3 text-sm font-bold text-gray-900 dark:text-white">Activity timeline</h2>
      {events.length === 0 ? (
        <p className="py-4 text-sm text-gray-400">No activity yet.</p>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e.id} className="flex items-start gap-3 text-xs">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300 dark:bg-white/20" />
              <div className="min-w-0 flex-1">
                <p className="leading-relaxed text-gray-700 dark:text-gray-300">{e.label}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className={`rounded px-1 py-0.5 text-[9px] font-bold uppercase ${TAG_STYLE[e.tag] ?? TAG_STYLE.system}`}>{e.tag}</span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(e.ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
