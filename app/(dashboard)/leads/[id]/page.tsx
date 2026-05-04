import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { LeadProfile } from "@/components/leads/LeadProfile";
import type { Conversation } from "@/types/lead";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = getSupabaseAdmin();

  const [{ data: lead }, { data: conversations }] = await Promise.all([
    db
      .from("leads")
      .select("*, properties(name, phone_number)")
      .eq("id", id)
      .single(),
    db
      .from("conversations")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!lead) notFound();

  // Flatten the joined property fields onto the lead row
  const property = (lead as Record<string, unknown>).properties as
    | { name: string; phone_number: string }
    | null;
  const leadFlat = {
    ...lead,
    property_name: property?.name ?? null,
    property_phone: property?.phone_number ?? null,
  };

  // Operator id + per-lease performance fee for the lease-record button
  const { data: propertyMeta } = await db
    .from("properties")
    .select("operator_id")
    .eq("id", lead.property_id)
    .single();

  const operatorId = propertyMeta?.operator_id ?? "";
  const { data: sub } = operatorId
    ? await db
        .from("billing_subscriptions")
        .select("performance_fee_per_lease")
        .eq("operator_id", operatorId)
        .maybeSingle()
    : { data: null };
  const performanceFeePerLease = sub?.performance_fee_per_lease ?? 20000; // default $200

  const convos: Conversation[] = conversations ?? [];

  return (
    <LeadProfile
      lead={leadFlat}
      conversations={convos}
      performanceFeePerLease={performanceFeePerLease}
      operatorId={operatorId}
    />
  );
}
