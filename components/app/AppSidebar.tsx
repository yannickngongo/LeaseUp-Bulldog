"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getOperatorEmail, authFetch } from "@/lib/demo-auth";
import { createBrowserClient } from "@supabase/ssr";

// ─── Icons (preview-style line icons, sized 18) ──────────────────────────────

function IconDashboard() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <rect x="1.5" y="1.5" width="6" height="6" rx="1.5" /><rect x="10.5" y="1.5" width="6" height="6" rx="1.5" />
      <rect x="1.5" y="10.5" width="6" height="6" rx="1.5" /><rect x="10.5" y="10.5" width="6" height="6" rx="1.5" />
    </svg>
  );
}
function IconAnalytics() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <line x1="13.5" y1="15" x2="13.5" y2="7.5" /><line x1="9" y1="15" x2="9" y2="3" /><line x1="4.5" y1="15" x2="4.5" y2="10.5" />
    </svg>
  );
}
function IconLeads() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <path d="M12.75 15.75v-1.5a3 3 0 00-3-3h-6a3 3 0 00-3 3v1.5" /><circle cx="6.75" cy="5.25" r="3" />
      <path d="M17.25 15.75v-1.5a3 3 0 00-2.25-2.9" /><path d="M12 2.35a3 3 0 010 5.8" />
    </svg>
  );
}
function IconProperties() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <rect x="3" y="1.5" width="12" height="15" rx="1" />
      <line x1="6.75" y1="4.5" x2="6.76" y2="4.5" /><line x1="11.25" y1="4.5" x2="11.26" y2="4.5" />
      <line x1="6.75" y1="7.5" x2="6.76" y2="7.5" /><line x1="11.25" y1="7.5" x2="11.26" y2="7.5" />
      <line x1="6.75" y1="10.5" x2="6.76" y2="10.5" /><line x1="11.25" y1="10.5" x2="11.26" y2="10.5" />
    </svg>
  );
}
function IconTours() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <rect x="2.25" y="3" width="13.5" height="13.5" rx="1.5" /><line x1="12" y1="1.5" x2="12" y2="4.5" /><line x1="6" y1="1.5" x2="6" y2="4.5" /><line x1="2.25" y1="7.5" x2="15.75" y2="7.5" />
    </svg>
  );
}
function IconConversations() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <path d="M15.75 11.25a1.5 1.5 0 01-1.5 1.5h-9l-3 3v-12a1.5 1.5 0 011.5-1.5h10.5a1.5 1.5 0 011.5 1.5v7.5z" />
    </svg>
  );
}
function IconBilling() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <rect x="1.5" y="4.5" width="15" height="9" rx="1.5" /><circle cx="9" cy="9" r="1.5" /><line x1="4.5" y1="9" x2="4.51" y2="9" /><line x1="13.5" y1="9" x2="13.51" y2="9" />
    </svg>
  );
}
function IconGettingStarted() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <circle cx="9" cy="9" r="7.5" /><path d="M9 5v4l2.5 2.5" />
    </svg>
  );
}
function IconPortfolio() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <path d="M3 3.5h12a1 1 0 011 1v9a1 1 0 01-1 1H3a1 1 0 01-1-1v-9a1 1 0 011-1z" /><path d="M6 3.5V2a1 1 0 011-1h4a1 1 0 011 1v1.5" /><path d="M2 8h14" />
    </svg>
  );
}
function IconRenewals() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <polyline points="14 4 14 8 10 8" /><polyline points="4 14 4 10 8 10" /><path d="M3.5 7a6 6 0 019.9-2.4L14 4M14.5 11a6 6 0 01-9.9 2.4L4 14" />
    </svg>
  );
}
function IconMarketing() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <path d="M2 8.5l13-6v13l-13-6z" /><path d="M5 14.5v-7" /><path d="M5 14.5h2v2H5z" />
    </svg>
  );
}
function IconCompetitors() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <circle cx="9" cy="9" r="7.5" /><line x1="9" y1="1.5" x2="9" y2="16.5" /><path d="M2 9c2-2.5 5-4 7-4s5 1.5 7 4M2 9c2 2.5 5 4 7 4s5-1.5 7-4" />
    </svg>
  );
}
function IconAutomations() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <polygon points="10 1.5 2.5 10.5 9 10.5 8 16.5 15.5 7.5 9 7.5 10 1.5" />
    </svg>
  );
}
function IconIntegrations() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <rect x="2" y="2" width="6" height="6" rx="1" /><rect x="10" y="2" width="6" height="6" rx="1" /><rect x="2" y="10" width="6" height="6" rx="1" /><rect x="10" y="10" width="6" height="6" rx="1" />
    </svg>
  );
}
function IconReports() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <path d="M14 2H4a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V3a1 1 0 00-1-1z" /><line x1="6" y1="6" x2="12" y2="6" /><line x1="6" y1="9" x2="12" y2="9" /><line x1="6" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function IconInsights() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <path d="M9 1.5a4.5 4.5 0 014.5 4.5c0 1.5-1 3-2 4-.5.5-.5 1-.5 1.5v.5h-4v-.5c0-.5 0-1-.5-1.5-1-1-2-2.5-2-4A4.5 4.5 0 019 1.5z" /><line x1="7" y1="14.5" x2="11" y2="14.5" /><line x1="8" y1="16.5" x2="10" y2="16.5" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <circle cx="9" cy="9" r="2.25" />
      <path d="M14.55 11.25a1.24 1.24 0 00.25 1.36l.05.05a1.5 1.5 0 11-2.12 2.12l-.05-.05a1.24 1.24 0 00-1.36-.25 1.24 1.24 0 00-.75 1.13v.14a1.5 1.5 0 11-3 0v-.07a1.24 1.24 0 00-.81-1.13 1.24 1.24 0 00-1.36.25l-.05.05a1.5 1.5 0 11-2.12-2.12l.05-.05a1.24 1.24 0 00.25-1.36 1.24 1.24 0 00-1.13-.75H2.25a1.5 1.5 0 110-3h.07a1.24 1.24 0 001.13-.81 1.24 1.24 0 00-.25-1.36l-.05-.05a1.5 1.5 0 112.12-2.12l.05.05a1.24 1.24 0 001.36.25h.06a1.24 1.24 0 00.75-1.13v-.14a1.5 1.5 0 113 0v.07a1.24 1.24 0 00.75 1.13 1.24 1.24 0 001.36-.25l.05-.05a1.5 1.5 0 112.12 2.12l-.05.05a1.24 1.24 0 00-.25 1.36v.06a1.24 1.24 0 001.13.75h.14a1.5 1.5 0 110 3h-.07a1.24 1.24 0 00-1.13.75z" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] shrink-0">
      <path d="M11.5 13l4-4-4-4M15.5 9H6.5" /><path d="M6.5 15.5H3a1 1 0 01-1-1V3.5a1 1 0 011-1h3.5" />
    </svg>
  );
}
function IconChevronVertical() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0">
      <polyline points="3 4.5 6 1.5 9 4.5" /><polyline points="3 7.5 6 10.5 9 7.5" />
    </svg>
  );
}

// ─── Nav config (preview/dashboard sidebar style + full LUB feature set) ─────

interface NavItem {
  href: string;
  label: string;
  Icon: () => React.JSX.Element;
  badgeKey?: "leads";
}

// Top section — most-used pages
const NAV_PRIMARY: NavItem[] = [
  { href: "/dashboard",       label: "Dashboard",       Icon: IconDashboard },
  { href: "/getting-started", label: "Getting Started", Icon: IconGettingStarted },
  { href: "/leads",           label: "Leads",           Icon: IconLeads, badgeKey: "leads" },
  { href: "/properties",      label: "Properties",      Icon: IconProperties },
  { href: "/calendar",        label: "Tours",           Icon: IconTours },
  { href: "/leads?view=conversations", label: "Conversations", Icon: IconConversations },
];

// Operations — workflow + automation tools
const NAV_OPERATIONS: NavItem[] = [
  { href: "/portfolio",    label: "Portfolio",    Icon: IconPortfolio },
  { href: "/renewals",     label: "Renewals",     Icon: IconRenewals },
  { href: "/marketing",    label: "Marketing",    Icon: IconMarketing },
  { href: "/competitors",  label: "Competitors",  Icon: IconCompetitors },
  { href: "/automations",  label: "Automations",  Icon: IconAutomations },
  { href: "/integrations", label: "Integrations", Icon: IconIntegrations },
];

// Analytics — reports + insights
const NAV_ANALYTICS: NavItem[] = [
  { href: "/insights", label: "Insights", Icon: IconInsights },
  { href: "/reports",  label: "Reports",  Icon: IconReports },
];

// Account — billing + settings (rendered separately above sign-out)
const NAV_ACCOUNT: NavItem[] = [
  { href: "/billing",  label: "Billing",  Icon: IconBilling },
  { href: "/settings", label: "Settings", Icon: IconSettings },
];

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
  );
}

export function AppSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [userName,     setUserName]     = useState<string>("");
  const [userEmail,    setUserEmail]    = useState<string>("");
  const [userInitials, setUserInitials] = useState<string>("?");
  const [avatarUrl,    setAvatarUrl]    = useState<string>("");
  const [activeLeads,  setActiveLeads]  = useState<number>(0);
  const [loggingOut,   setLoggingOut]   = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await getSupabase().auth.signOut();
    router.push("/login");
  }

  useEffect(() => {
    getSupabase().auth.getUser().then(({ data }) => {
      const url = data.user?.user_metadata?.avatar_url;
      if (url) setAvatarUrl(url);
    });
    getOperatorEmail().then(async (email) => {
      if (!email) return;
      setUserEmail(email);
      try {
        const setupRes = await authFetch("/api/setup");
        const setupJson = await setupRes.json();
        const name = setupJson.operator?.name ?? email.split("@")[0];
        setUserName(name);
        setUserInitials(name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase());

        // Fetch active leads count for the badge
        const propRes = await authFetch("/api/properties");
        const propJson = await propRes.json();
        const props = propJson.properties ?? [];
        let total = 0;
        await Promise.all(props.map(async (p: { id: string }) => {
          const r = await fetch(`/api/leads?propertyId=${p.id}`);
          const j = await r.json();
          const active = (j.leads ?? []).filter((l: { status: string }) => !["won", "lost"].includes(l.status));
          total += active.length;
        }));
        setActiveLeads(total);
      } catch {
        setUserName(email.split("@")[0]);
        setUserInitials(email[0]?.toUpperCase() ?? "?");
      }
    });
  }, []);

  function isActive(href: string) {
    const path = href.split("?")[0];
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  }

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-gray-200 bg-white p-5 dark:border-[#1E1E2E] dark:bg-[#10101A]">

      {/* Workspace selector */}
      <Link
        href="/dashboard"
        onClick={onClose}
        className="mb-6 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 transition-all hover:border-[#C8102E]/40 dark:border-[#1E1E2E] dark:bg-[#16161F]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg shadow-md"
            style={{ background: "linear-gradient(135deg, #A78BFA, #7C5BE6)", boxShadow: "0 4px 12px rgba(167,139,250,0.4)" }}
          >
            <span className="text-sm font-black text-white">LB</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900 dark:text-white">
              LeaseUp<span className="text-[#C8102E]">Bulldog</span>
            </p>
            <p className="text-[10px] text-gray-500">Workspace · Operator</p>
          </div>
        </div>
        <span className="text-gray-400 dark:text-gray-500"><IconChevronVertical /></span>
      </Link>

      {/* Scrollable nav region — Main + Operations + Analytics + Account */}
      <nav className="flex-1 overflow-y-auto">

        {/* Main menu */}
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">Main Menu</p>
        <div className="mb-5 flex flex-col gap-1">
          {NAV_PRIMARY.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} badgeCount={item.badgeKey === "leads" ? activeLeads : 0} onClose={onClose} />
          ))}
        </div>

        {/* Operations */}
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">Operations</p>
        <div className="mb-5 flex flex-col gap-1">
          {NAV_OPERATIONS.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} onClose={onClose} />
          ))}
        </div>

        {/* Analytics */}
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">Analytics</p>
        <div className="mb-5 flex flex-col gap-1">
          {NAV_ANALYTICS.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} onClose={onClose} />
          ))}
        </div>

        {/* Account */}
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-600">Account</p>
        <div className="flex flex-col gap-1">
          {NAV_ACCOUNT.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(item.href)} onClose={onClose} />
          ))}
        </div>
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-[#C8102E] dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-[#F87171] disabled:opacity-50"
      >
        <span className="text-gray-400"><IconLogout /></span>
        <span>{loggingOut ? "Signing out…" : "Sign Out"}</span>
      </button>

      {/* User card */}
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-[#1E1E2E] dark:bg-[#16161F]">
        <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center text-sm font-bold text-white"
              style={{ background: "linear-gradient(135deg, #A78BFA, #C8102E)" }}
            >
              {userInitials}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{userName || "Loading…"}</p>
          <p className="truncate text-[10px] text-gray-500">{userEmail}</p>
        </div>
        <span className="text-gray-400 dark:text-gray-500"><IconChevronVertical /></span>
      </div>
    </aside>
  );
}

// ─── SidebarLink: shared row renderer (active highlight + optional badge) ────

function SidebarLink({
  item,
  active,
  badgeCount = 0,
  onClose,
}: {
  item: NavItem;
  active: boolean;
  badgeCount?: number;
  onClose?: () => void;
}) {
  const Icon = item.Icon;
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
      style={{
        background: active ? "linear-gradient(90deg, rgba(200,16,46,0.18), transparent)" : "transparent",
        borderLeft: active ? "2px solid #C8102E" : "2px solid transparent",
      }}
    >
      <span className={active ? "text-[#C8102E]" : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"}>
        <Icon />
      </span>
      <span className={`flex-1 text-left ${active ? "text-gray-900 dark:text-white font-semibold" : "text-gray-600 dark:text-gray-400"}`}>{item.label}</span>
      {badgeCount > 0 && (
        <span className="rounded-full bg-[#C8102E]/15 px-2 py-0.5 text-[10px] font-bold text-[#F87171]">
          {badgeCount}
        </span>
      )}
    </Link>
  );
}
