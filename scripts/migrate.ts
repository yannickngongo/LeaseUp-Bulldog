// scripts/migrate.ts
//
// Applies pending migrations from supabase/migrations/*.sql to the database.
// Tracks applied migrations in the _lub_migrations table so it's idempotent.
//
// Usage:
//   npm run db:migrate          # apply all pending migrations
//   npm run db:migrate -- check # report which migrations are pending, don't apply
//
// Requires DATABASE_URL env var. In Supabase: Project Settings → Database →
// Connection string → "URI" (use the "Connection pooling" connection — port 6543).

import { Client } from "pg";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const MIGRATIONS_DIR = "supabase/migrations";

interface MigrationRow {
  filename:  string;
  checksum:  string;
  applied_at: string;
}

function checksum(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

function listMigrationFiles(): string[] {
  try {
    return readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith(".sql"))
      .sort();
  } catch {
    console.error(`Could not read ${MIGRATIONS_DIR}/`);
    process.exit(1);
  }
}

async function ensureMigrationsTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _lub_migrations (
      filename    TEXT        PRIMARY KEY,
      checksum    TEXT        NOT NULL,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function getApplied(client: Client): Promise<Map<string, MigrationRow>> {
  const { rows } = await client.query<MigrationRow>(
    `SELECT filename, checksum, applied_at::text FROM _lub_migrations`
  );
  return new Map(rows.map(r => [r.filename, r]));
}

async function main() {
  const checkOnly = process.argv.includes("check");

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: DATABASE_URL is not set.");
    console.error("Find it in Supabase → Project Settings → Database → Connection string (URI).");
    process.exit(1);
  }

  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await ensureMigrationsTable(client);
    const applied = await getApplied(client);
    const files   = listMigrationFiles();

    const pending: { filename: string; sql: string; checksum: string }[] = [];
    const drift:   string[] = [];

    for (const filename of files) {
      const sql      = readFileSync(join(MIGRATIONS_DIR, filename), "utf8");
      const sum      = checksum(sql);
      const existing = applied.get(filename);

      if (!existing) {
        pending.push({ filename, sql, checksum: sum });
      } else if (existing.checksum !== sum) {
        drift.push(filename);
      }
    }

    console.log(`Migrations directory: ${MIGRATIONS_DIR}`);
    console.log(`Total files:          ${files.length}`);
    console.log(`Already applied:      ${applied.size}`);
    console.log(`Pending:              ${pending.length}`);
    if (drift.length > 0) {
      console.log(`⚠ DRIFT detected:`);
      for (const f of drift) console.log(`    ${f} — file changed since it was applied`);
      console.log("  Drifted migrations are NOT re-applied. Edit them with care.\n");
    }

    if (pending.length === 0) {
      console.log("✓ Database is up to date. Nothing to apply.");
      return;
    }

    console.log("\nPending migrations:");
    for (const p of pending) console.log(`    ${p.filename}  (${p.checksum})`);

    if (checkOnly) {
      console.log("\n--check mode: not applying. Run without 'check' to apply.");
      return;
    }

    console.log("\nApplying...");
    for (const p of pending) {
      process.stdout.write(`  ${p.filename} ...`);
      try {
        await client.query("BEGIN");
        await client.query(p.sql);
        await client.query(
          `INSERT INTO _lub_migrations (filename, checksum) VALUES ($1, $2)`,
          [p.filename, p.checksum]
        );
        await client.query("COMMIT");
        console.log(" ✓");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        console.log(" ✗");
        console.error(`\nFailed to apply ${p.filename}:`);
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    }

    console.log(`\n✓ Applied ${pending.length} migration${pending.length === 1 ? "" : "s"}.`);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error("Migration runner failed:", err);
  process.exit(1);
});
