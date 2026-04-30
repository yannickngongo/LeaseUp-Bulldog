// Per-lead consent audit trail. Shows when, where, and how consent was obtained
// for the lead's phone number — needed for TCPA compliance defense.
//
// Drop into the lead detail page next to the contact info. If a regulator asks
// "how did you get consent for this number?", this is the record you point to.

interface Props {
  firstContactDate?:  string | null;
  source?:            string | null;
  utmSource?:         string | null;
  utmMedium?:         string | null;
  utmCampaign?:       string | null;
  optOut?:            boolean | null;
  optOutAt?:          string | null;
  createdAt:          string;
  ingestionMetadata?: Record<string, unknown> | null;
}

function fmt(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", second: "2-digit",
  });
}

export function ConsentAuditTrail({
  firstContactDate,
  source,
  utmSource,
  utmMedium,
  utmCampaign,
  optOut,
  optOutAt,
  createdAt,
  ingestionMetadata,
}: Props) {
  const ip = ingestionMetadata?.["ip"] ?? ingestionMetadata?.["x-forwarded-for"];
  const ua = ingestionMetadata?.["user_agent"] ?? ingestionMetadata?.["user-agent"];

  return (
    <details className="rounded-xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#1C1F2E] open:bg-gray-50 dark:open:bg-white/5">
      <summary className="cursor-pointer px-4 py-3 text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 select-none">
        Consent &amp; ingestion audit trail
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-3 text-sm">
        <Field label="Lead created"      value={fmt(createdAt)} />
        <Field label="Source"            value={source ?? "—"} />
        <Field label="First AI contact"  value={fmt(firstContactDate)} />

        {(utmSource || utmMedium || utmCampaign) && (
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-gray-100 dark:border-white/5">
            <Field label="utm_source"   value={utmSource ?? "—"}   small />
            <Field label="utm_medium"   value={utmMedium ?? "—"}   small />
            <Field label="utm_campaign" value={utmCampaign ?? "—"} small />
          </div>
        )}

        {(!!ip || !!ua) && (
          <div className="space-y-1 pt-2 border-t border-gray-100 dark:border-white/5">
            <Field label="Ingestion IP"  value={ip != null ? String(ip) : "—"}  small mono />
            <Field label="User-Agent"    value={ua != null ? String(ua) : "—"}  small mono truncate />
          </div>
        )}

        <div className="pt-2 border-t border-gray-100 dark:border-white/5">
          <Field
            label="Opt-out status"
            value={
              optOut
                ? `Opted out ${fmt(optOutAt)}`
                : "Active — has not opted out"
            }
            tone={optOut ? "danger" : "good"}
          />
        </div>

        <p className="pt-2 border-t border-gray-100 dark:border-white/5 text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
          This timeline serves as your TCPA consent record. Per Twilio + FCC guidelines,
          consent is established when a prospect submits their phone number to a public
          lead form (Zillow, your website, Apartments.com, etc.). Opt-out detection is
          automatic and immutable — once a lead replies STOP, all messaging stops.
        </p>
      </div>
    </details>
  );
}

function Field({
  label,
  value,
  small,
  mono,
  truncate,
  tone,
}: {
  label:     string;
  value:     string;
  small?:    boolean;
  mono?:     boolean;
  truncate?: boolean;
  tone?:     "good" | "danger";
}) {
  const toneClass =
    tone === "good"   ? "text-green-700 dark:text-green-400" :
    tone === "danger" ? "text-red-700 dark:text-red-400" :
    "text-gray-700 dark:text-gray-200";

  return (
    <div className={small ? "" : "flex items-baseline gap-3"}>
      <p className={`shrink-0 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 ${small ? "mb-0.5" : "w-32"}`}>
        {label}
      </p>
      <p className={`${toneClass} ${mono ? "font-mono" : ""} ${truncate ? "truncate" : ""} ${small ? "text-xs" : "text-sm"}`}>
        {value}
      </p>
    </div>
  );
}
