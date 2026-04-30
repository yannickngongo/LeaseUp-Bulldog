interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white px-8 py-16 text-center dark:border-white/10 dark:bg-[#1C1F2E] ${className}`}>
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50 text-gray-400 dark:bg-white/5 dark:text-gray-500">
          {icon}
        </div>
      )}
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</p>
      {description && <p className="mt-1 max-w-xs text-xs text-gray-400 dark:text-gray-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ─── Named icon presets ───────────────────────────────────────────────────────
// Use as <EmptyState icon={EmptyIcons.leads} ... />

export const EmptyIcons = {
  leads: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <circle cx="12" cy="8" r="4" />
      <path d="M3 21c0-5 4-8 9-8s9 3 9 8" strokeLinecap="round" />
    </svg>
  ),
  properties: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <path d="M3 21V8l9-5 9 5v13" strokeLinejoin="round" />
      <path d="M9 21v-7h6v7" strokeLinejoin="round" />
    </svg>
  ),
  campaigns: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <path d="M3 11l18-7v16L3 13z" strokeLinejoin="round" />
      <path d="M11 11v8" />
    </svg>
  ),
  conversations: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <path d="M21 12c0 4-4 7-9 7-1.5 0-2.9-.3-4.1-.8L3 21l1.4-4.1C3.5 15.5 3 13.8 3 12c0-4 4-7 9-7s9 3 9 7z" strokeLinejoin="round" />
    </svg>
  ),
  tours: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  ),
  reports: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <path d="M3 17l5-5 4 4 9-9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 7h7v7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" strokeLinecap="round" />
    </svg>
  ),
  inbox: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" strokeLinejoin="round" />
      <path d="M5.5 5h13l3 7v6a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-6z" strokeLinejoin="round" />
    </svg>
  ),
};
