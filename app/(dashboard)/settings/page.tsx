"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getOperatorEmail } from "@/lib/demo-auth";

interface Operator {
  id: string;
  name: string;
  plan: string;
}

interface Property {
  id: string;
  name: string;
  phone_number: string;
  address: string;
  city: string;
  state: string;
}

interface Lead {
  id: string;
  status: string;
  created_at: string;
}

interface Member {
  id: string;
  email: string;
  role: string;
  status: string;
  invited_at?: string;
  accepted_at?: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  property_ids: string[];
  expires_at: string;
}

function TwilioCopyBtn({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="shrink-0 rounded px-2 py-0.5 text-[10px] font-bold text-[#C8102E] hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-100 dark:bg-white/5 ${className ?? ""}`} />;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
      <path d="M3 8l3.5 3.5L13 4" />
    </svg>
  );
}

const PLAN_LABELS: Record<string, { label: string; color: string; monthlyPrice: number; perfFee: number; maxProps: string }> = {
  starter:   { label: "Starter",   color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",     monthlyPrice: 500,  perfFee: 200, maxProps: "Up to 3 properties" },
  pro:       { label: "Pro",       color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", monthlyPrice: 1500, perfFee: 150, maxProps: "Up to 20 properties" },
  portfolio: { label: "Portfolio", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", monthlyPrice: 3000, perfFee: 100, maxProps: "Unlimited properties" },
  // legacy slugs
  growth:     { label: "Pro",       color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", monthlyPrice: 1500, perfFee: 150, maxProps: "Up to 20 properties" },
  enterprise: { label: "Portfolio", color: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", monthlyPrice: 3000, perfFee: 100, maxProps: "Unlimited properties" },
  core:       { label: "Starter",   color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",     monthlyPrice: 500,  perfFee: 200, maxProps: "Up to 3 properties" },
};

export default function SettingsPage() {
  const router = useRouter();
  const [operator, setOperator]     = useState<Operator | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [email, setEmail]           = useState("");
  const [loading, setLoading]       = useState(true);
  const [name, setName]             = useState("");
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  // Team management state
  const [members, setMembers]             = useState<Member[]>([]);
  const [invitations, setInvitations]     = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail]     = useState("");
  const [inviteRole, setInviteRole]       = useState("leasing_agent");
  const [invitePropertyIds, setInvitePropertyIds] = useState<string[]>([]);
  const [inviting, setInviting]           = useState(false);
  const [inviteError, setInviteError]     = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteUrl, setInviteUrl]         = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const email = await getOperatorEmail();
        if (!email) { router.push("/setup"); return; }
        setEmail(email);

        const res = await fetch(`/api/setup?email=${encodeURIComponent(email)}`);
        const json = await res.json();

        if (json.operator) {
          setOperator(json.operator);
          setName(json.operator.name ?? "");
        }

        const props: Property[] = json.properties ?? [];
        setProperties(props);

        // Load leads for all properties
        const allLeads: Lead[] = [];
        await Promise.all(props.map(async (p) => {
          const r = await fetch(`/api/leads?propertyId=${p.id}`);
          const j = await r.json();
          allLeads.push(...(j.leads ?? []));
        }));
        setLeads(allLeads);

        // Load team members
        const teamRes = await fetch(`/api/org/members?email=${encodeURIComponent(email)}`);
        if (teamRes.ok) {
          const teamJson = await teamRes.json();
          setMembers(teamJson.members ?? []);
          setInvitations(teamJson.invitations ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  async function handleSave() {
    if (!email || !name.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/setup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name.trim() }),
      });
      setOperator(prev => prev ? { ...prev, name: name.trim() } : prev);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const sendInvite = useCallback(async () => {
    if (!email || !inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");
    setInviteUrl("");
    try {
      const res = await fetch("/api/org/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          inviteEmail: inviteEmail.trim(),
          role: inviteRole,
          propertyIds: invitePropertyIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setInviteError(json.error ?? "Failed to send invite");
      } else {
        setInviteSuccess(`Invite sent to ${inviteEmail.trim()}`);
        setInviteUrl(json.inviteUrl ?? "");
        setInviteEmail("");
        // Refresh members list
        const teamRes = await fetch(`/api/org/members?email=${encodeURIComponent(email)}`);
        if (teamRes.ok) {
          const tj = await teamRes.json();
          setMembers(tj.members ?? []);
          setInvitations(tj.invitations ?? []);
        }
        setTimeout(() => { setInviteSuccess(""); setInviteUrl(""); }, 8000);
      }
    } finally {
      setInviting(false);
    }
  }, [email, inviteEmail, inviteRole, invitePropertyIds]);

  async function deactivateMember(memberId: string) {
    if (!confirm("Deactivate this user? They will lose access immediately.")) return;
    await fetch("/api/org/members", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, memberId }),
    });
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, status: "deactivated" } : m));
  }

  async function cancelInvitation(invitationId: string) {
    await fetch("/api/org/invite", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, invitationId }),
    });
    setInvitations(prev => prev.filter(i => i.id !== invitationId));
  }

  // Billing stats — real data
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const wonThisMonth = leads.filter(l =>
    l.status === "won" && new Date(l.created_at) >= startOfMonth
  ).length;
  const planConfig = PLAN_LABELS[operator?.plan ?? "starter"] ?? PLAN_LABELS.starter;
  const performanceFee = wonThisMonth * planConfig.perfFee;
  const platformFee = planConfig.monthlyPrice;
  const totalDue = platformFee + performanceFee;

  // Billing visible only to owner — if not in members list they're the original operator, or role is owner
  const currentMember = members.find(m => m.email === email);
  const isOwner = !currentMember || currentMember.role === "owner";

  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextBillingDate = nextMonth.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const planInfo = PLAN_LABELS[operator?.plan ?? "starter"] ?? PLAN_LABELS.starter;

  return (
    <div className="p-4 lg:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account, properties, and billing</p>
        </div>

        {/* ── Profile ───────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Profile</h2>
          {loading ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
              <Skeleton className="h-10" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name or company"
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  className="w-full rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 dark:border-white/5 dark:bg-white/5 dark:text-gray-400 cursor-not-allowed"
                />
                <p className="mt-1 text-[11px] text-gray-400">Email is managed by your login provider.</p>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Plan</label>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${planInfo.color}`}>
                    {planInfo.label}
                  </span>
                  <span className="text-xs text-gray-400">Operator ID: <span className="font-mono">{operator?.id?.slice(0, 8)}…</span></span>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={saving || name.trim() === operator?.name}
                  className="rounded-lg bg-[#C8102E] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#A50D25] disabled:opacity-50"
                >
                  {saved ? "✓ Saved" : saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Team Management ──────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Team</h2>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">Invite users and control their property access.</p>
            </div>
          </div>

          {/* Active members */}
          {members.length > 0 && (
            <div className="mb-5 space-y-2">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-white/5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{m.email}</p>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        m.role === "owner" ? "bg-amber-100 text-amber-700" :
                        m.role === "admin" ? "bg-violet-100 text-violet-700" :
                        m.role === "manager" ? "bg-blue-100 text-blue-700" :
                        m.role === "leasing_agent" ? "bg-green-100 text-green-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {m.role.replace("_", " ")}
                      </span>
                      {m.status === "deactivated" && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">deactivated</span>
                      )}
                    </div>
                  </div>
                  {m.role !== "owner" && m.status !== "deactivated" && (
                    <button onClick={() => deactivateMember(m.id)}
                      className="ml-3 shrink-0 text-xs font-medium text-red-500 hover:underline">
                      Deactivate
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pending invitations */}
          {invitations.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Pending Invitations</p>
              <div className="space-y-2">
                {invitations.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 dark:border-amber-900/20 dark:bg-amber-900/10">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{inv.email}</p>
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        {inv.role.replace("_", " ")} · expires {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button onClick={() => cancelInvitation(inv.id)}
                      className="ml-3 text-xs font-medium text-red-500 hover:underline">
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invite form */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-white/5 dark:bg-white/5">
            <p className="mb-3 text-xs font-semibold text-gray-700 dark:text-gray-300">Invite a team member</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-gray-400 focus:outline-none dark:border-white/10 dark:bg-[#1C1F2E] dark:text-gray-300"
              >
                <option value="viewer">Viewer</option>
                <option value="leasing_agent">Leasing Agent</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              <button
                onClick={sendInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="rounded-lg bg-[#C8102E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A50D25] disabled:opacity-50"
              >
                {inviting ? "Sending…" : "Send Invite"}
              </button>
            </div>

            {/* Property access checkboxes */}
            {properties.length > 0 && inviteRole !== "owner" && inviteRole !== "admin" && (
              <div className="mt-3">
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">Property access (leave blank for all)</p>
                <div className="flex flex-wrap gap-2">
                  {properties.map(p => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs dark:border-white/10">
                      <input type="checkbox"
                        checked={invitePropertyIds.includes(p.id)}
                        onChange={e => setInvitePropertyIds(prev =>
                          e.target.checked ? [...prev, p.id] : prev.filter(id => id !== p.id)
                        )}
                        className="h-3.5 w-3.5 accent-[#C8102E]"
                      />
                      <span className="text-gray-700 dark:text-gray-300">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {inviteError && <p className="mt-2 text-xs font-medium text-red-600">{inviteError}</p>}
            {inviteSuccess && (
              <div className="mt-2 rounded-lg bg-green-50 px-3 py-2 dark:bg-green-900/20">
                <p className="text-xs font-medium text-green-700 dark:text-green-400">{inviteSuccess}</p>
                {inviteUrl && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-green-100 px-2 py-0.5 font-mono text-[10px] text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      {inviteUrl}
                    </code>
                    <button onClick={() => navigator.clipboard.writeText(inviteUrl)}
                      className="shrink-0 text-[10px] font-semibold text-green-700 hover:underline dark:text-green-400">
                      Copy
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Role legend */}
          <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3 dark:bg-white/5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Role permissions</p>
            <div className="grid gap-1 text-[11px] text-gray-500 dark:text-gray-400">
              <span><strong className="text-gray-700 dark:text-gray-300">Viewer</strong> — view dashboard & analytics only</span>
              <span><strong className="text-gray-700 dark:text-gray-300">Leasing Agent</strong> — view + reply to leads + take over conversations</span>
              <span><strong className="text-gray-700 dark:text-gray-300">Manager</strong> — leasing agent + manage campaigns + approve AI actions</span>
              <span><strong className="text-gray-700 dark:text-gray-300">Admin</strong> — manager + edit property settings + manage team</span>
            </div>
          </div>
        </div>

        {/* ── Properties ────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Properties</h2>
            <a href="/properties/new" className="text-xs font-semibold text-[#C8102E] hover:underline">+ Add Property</a>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : properties.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-200 dark:border-white/10 py-8 text-center">
              <p className="text-sm text-gray-400">No properties yet.</p>
              <a href="/properties/new" className="mt-2 inline-block text-xs font-semibold text-[#C8102E] hover:underline">Set up your first property →</a>
            </div>
          ) : (
            <div className="space-y-3">
              {properties.map(p => (
                <div key={p.id} className="flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-white/5 dark:bg-white/5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{p.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{p.address}, {p.city}, {p.state}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 text-gray-400">
                        <path d="M2 2a1 1 0 011-1h2a1 1 0 01.95.684l.74 2.22a1 1 0 01-.233 1.022L5.2 6.16a9.7 9.7 0 004.64 4.64l1.234-1.257a1 1 0 011.022-.233l2.22.74A1 1 0 0115 11v2a1 1 0 01-1 1h-1C6.82 14 2 9.18 2 3V2z" />
                      </svg>
                      <span className="font-mono text-[11px] text-gray-600 dark:text-gray-300">{p.phone_number}</span>
                      <span className="text-[10px] font-semibold text-gray-400">AI line</span>
                    </div>
                  </div>
                  <a href={`/properties/${p.id}`} className="ml-4 shrink-0 text-xs font-medium text-[#C8102E] hover:underline">Edit</a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Usage & Billing — owner only ──────────────────────────────── */}
        {isOwner && <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Usage & Billing</h2>

          <div className="space-y-3">
            {/* Platform fee */}
            <div className="flex items-center justify-between rounded-xl border border-[#C8102E]/20 bg-[#C8102E]/5 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Platform Fee</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{planConfig.maxProps} · unlimited leads · 24/7 SMS</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">${planConfig.monthlyPrice.toLocaleString()}<span className="text-xs font-normal text-gray-400">/mo</span></p>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <CheckIcon /> Active
                </span>
              </div>
            </div>

            {/* Performance fee */}
            <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 dark:border-amber-500/20 dark:bg-amber-900/10">
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Performance Fee</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Per lease signed through LeaseUp Bulldog · 30-day attribution</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">${planConfig.perfFee}<span className="text-xs font-normal text-gray-400">/lease</span></p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400">Pay for results</p>
              </div>
            </div>
          </div>

          {/* This month — real data */}
          <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 dark:border-white/5 dark:bg-white/5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {now.toLocaleString("default", { month: "long", year: "numeric" })}
            </p>
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{wonThisMonth}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Leases signed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#C8102E]">${performanceFee.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Performance fees</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${totalDue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Est. total due</p>
                </div>
              </div>
            )}
            <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
              Next billing date: {nextBillingDate} · ${platformFee.toLocaleString()} platform{performanceFee > 0 ? ` + $${performanceFee.toLocaleString()} performance` : ""}
            </p>
          </div>

          <div className="mt-4 rounded-lg border border-gray-100 px-4 py-3 dark:border-white/5">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Billing managed by LeaseUp Bulldog team</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Contact your account manager for invoices, receipts, or billing changes.</p>
          </div>
        </div>}

        {/* ── SMS Connection ────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Twilio SMS Setup</h2>
          <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">Configure this URL in Twilio so inbound SMS replies trigger the AI response loop.</p>
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400">Inbound Webhook URL</p>
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
                <code className="flex-1 truncate font-mono text-xs text-gray-700 dark:text-gray-300">
                  {(process.env.NEXT_PUBLIC_APP_URL ?? "https://lease-up-bulldog.vercel.app") + "/api/twilio/inbound"}
                </code>
                <TwilioCopyBtn url={(process.env.NEXT_PUBLIC_APP_URL ?? "https://lease-up-bulldog.vercel.app") + "/api/twilio/inbound"} />
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">
                In Twilio console → Phone Numbers → your number → &quot;A message comes in&quot; → set to <strong>HTTP POST</strong> and paste the URL above.
              </p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-3 dark:border-blue-900/20 dark:bg-blue-900/10">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">What this does</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                When a lead replies to your AI SMS, Twilio sends the message to this URL. LUB processes it, builds conversation history, and sends an AI reply — all within 5 seconds.
              </p>
            </div>
          </div>
        </div>

        {/* ── Integrations ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-[#1C1F2E]">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Integrations</h2>
          <div className="space-y-3">
            {[
              { name: "Twilio",             desc: "SMS delivery · inbound & outbound AI responses",  status: "connected" },
              { name: "Anthropic Claude",   desc: "AI engine powering lead replies & intelligence",   status: "connected" },
              { name: "Supabase",           desc: "Database, auth, and real-time data",              status: "connected" },
              { name: "Zapier",             desc: "Connect to 5,000+ apps",                          status: "coming_soon" },
              { name: "Facebook Ads",       desc: "AI-generated ad campaigns",                        status: "coming_soon" },
            ].map(int => (
              <div key={int.name} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-white/5">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{int.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{int.desc}</p>
                </div>
                {int.status === "connected" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckIcon /> Connected
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500 dark:bg-white/5 dark:text-gray-400">Coming soon</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Danger Zone ───────────────────────────────────────────────── */}
        <div className="rounded-xl border border-red-100 bg-white p-6 shadow-sm dark:border-red-900/30 dark:bg-[#1C1F2E]">
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-widest text-red-400">Danger Zone</h2>
          <div className="flex items-center justify-between rounded-lg border border-red-100 px-4 py-3 dark:border-red-900/30">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Delete Account</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Permanently removes your account, properties, and all lead data. Cannot be undone.</p>
            </div>
            <button className="ml-4 shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}
