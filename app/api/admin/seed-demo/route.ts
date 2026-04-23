// POST /api/admin/seed-demo
// Creates demo accounts for showing demos. Protected by CRON_SECRET.
// Call once: POST https://lease-up-bulldog.vercel.app/api/admin/seed-demo
//   -H "Authorization: Bearer <CRON_SECRET>"

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const PASSWORD = "Demo1234!";

const ACCOUNTS = [
  {
    email:               "demo.starter@leaseuphq.com",
    name:                "Demo Starter Co.",
    plan:                "starter",
    subscription_status: "trial",
    trial_ends_at:       new Date(Date.now() + 30 * 86400000).toISOString(),
    activated_at:        null as string | null,
    property: {
      name: "Maplewood Apartments", address: "100 Maple St",
      city: "Austin", state: "TX", zip: "78701",
      phone_number: "+15550001001", total_units: 24, occupied_units: 18,
    },
  },
  {
    email:               "demo.pro@leaseuphq.com",
    name:                "Demo Pro Properties",
    plan:                "pro",
    subscription_status: "active",
    trial_ends_at:       null as string | null,
    activated_at:        new Date().toISOString(),
    property: {
      name: "Sunset Ridge", address: "200 Sunset Blvd",
      city: "Dallas", state: "TX", zip: "75201",
      phone_number: "+15550001002", total_units: 80, occupied_units: 72,
    },
  },
  {
    email:               "demo.portfolio@leaseuphq.com",
    name:                "Demo Portfolio Group",
    plan:                "portfolio",
    subscription_status: "active",
    trial_ends_at:       null as string | null,
    activated_at:        new Date().toISOString(),
    property: {
      name: "Harbor View", address: "300 Harbor Dr",
      city: "Houston", state: "TX", zip: "77001",
      phone_number: "+15550001003", total_units: 200, occupied_units: 188,
    },
  },
];

const DEMO_LEADS = [
  { name: "Alex Rivera",  phone: "+15550010001", status: "new",            source: "zillow",   qualification_level: "hot"  },
  { name: "Jamie Chen",   phone: "+15550010002", status: "engaged",        source: "facebook", qualification_level: "warm" },
  { name: "Morgan Lee",   phone: "+15550010003", status: "tour_scheduled", source: "website",  qualification_level: "hot"  },
  { name: "Taylor Kim",   phone: "+15550010004", status: "won",            source: "zillow",   qualification_level: "hot"  },
  { name: "Sam Johnson",  phone: "+15550010005", status: "lost",           source: "manual",   qualification_level: "cold" },
];

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const log: string[] = [];

  for (const account of ACCOUNTS) {
    // Create or update auth user
    const { data: existing } = await db.auth.admin.listUsers();
    const existingUser = existing.users.find(u => u.email === account.email);
    let userId: string;

    if (existingUser) {
      // Update password in case it changed
      await db.auth.admin.updateUserById(existingUser.id, { password: PASSWORD });
      userId = existingUser.id;
      log.push(`updated auth: ${account.email}`);
    } else {
      const { data, error } = await db.auth.admin.createUser({
        email: account.email, password: PASSWORD, email_confirm: true,
      });
      if (error) { log.push(`ERROR creating ${account.email}: ${error.message}`); continue; }
      userId = data.user.id;
      log.push(`created auth: ${account.email}`);
    }
    void userId;

    // Create or update operator row
    const { data: existingOp } = await db
      .from("operators").select("id").eq("email", account.email).maybeSingle();

    let operatorId: string;
    if (existingOp?.id) {
      await db.from("operators").update({
        plan: account.plan,
        subscription_status: account.subscription_status,
        trial_ends_at: account.trial_ends_at,
        activated_at: account.activated_at,
      }).eq("id", existingOp.id);
      operatorId = existingOp.id;
      log.push(`updated operator: ${account.email} → ${account.plan}`);
    } else {
      const { data, error } = await db.from("operators")
        .insert({ email: account.email, name: account.name, plan: account.plan,
                  subscription_status: account.subscription_status,
                  trial_ends_at: account.trial_ends_at, activated_at: account.activated_at })
        .select("id").single();
      if (error) { log.push(`ERROR creating operator ${account.email}: ${error.message}`); continue; }
      operatorId = data.id;
      log.push(`created operator: ${account.email} (${account.plan})`);
    }

    // Create property if missing
    const { data: existingProp } = await db.from("properties").select("id")
      .eq("operator_id", operatorId).eq("name", account.property.name).maybeSingle();

    let propertyId: string;
    if (existingProp?.id) {
      propertyId = existingProp.id;
      log.push(`property exists: ${account.property.name}`);
    } else {
      const { data, error } = await db.from("properties")
        .insert({ ...account.property, operator_id: operatorId }).select("id").single();
      if (error) { log.push(`ERROR creating property: ${error.message}`); continue; }
      propertyId = data.id;
      log.push(`created property: ${account.property.name}`);
    }

    // Seed leads if none exist
    const { count } = await db.from("leads").select("id", { count: "exact", head: true })
      .eq("property_id", propertyId);
    if ((count ?? 0) === 0) {
      const { error } = await db.from("leads").insert(
        DEMO_LEADS.map(l => ({ ...l, property_id: propertyId }))
      );
      if (error) log.push(`ERROR seeding leads: ${error.message}`);
      else       log.push(`seeded 5 leads for ${account.property.name}`);
    } else {
      log.push(`leads exist for ${account.property.name}`);
    }
  }

  return NextResponse.json({ ok: true, log });
}
