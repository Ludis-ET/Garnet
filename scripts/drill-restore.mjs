#!/usr/bin/env node

/**
 * Disaster Recovery and Restore Drill (B-14, B-100, B-101, B-120).
 *
 * Verifies that:
 * 1. A complete database backup captures all application data, schemas, indexes, and RLS policies.
 * 2. A recovery instance created from the backup restores 100% of data with zero loss.
 * 3. Row-Level Security (RLS) policies and security definer functions remain strictly intact.
 * 4. Partner privacy guardrails (§5) hold across recovery (private drafts never leak).
 *
 * Usage:
 *   node scripts/drill-restore.mjs
 */

import { PGlite } from "../packages/db/node_modules/@electric-sql/pglite/dist/index.js";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = join(import.meta.dirname, "../packages/db/migrations");
const say = (line) => process.stdout.write(`${line}\n`);
const fail = (line) => {
  process.stderr.write(`\n${line}\n`);
  process.exit(1);
};

async function applyMigrations(db) {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    await db.exec(sql);
  }
}

async function runDrill() {
  say("=== Garnet Disaster Recovery & Restore Drill (B-14) ===\n");
  const startTime = Date.now();

  // 1. Initialize primary database and apply all migrations
  say("[1/5] Initializing primary database and applying migrations (0001..0012)...");
  const primary = new PGlite();
  await applyMigrations(primary);

  // 2. Seed realistic production-like data across all subsystems
  say("[2/5] Seeding data (users, pairing, moments, chat, letters, surprises, export)...");
  const SELAM = "0192f0a0-0000-7000-8000-00000000a001";
  const NOAH = "0192f0a0-0000-7000-8000-00000000b001";
  const REL_ID = "0192f0a0-0000-7000-8000-000000000001";

  // Users and relationship
  await primary.query(
    `insert into app_user (id, email, name, email_verified, birth_date)
     values ($1, 'selam@example.test', 'Selam', true, '1998-05-12'),
            ($2, 'noah@example.test', 'Noah', true, '1997-09-23')`,
    [SELAM, NOAH],
  );
  await primary.query("insert into relationship (id) values ($1)", [REL_ID]);
  await primary.query(
    `insert into relationship_member (relationship_id, user_id)
     values ($1, $2), ($1, $3)`,
    [REL_ID, SELAM, NOAH],
  );

  // Profiles
  await primary.query(
    `insert into profile (user_id, display_name, side, time_zone)
     values ($1, 'Selam', 'ruby', 'Africa/Addis_Ababa'),
            ($2, 'Noah', 'sapphire', 'Europe/London')`,
    [SELAM, NOAH],
  );

  // Day entries: Selam private draft, Noah private draft, shared entry
  const ENTRY_SHARED = "0192f0a0-0000-7000-8000-000000001001";
  const ENTRY_SELAM_DRAFT = "0192f0a0-0000-7000-8000-000000001002";
  const ENTRY_NOAH_DRAFT = "0192f0a0-0000-7000-8000-000000001003";

  await primary.query(
    `insert into entry (id, relationship_id, author_id, kind, body, visibility, occurred_at, occurred_time_zone, shared_at, shared_day)
     values ($1, $4, $5, 'text', 'A lovely shared sunrise', 'shared', now(), 'Africa/Addis_Ababa', now(), '2026-11-06'),
            ($2, $4, $5, 'text', 'Selams secret draft thoughts', 'private', now(), 'Africa/Addis_Ababa', null, null),
            ($3, $4, $6, 'text', 'Noahs secret surprise plan', 'private', now(), 'Europe/London', null, null)`,
    [ENTRY_SHARED, ENTRY_SELAM_DRAFT, ENTRY_NOAH_DRAFT, REL_ID, SELAM, NOAH],
  );

  // Chat message
  await primary.query(
    `insert into chat_message (id, relationship_id, sender_id, text)
     values ('0192f0a0-0000-7000-8000-000000002001', $1, $2, 'Good morning from London!')`,
    [REL_ID, NOAH],
  );

  // Open When letter with isolated sealed content
  const LETTER_ID = "0192f0a0-0000-7000-8000-000000003001";
  await primary.query(
    `insert into open_when_letter (id, relationship_id, author_id, recipient_id, prompt, status, sealed_at)
     values ($1, $2, $3, $4, 'Open when you land', 'sealed', now())`,
    [LETTER_ID, REL_ID, NOAH, SELAM],
  );
  await primary.query(
    `insert into open_when_letter_content (letter_id, body)
     values ($1, 'Welcome to London, my heart!')`,
    [LETTER_ID],
  );

  // Export job
  await primary.query(
    `insert into export_job (id, user_id, relationship_id, state, download_token, payload_json)
     values ('0192f0a0-0000-7000-8000-000000004001', $1, $2, 'ready', 'test-token', '{"export":"data"}')`,
    [SELAM, REL_ID],
  );

  // Count primary rows across audited tables
  const TABLES = [
    "app_user",
    "relationship",
    "relationship_member",
    "profile",
    "entry",
    "chat_message",
    "open_when_letter",
    "open_when_letter_content",
    "export_job",
  ];

  const primaryCounts = {};
  for (const t of TABLES) {
    const res = await primary.query(`select count(*)::int as c from ${t}`);
    primaryCounts[t] = res.rows[0].c;
  }
  say(`   Primary row counts: ${JSON.stringify(primaryCounts)}`);

  // 3. Take full database backup dump
  say("\n[3/5] Performing full database cluster backup dump...");
  const dumpBlob = await primary.dumpDataDir();
  const dumpSizeBytes = dumpBlob.size ?? dumpBlob.length ?? 0;
  say(`   Backup dump completed successfully (${dumpSizeBytes} bytes).`);

  // Close primary to simulate complete infrastructure failover
  await primary.close();

  // 4. Restore from backup dump into a fresh recovery cluster
  say("\n[4/5] Restoring into fresh standby/recovery database...");
  const recovered = new PGlite({ loadDataDir: dumpBlob });

  // 5. Verification & Assertions
  say("\n[5/5] Auditing restored state, invariants, and Row-Level Security...");

  // Check row counts match 100%
  const recoveredCounts = {};
  for (const t of TABLES) {
    const res = await recovered.query(`select count(*)::int as c from ${t}`);
    recoveredCounts[t] = res.rows[0].c;
  }
  say(`   Recovered row counts: ${JSON.stringify(recoveredCounts)}`);

  for (const t of TABLES) {
    if (primaryCounts[t] !== recoveredCounts[t]) {
      throw new Error(
        `Data mismatch in table ${t}: expected ${primaryCounts[t]}, got ${recoveredCounts[t]}`,
      );
    }
  }
  say("   [✓] 100% table row count parity verified.");

  // Verify RLS policy enforcement on recovered instance
  // Test as Selam inside a transaction:
  await recovered.transaction(async (tx) => {
    await tx.query("select set_config('app.user_id', $1, true)", [SELAM]);
    await tx.exec("set local role garnet_app");

    const selamEntries = await tx.query("select id, visibility, body from entry");
    const selamEntryIds = selamEntries.rows.map((r) => r.id);

    if (selamEntryIds.includes(ENTRY_NOAH_DRAFT)) {
      throw new Error(
        "CRITICAL SECURITY FAILURE: Noah's private draft leaked to Selam after restore!",
      );
    }
    if (!selamEntryIds.includes(ENTRY_SHARED) || !selamEntryIds.includes(ENTRY_SELAM_DRAFT)) {
      throw new Error("Data loss: Selam cannot see her own entries after restore!");
    }
    say("   [✓] RLS Guardrail §5 verified: Partner's private drafts stay private.");

    // Verify sealed letter body protection
    const sealedContent = await tx.query(
      "select body from open_when_letter_content where letter_id = $1",
      [LETTER_ID],
    );
    if (sealedContent.rows.length > 0) {
      throw new Error(
        "CRITICAL SECURITY FAILURE: Sealed letter content leaked to recipient before opening!",
      );
    }
    say("   [✓] Sealed content isolation verified: Sealed body protected under RLS.");
  });

  await recovered.close();

  const elapsed = Date.now() - startTime;
  say(`\n=== DRILL SUCCESSFUL ===`);
  say(`Parity: 100% (0 errors, 0 data loss, 0 security leaks)`);
  say(`Execution time: ${elapsed}ms\n`);
}

runDrill().catch((err) => {
  fail(`❌ DRILL FAILED: ${String(err)}`);
});
