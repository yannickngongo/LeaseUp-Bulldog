// Shared marketing icon set — line style, 1.8 stroke, rounded caps.
// Replaces emoji icons across landing/features/how-it-works/contact/waitlist for visual consistency.

type IconProps = { className?: string; size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function IconBolt({ className, size = 22 }: IconProps) {
  return <svg {...base(size)} className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
}

export function IconTarget({ className, size = 22 }: IconProps) {
  return <svg {...base(size)} className={className}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></svg>;
}

export function IconRefresh({ className, size = 22 }: IconProps) {
  return <svg {...base(size)} className={className}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;
}

export function IconChart({ className, size = 22 }: IconProps) {
  return <svg {...base(size)} className={className}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
}

export function IconCalendar({ className, size = 22 }: IconProps) {
  return <svg {...base(size)} className={className}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><circle cx="12" cy="16" r="2" fill="currentColor" stroke="none" /></svg>;
}

export function IconDashboard({ className, size = 22 }: IconProps) {
  return <svg {...base(size)} className={className}><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>;
}

export function IconBuilding({ className, size = 22 }: IconProps) {
  return <svg {...base(size)} className={className}><rect x="4" y="2" width="16" height="20" rx="1" /><line x1="9" y1="6" x2="9.01" y2="6" /><line x1="15" y1="6" x2="15.01" y2="6" /><line x1="9" y1="10" x2="9.01" y2="10" /><line x1="15" y1="10" x2="15.01" y2="10" /><line x1="9" y1="14" x2="9.01" y2="14" /><line x1="15" y1="14" x2="15.01" y2="14" /><line x1="10" y1="22" x2="14" y2="22" /></svg>;
}

export function IconShield({ className, size = 22 }: IconProps) {
  return <svg {...base(size)} className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>;
}

export function IconPlug({ className, size = 22 }: IconProps) {
  return <svg {...base(size)} className={className}><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8zM12 18v4" /></svg>;
}

export function IconChat({ className, size = 22 }: IconProps) {
  return <svg {...base(size)} className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}

export function IconLifebuoy({ className, size = 22 }: IconProps) {
  return <svg {...base(size)} className={className}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><line x1="4.93" y1="4.93" x2="9.17" y2="9.17" /><line x1="14.83" y1="14.83" x2="19.07" y2="19.07" /><line x1="14.83" y1="9.17" x2="19.07" y2="4.93" /><line x1="14.83" y1="9.17" x2="18.36" y2="5.64" /><line x1="4.93" y1="19.07" x2="9.17" y2="14.83" /></svg>;
}

export function IconLock({ className, size = 22 }: IconProps) {
  return <svg {...base(size)} className={className}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
}

export function IconHandshake({ className, size = 22 }: IconProps) {
  return <svg {...base(size)} className={className}><path d="M11 17l2 2 5-5M5 9l3-3 4 4-2 2-5-3z" /><path d="M19 11l-3 3M14 6l3 3-2 2" /><path d="M3 12l4-4M21 12l-4-4" /></svg>;
}

export function IconCheck({ className, size = 16 }: IconProps) {
  return <svg {...base(size)} className={className} strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>;
}

export function IconArrowRight({ className, size = 16 }: IconProps) {
  return <svg {...base(size)} className={className}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
}

export function IconUsers({ className, size = 22 }: IconProps) {
  return <svg {...base(size)} className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}

export function IconBrain({ className, size = 22 }: IconProps) {
  return <svg {...base(size)} className={className}><path d="M9 3a3 3 0 0 0-3 3v1a3 3 0 0 0-3 3v3a3 3 0 0 0 3 3v1a3 3 0 0 0 3 3M15 3a3 3 0 0 1 3 3v1a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3v1a3 3 0 0 1-3 3M9 6v15M15 6v15" /></svg>;
}
