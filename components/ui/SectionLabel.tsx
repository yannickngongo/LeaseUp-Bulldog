export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
      {children}
    </h2>
  );
}
