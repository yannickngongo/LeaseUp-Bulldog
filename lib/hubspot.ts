// lib/hubspot.ts
// HubSpot CRM sync — push lead status changes as contact + deal updates.
// Uses HubSpot's private app access tokens (OAuth-free, simpler for single-tenant use).
//
// Field mapping:
//   LUB lead.status → HubSpot deal stage (defined per portal in HUBSPOT_STAGE_MAP)
//   LUB lead.name   → HubSpot contact firstname/lastname
//   LUB lead.phone  → HubSpot contact phone
//   LUB lead.email  → HubSpot contact email

const HUBSPOT_API = "https://api.hubapi.com";

export type HubSpotSyncPayload = {
  accessToken: string;
  lead: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    status: string;
    property_name: string;
    move_in_date?: string;
    budget_min?: number;
    budget_max?: number;
  };
};

// LUB status → HubSpot deal stage label (operators can customise in their portal)
const STATUS_TO_STAGE: Record<string, string> = {
  new:            "appointmentscheduled",
  contacted:      "appointmentscheduled",
  engaged:        "qualifiedtobuy",
  tour_scheduled: "presentationscheduled",
  applied:        "decisionmakerboughtin",
  won:            "closedwon",
  lost:           "closedlost",
};

async function hubspotPost(
  path: string,
  token: string,
  body: unknown
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetch(`${HUBSPOT_API}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: JSON.stringify(data) };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function hubspotPatch(
  path: string,
  token: string,
  body: unknown
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetch(`${HUBSPOT_API}${path}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: JSON.stringify(data) };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function hubspotGet(
  path: string,
  token: string
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetch(`${HUBSPOT_API}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: JSON.stringify(data) };
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// Upsert a HubSpot contact by email or phone, return the contact id
async function upsertContact(
  token: string,
  lead: HubSpotSyncPayload["lead"]
): Promise<string | null> {
  const [firstName, ...rest] = lead.name.trim().split(" ");
  const lastName = rest.join(" ") || "";

  const properties: Record<string, string> = {
    firstname: firstName,
    lastname:  lastName,
    phone:     lead.phone,
  };
  if (lead.email) properties.email = lead.email;

  // Try to find by email first, then phone
  if (lead.email) {
    const search = await hubspotPost(
      "/crm/v3/objects/contacts/search",
      token,
      {
        filterGroups: [{
          filters: [{ propertyName: "email", operator: "EQ", value: lead.email }],
        }],
        limit: 1,
      }
    );
    const results = (search.data as { results?: { id: string }[] })?.results;
    if (results?.length) {
      const contactId = results[0].id;
      await hubspotPatch(`/crm/v3/objects/contacts/${contactId}`, token, { properties });
      return contactId;
    }
  }

  // Create new contact
  const created = await hubspotPost("/crm/v3/objects/contacts", token, { properties });
  const contactId = (created.data as { id?: string })?.id ?? null;
  return contactId;
}

// Upsert a HubSpot deal linked to the contact
async function upsertDeal(
  token: string,
  lead: HubSpotSyncPayload["lead"],
  contactId: string
): Promise<void> {
  const stage = STATUS_TO_STAGE[lead.status] ?? "appointmentscheduled";
  const amount = lead.budget_max ? String(lead.budget_max) : undefined;

  // Search for existing deal by LUB lead id stored in custom property
  const search = await hubspotPost(
    "/crm/v3/objects/deals/search",
    token,
    {
      filterGroups: [{
        filters: [{ propertyName: "lub_lead_id", operator: "EQ", value: lead.id }],
      }],
      limit: 1,
    }
  );

  const existingDeals = (search.data as { results?: { id: string }[] })?.results;
  const dealProperties: Record<string, string> = {
    dealname:     `${lead.name} — ${lead.property_name}`,
    dealstage:    stage,
    pipeline:     "default",
    lub_lead_id:  lead.id,
  };
  if (amount) dealProperties.amount = amount;
  if (lead.move_in_date) dealProperties.closedate = new Date(lead.move_in_date).toISOString();

  if (existingDeals?.length) {
    await hubspotPatch(`/crm/v3/objects/deals/${existingDeals[0].id}`, token, {
      properties: dealProperties,
    });
  } else {
    const created = await hubspotPost("/crm/v3/objects/deals", token, {
      properties: dealProperties,
      associations: [{
        to: { id: contactId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }],
      }],
    });
    if (!created.ok) console.error("[hubspot] deal create failed:", created.error);
  }
}

// Main entry point — call whenever a lead's status changes
export async function syncLeadToHubSpot(payload: HubSpotSyncPayload): Promise<void> {
  const { accessToken, lead } = payload;

  const contactId = await upsertContact(accessToken, lead);
  if (!contactId) {
    console.error("[hubspot] failed to upsert contact for lead:", lead.id);
    return;
  }

  await upsertDeal(accessToken, lead, contactId);
}

// Verify an access token is valid — used during connection flow
export async function verifyHubSpotToken(
  accessToken: string
): Promise<{ ok: boolean; portalId?: string; error?: string }> {
  const res = await hubspotGet("/oauth/v1/access-tokens/" + accessToken, accessToken);
  if (!res.ok) return { ok: false, error: res.error };
  const portalId = String((res.data as { hub_id?: number })?.hub_id ?? "");
  return { ok: true, portalId };
}
