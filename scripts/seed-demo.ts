/**
 * seed-demo.ts — creates 4 demo accounts for demos and sub-account testing
 *
 * Run:
 *   npx tsx scripts/seed-demo.ts
 *
 * Requires a .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Accounts created:
 *   demo.starter@leaseuphq.com  / Demo1234!  → Starter plan, trialing
 *   demo.pro@leaseuphq.com      / Demo1234!  → Pro plan, active
 *   demo.portfolio@leaseuphq.com/ Demo1234!  → Portfolio plan, active
 *   demo.agent@leaseuphq.com    / Demo1234!  → Sub-account (leasing_agent) under Pro
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "Demo1234!";

const ACCOUNTS = [
  {
    email:               "demo.starter@leaseuphq.com",
    name:                "Demo Starter Co.",
    plan:                "starter",
    subscription_status: "trial",
    trial_ends_at:       new Date(Date.now() + 7 * 86400000).toISOString(), // 7 days left
    activated_at:        null,
    property: {
      name:         "Maplewood Apartments",
      address:      "100 Maple St",
      city:         "Austin",
      state:        "TX",
      zip:          "78701",
      phone_number: "+15550001001",
      total_units:  24,
      occupied_units: 18,
    },
  },
  {
    email:               "demo.pro@leaseuphq.com",
    name:                "Demo Pro Properties",
    plan:                "pro",
    subscription_status: "active",
    trial_ends_at:       null,
    activated_at:        new Date().toISOString(),
    property: {
      name:         "Sunset Ridge",
      address:      "200 Sunset Blvd",
      city:         "Dallas",
      state:        "TX",
      zip:          "75201",
      phone_number: "+15550001002",
      total_units:  80,
      occupied_units: 72,
    },
  },
  {
    email:               "demo.portfolio@leaseuphq.com",
    name:                "Demo Portfolio Group",
    plan:                "portfolio",
    subscription_status: "active",
    trial_ends_at:       null,
    activated_at:        new Date().toISOString(),
    property: {
      name:         "Harbor View",
      address:      "300 Harbor Dr",
      city:         "Houston",
      state:        "TX",
      zip:          "77001",
      phone_number: "+15550001003",
      total_units:  200,
      occupied_units: 188,
    },
  },
];

async function createOrGetUser(email: string): Promise<string> {
  // Check if user already exists
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing.users.find(u => u.email === email);
  if (found) {
    console.log(`  → user already exists: ${email}`);
    return found.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password:      PASSWORD,
    email_confirm: true, // skip email verification
  });

  if (error) throw new Error(`createUser(${email}): ${error.message}`);
  console.log(`  ✓ created auth user: ${email}`);
  return data.user.id;
}

async function createOrGetOperator(
  email: string,
  name: string,
  plan: string,
  subscription_status: string,
  trial_ends_at: string | null,
  activated_at: string | null,
): Promise<string> {
  const { data: existing } = await admin
    .from("operators")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing?.id) {
    // Update plan in case it changed
    await admin.from("operators").update({ plan, subscription_status, trial_ends_at, activated_at }).eq("id", existing.id);
    console.log(`  → operator already exists: ${email} (updated plan to ${plan})`);
    return existing.id;
  }

  const { data, error } = await admin
    .from("operators")
    .insert({ email, name, plan, subscription_status, trial_ends_at, activated_at })
    .select("id")
    .single();

  if (error) throw new Error(`createOperator(${email}): ${error.message}`);
  console.log(`  ✓ created operator: ${email} (${plan})`);
  return data.id;
}

async function createPropertyIfMissing(operatorId: string, prop: typeof ACCOUNTS[0]["property"]): Promise<string> {
  const { data: existing } = await admin
    .from("properties")
    .select("id")
    .eq("operator_id", operatorId)
    .eq("name", prop.name)
    .maybeSingle();

  if (existing?.id) {
    console.log(`  → property already exists: ${prop.name}`);
    return existing.id;
  }

  const { data, error } = await admin
    .from("properties")
    .insert({ ...prop, operator_id: operatorId })
    .select("id")
    .single();

  if (error) throw new Error(`createProperty(${prop.name}): ${error.message}`);
  console.log(`  ✓ created property: ${prop.name}`);
  return data.id;
}

async function seedLeads(propertyId: string, propertyName: string) {
  const { count } = await admin
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("property_id", propertyId);

  if ((count ?? 0) > 0) {
    console.log(`  → leads already exist for ${propertyName}`);
    return;
  }

  const leads = [
    { name: "Alex Rivera",  phone: "+15550010001", status: "new",           source: "zillow",    qualification_level: "hot"  },
    { name: "Jamie Chen",   phone: "+15550010002", status: "engaged",       source: "facebook",  qualification_level: "warm" },
    { name: "Morgan Lee",   phone: "+15550010003", status: "tour_scheduled",source: "website",   qualification_level: "hot"  },
    { name: "Taylor Kim",   phone: "+15550010004", status: "won",           source: "zillow",    qualification_level: "hot"  },
    { name: "Sam Johnson",  phone: "+15550010005", status: "lost",          source: "manual",    qualification_level: "cold" },
  ].map(l => ({ ...l, property_id: propertyId }));

  const { error } = await admin.from("leads").insert(leads);
  if (error) throw new Error(`seedLeads(${propertyName}): ${error.message}`);
  console.log(`  ✓ seeded ${leads.length} leads for ${propertyName}`);
}

async function setupSubAccount(proOperatorId: string) {
  const agentEmail = "demo.agent@leaseuphq.com";

  // Create auth user
  await createOrGetUser(agentEmail);

  // Find or create organization for the Pro operator
  let orgId: string;
  const { data: existingOrg } = await admin
    .from("organizations")
    .select("id")
    .eq("owner_operator_id", proOperatorId)
    .maybeSingle();

  if (existingOrg?.id) {
    orgId = existingOrg.id;
    console.log(`  → organization already exists`);
  } else {
    const { data: newOrg, error } = await admin
      .from("organizations")
      .insert({ owner_operator_id: proOperatorId, name: "Demo Pro Properties" })
      .select("id")
      .single();

    if (error) {
      // Table might not have owner_operator_id — try simpler insert
      const { data: newOrg2, error: e2 } = await admin
        .from("organizations")
        .insert({ name: "Demo Pro Properties" })
        .select("id")
        .single();
      if (e2) { console.warn(`  ⚠ could not create organization: ${e2.message}`); return; }
      orgId = newOrg2.id;
    } else {
      orgId = newOrg.id;
    }
    console.log(`  ✓ created organization`);
  }

  // Add agent as organization member
  const { data: existingMember } = await admin
    .from("organization_members")
    .select("id")
    .eq("organization_id", orgId)
    .eq("email", agentEmail)
    .maybeSingle();

  if (existingMember?.id) {
    console.log(`  → agent member already exists`);
  } else {
    const { error } = await admin.from("organization_members").insert({
      organization_id: orgId,
      email:           agentEmail,
      role:            "leasing_agent",
      status:          "active",
      accepted_at:     new Date().toISOString(),
    });
    if (error) console.warn(`  ⚠ could not create member: ${error.message}`);
    else       console.log(`  ✓ added demo.agent as leasing_agent`);
  }
}

async function main() {
  console.log("\n🌱  Seeding demo accounts...\n");

  let proOperatorId = "";

  for (const account of ACCOUNTS) {
    console.log(`\n── ${account.email} (${account.plan}) ──`);
    await createOrGetUser(account.email);
    const operatorId = await createOrGetOperator(
      account.email,
      account.name,
      account.plan,
      account.subscription_status,
      account.trial_ends_at,
      account.activated_at,
    );
    const propertyId = await createPropertyIfMissing(operatorId, account.property);
    await seedLeads(propertyId, account.property.name);
    if (account.plan === "pro") proOperatorId = operatorId;
  }

  console.log(`\n── demo.agent@leaseuphq.com (sub-account under Pro) ──`);
  if (proOperatorId) await setupSubAccount(proOperatorId);

  console.log(`
✅  Done! Demo credentials:
────────────────────────────────────────────────────────────
  Starter:   demo.starter@leaseuphq.com   / Demo1234!
  Pro:       demo.pro@leaseuphq.com       / Demo1234!
  Portfolio: demo.portfolio@leaseuphq.com / Demo1234!
  Sub-acct:  demo.agent@leaseuphq.com     / Demo1234!
────────────────────────────────────────────────────────────
`);
}

main().catch(err => {
  console.error("\n❌  Seed failed:", err.message);
  process.exit(1);
});
