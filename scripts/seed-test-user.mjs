/**
 * Creates a free-tier test account in Supabase Auth.
 * Run once: node scripts/seed-test-user.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * to be set in .env.local with real values.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), ".env.local");
const envLines = readFileSync(envPath, "utf-8").split("\n");
const env = {};
for (const line of envLines) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) env[key.trim()] = rest.join("=").trim();
}

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_ROLE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || SUPABASE_URL === "your_supabase_project_url") {
  console.error("❌  Set NEXT_PUBLIC_SUPABASE_URL in .env.local first.");
  process.exit(1);
}
if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === "your_supabase_service_role_key") {
  console.error("❌  Set SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}

// ── Create test user ─────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const TEST_EMAIL = "test@test.com";
const TEST_PASSWORD = "leaseupbulldog";

const { data, error } = await supabase.auth.admin.createUser({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
  email_confirm: true, // skip confirmation email
});

if (error) {
  if (error.message?.includes("already been registered")) {
    console.log("ℹ️  User already exists:", TEST_EMAIL);
  } else {
    console.error("❌  Failed to create user:", error.message);
    process.exit(1);
  }
} else {
  console.log("✅  Test account created:");
  console.log("    Email:   ", TEST_EMAIL);
  console.log("    Password:", TEST_PASSWORD);
  console.log("    User ID: ", data.user.id);
}
