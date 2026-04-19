"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/leads", label: "Leads", icon: "👤" },
  { href: "/properties", label: "Properties", icon: "🏢" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-gray-100 bg-white">
      {/* Logo */}
      <div className="border-b border-gray-100 px-5 py-4">
        <Link href="/" className="text-lg font-black tracking-tight text-gray-900">
          LeaseUp<span className="text-[#C8102E]">Bulldog</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-[#C8102E]/10 text-[#C8102E]"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Quick actions */}
      <div className="border-t border-gray-100 p-3 space-y-1">
        <Link
          href="/leads/new"
          className="flex items-center gap-2 rounded-lg bg-[#C8102E] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#A50D25] transition-colors"
        >
          <span>+</span> Add Lead
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Back to website
        </Link>
      </div>
    </aside>
  );
}
