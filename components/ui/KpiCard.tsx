import { cn } from "@/lib/utils";

interface Trend {
  direction: "up" | "down" | "flat";
  label: string;
  positive?: boolean; // true = up is good, false = up is bad (e.g. vacancy rate)
}

interface KpiCardProps {
  label: string;
  value: string | number;
  trend?: Trend;
  sub?: string;
  stub?: boolean;
  icon?: React.ReactNode;
}

export function KpiCard({ label, value, trend, sub, stub, icon }: KpiCardProps) {
  const trendColor = trend
    ? trend.direction === "flat"
      ? "text-gray-400"
      : (trend.direction === "up") === (trend.positive !== false)
        ? "text-green-600"
        : "text-red-500"
    : "";

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>

      <p className={cn("mt-2 text-2xl font-bold tracking-tight", stub ? "text-gray-300" : "text-gray-900")}>
        {value}
      </p>

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {stub && (
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
            needs wiring
          </span>
        )}
        {trend && !stub && (
          <span className={cn("flex items-center gap-0.5 text-xs font-medium", trendColor)}>
            {trend.direction === "up" && (
              <svg viewBox="0 0 10 10" className="h-3 w-3" fill="currentColor">
                <path d="M5 2l4 6H1z" />
              </svg>
            )}
            {trend.direction === "down" && (
              <svg viewBox="0 0 10 10" className="h-3 w-3" fill="currentColor">
                <path d="M5 8L1 2h8z" />
              </svg>
            )}
            {trend.direction === "flat" && <span>→</span>}
            {trend.label}
          </span>
        )}
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}
