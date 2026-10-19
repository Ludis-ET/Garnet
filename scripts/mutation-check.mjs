#!/usr/bin/env node
// Reproducible mutation checks for the Phase 1 evidence suites.
//
// For each mutant: copy the suite into a scratch directory (never touching the real sources),
// apply ONE deliberate break, run the suite's real tests, and require them to FAIL ("killed").
// Each suite is first run unmutated in the same way; if that baseline fails, nothing is trusted.
//
// Usage:
//   pnpm mutation                 # domain, offline-sync, data-model
//   pnpm mutation --with-docker   # also media-retry (starts local S3 storage in Docker)
//   pnpm mutation --runs 5        # repeat randomized (property-based) suites N times per mutant
//   pnpm mutation --only offline-sync   # run one suite
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const withDocker = args.includes("--with-docker");
const runsArg = args.indexOf("--runs");
const randomizedRuns = runsArg === -1 ? 3 : Number(args[runsArg + 1]);
const onlyArg = args.indexOf("--only");
const only = onlyArg === -1 ? null : args[onlyArg + 1];
const shell = process.platform === "win32";

/**
 * expect: "killed" (tests must fail) or "equivalent" (documented as behaviour-preserving).
 * find must occur exactly once in the file, so a stale mutant is reported, never ignored.
 */
const suites = [
  {
    name: "domain",
    pkg: "packages/domain",
    copy: ["src"],
    runs: 1,
    mutants: [
      {
        id: "F06-1",
        file: "src/time/shared-day.ts",
        find: 'disambiguation: "earlier"',
        replace: 'disambiguation: "later"',
        expect: "killed",
        note: "DST overlap/gap disambiguation",
      },
      {
        id: "F06-2",
        file: "src/time/shared-day.ts",
        find: "  return transition.toInstant();",
        replace: "  return candidate.toInstant();",
        expect: "killed",
        note: "gap cutoff starts at the transition",
      },
      {
        id: "SPK-1",
        file: "src/spark/spark.ts",
        find: "Temporal.PlainDate.compare(day, from) >= 0",
        replace: "Temporal.PlainDate.compare(day, from) > 0",
        expect: "killed",
        note: "grace cooldown boundary (U-03 options)",
      },
      {
        id: "SPK-2",
        file: "src/spark/spark.ts",
        find: "if (state.current === 0) {",
        replace: "if (false) {",
        expect: "killed",
        note: "no grace spent without a streak (P-08)",
      },
      {
        id: "SPK-3",
        file: "src/spark/qualifying.ts",
        find: '  "reply.sent",\n] as const);',
        replace: '  "reply.sent",\n  "draft.saved",\n] as const);',
        expect: "killed",
        note: "private drafts never count (P-10)",
      },
      {
        id: "SIG-1",
        file: "src/signals/signals.ts",
        find: 'case "generic":\n      return GENERIC_PREVIEW;',
        replace: 'case "generic":\n      return { title: "Garnet", body: signal.label };',
        expect: "killed",
        note: "generic lock-screen previews",
      },
    ],
  },
  {
    name: "offline-sync",
    pkg: "spikes/offline-sync",
    copy: ["src"],
    runs: randomizedRuns,
    mutants: [
      {
        id: "F04-1",
        file: "src/server.ts",
        find: '      if (this.tombstones.has(m.entryId)) return unchanged({ status: "gone" });\n      const existing',
        replace: "      const existing",
        expect: "killed",
        note: "tombstone check on create",
      },
      {
        id: "F04-2",
        file: "src/server.ts",
        find: '    if (this.tombstones.has(m.entryId)) return unchanged({ status: "gone" });\n    const entry',
        replace: "    const entry",
        expect: "killed",
        note: "tombstone check on edit/share/attach",
      },
      {
        id: "F04-3",
        file: "src/server.ts",
        find: "if (entry.version !== m.baseVersion) return",
        replace: "if (false) return",
        expect: "killed",
        note: "optimistic concurrency",
      },
      {
        id: "F04-4",
        file: "src/server.ts",
        find: "if (previous !== undefined) {",
        replace: "if (previous !== undefined && false) {",
        expect: "killed",
        note: "idempotency keys",
      },
      {
        id: "F04-5",
        file: "src/server.ts",
        find: '(change.type === "upsert" && change.entry.visibility === "private"',
        replace: "(false",
        expect: "killed",
        note: "private-draft feed audience",
      },
      {
        id: "F04-6",
        file: "src/server.ts",
        find: 'const audience = entry?.visibility === "shared" ? this.members : new Set([actor]);',
        replace: "const audience = this.members;",
        expect: "killed",
        note: "private-delete feed audience",
      },
      {
        id: "F04-7",
        file: "src/server.ts",
        find: "if (owner === entryId) this.storedMedia.delete(mediaId);",
        replace: "",
        expect: "killed",
        note: "media purge on delete",
      },
      {
        id: "F04-8",
        file: "src/client.ts",
        find: "this.dropQueued(id, { keepDeletes: true });",
        replace: "this.dropQueued(id);",
        expect: "killed",
        note: "conflict resolution keeps a queued delete (bug 1)",
      },
      {
        id: "F04-9",
        file: "src/client.ts",
        find: "if (ownIndex !== -1) this.outbox.splice(ownIndex, 1);",
        replace: "",
        expect: "killed",
        note: "feed acknowledgement by mutationId (bug 3)",
      },
      {
        id: "F04-10",
        file: "src/client.ts",
        find: "    this.confirm(change.entry);",
        replace:
          "    if (!this.outbox.some((m) => m.entryId === change.entry.id)) this.confirm(change.entry);",
        expect: "killed",
        note: "no skipped server updates while local work is queued (bug 2)",
      },
      {
        id: "F04-E1",
        file: "src/server.ts",
        find: '    if (this.tombstones.has(mutation.entryId)) return { status: "gone" };\n',
        replace: "",
        expect: "equivalent",
        note: "tombstone check inside replay (client treats a null entry the same)",
      },
    ],
  },
  {
    name: "data-model",
    pkg: "spikes/data-model",
    copy: ["src", "schema.sql"],
    runs: 1,
    mutants: [
      {
        id: "F05-1",
        file: "schema.sql",
        find: "alter table entry               enable row level security;",
        replace: "",
        expect: "killed",
        note: "RLS on entries",
      },
      {
        id: "F05-2",
        file: "schema.sql",
        find: "create policy entry_select on entry for select\n  using (is_active_member(relationship_id) and (visibility = 'shared' or author_id = app_current_user()));",
        replace:
          "create policy entry_select on entry for select\n  using (is_active_member(relationship_id));",
        expect: "killed",
        note: "private drafts hidden from the partner",
      },
      {
        id: "F05-3",
        file: "schema.sql",
        find: "create trigger entry_no_resurrection\n  before insert on entry\n  for each row execute function entry_guard_insert();",
        replace: "",
        expect: "killed",
        note: "deleted ids cannot be re-inserted",
      },
      {
        id: "F05-4",
        file: "schema.sql",
        find: "case when r.visibility = 'private' then r.author_id end);",
        replace: "null);",
        expect: "killed",
        note: "private change-feed audience",
      },
      {
        id: "F05-5",
        file: "schema.sql",
        find: "and left_at is null) >= 2 then",
        replace: "and left_at is null) >= 3 then",
        expect: "killed",
        note: "exactly two partners",
      },
      {
        id: "F05-6",
        file: "schema.sql",
        find: "and consumed_at is null and revoked_at is null and expires_at > now()",
        replace: "and revoked_at is null",
        expect: "killed",
        note: "single-use, expiring invitations",
      },
      {
        id: "F05-7",
        file: "schema.sql",
        find: "create trigger media_purge_on_delete\n  after delete on media\n  for each row execute function media_enqueue_purge();",
        replace: "",
        expect: "killed",
        note: "media purge enqueued on delete",
      },
    ],
  },
  {
    name: "media-retry",
    pkg: "spikes/media-retry",
    copy: ["src"],
    runs: 1,
    docker: true,
    rewrite: [
      [
        "../../data-model/src/db",
        resolve(root, "spikes/data-model/src/db.ts").replaceAll("\\", "/"),
      ],
    ],
    mutants: [
      {
        id: "F07-1",
        file: "src/media-service.ts",
        find: "\"update media set status = 'ready' where id = $1 and status = 'pending_upload' returning id\"",
        replace: "\"update media set status = 'ready' where id = $1 returning id\"",
        expect: "killed",
        note: "finalize exactly once",
      },
      {
        id: "F07-2",
        file: "src/media-service.ts",
        find: "const reason = validate(bytes, row);",
        replace: "const reason = null as string | null;",
        expect: "killed",
        note: "commit-time validation",
      },
      {
        id: "F07-3",
        file: "src/media-service.ts",
        find: "for (const key of orphans) await deleteObject(this.s3, this.bucket, key);",
        replace: "",
        expect: "killed",
        note: "storage reconciliation removes late uploads",
      },
      {
        id: "F07-4",
        file: "src/media-service.ts",
        find: '            "update media_purge_queue set attempts = attempts + 1 where object_key = $1",',
        replace: '            "delete from media_purge_queue where object_key = $1",',
        expect: "killed",
        note: "failed purges stay queued",
      },
      {
        id: "F07-5",
        file: "src/media-service.ts",
        find: '  async commit(userId: string, entryId: string, mediaId: string): Promise<CommitResult> {\n    if (await this.isEntryDeleted(entryId)) return { status: "gone" };',
        replace:
          "  async commit(userId: string, entryId: string, mediaId: string): Promise<CommitResult> {",
        expect: "killed",
        note: "commit after deletion answers gone",
      },
      {
        id: "F07-6",
        file: "src/media-service.ts",
        find: '    if (!sameRequest) return { status: "rejected", reason: "media-id-reuse" };\n',
        replace: "",
        expect: "killed",
        note: "media id reuse with different parameters",
      },
    ],
  },
];

function run(command, commandArgs, cwd, env = process.env) {
  // With shell: true (needed on Windows for pnpm.cmd), arguments containing spaces must be quoted.
  const quoted = shell ? commandArgs.map((a) => (/\s/.test(a) ? `"${a}"` : a)) : commandArgs;
  const result = spawnSync(command, quoted, { cwd, shell, env, encoding: "utf8" });
  return { status: result.status ?? 1, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

function prepare(suite, label) {
  const pkgDir = join(root, suite.pkg);
  const dir = join(pkgDir, ".cache", "mutation", label);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const item of suite.copy) cpSync(join(pkgDir, item), join(dir, item), { recursive: true });
  for (const [from, to] of suite.rewrite ?? []) {
    for (const file of ["src/media-service.ts", "src/media-retry.test.ts"]) {
      const path = join(dir, file);
      if (existsSync(path)) writeFileSync(path, readFileSync(path, "utf8").replaceAll(from, to));
    }
  }
  return { pkgDir, dir };
}

/** Runs the copied suite; returns { failed, passedCount } from Vitest's summary line. */
function runSuite(suite, dir, pkgDir) {
  const env = suite.docker ? { ...process.env, ...dockerEnv } : process.env;
  const { status, output } = run(
    "pnpm",
    ["exec", "vitest", "run", "--root", dir, "--testTimeout=60000"],
    pkgDir,
    env,
  );
  const summary = /Tests\s+(?:(\d+) failed \| )?(\d+) passed/.exec(output);
  return {
    failed: status !== 0,
    failedCount: Number(summary?.[1] ?? 0),
    passedCount: Number(summary?.[2] ?? 0),
    output,
  };
}

const results = [];
/** Per-run random local-only S3 credentials for the Docker suite (never committed). */
let dockerEnv = {};
const credentialsModule = await import(
  pathToFileURL(join(root, "spikes/media-retry/scripts/local-credentials.mjs")).href
);
let problems = 0;

for (const suite of suites) {
  if (only !== null && suite.name !== only) continue;
  if (suite.docker && !withDocker) {
    process.stdout.write(`\n== ${suite.name}: skipped (needs --with-docker)\n`);
    continue;
  }
  const composeArgs = ["compose", "-f", "compose.yaml", "-p", "garnet-f07"];
  if (suite.docker) {
    if (run("docker", ["info"], root).status !== 0) {
      process.stdout.write(`\n== ${suite.name}: BLOCKED (Docker daemon not reachable)\n`);
      problems++;
      continue;
    }
    dockerEnv = credentialsModule.prepareLocalCredentials(join(root, suite.pkg));
    run("docker", [...composeArgs, "up", "-d"], join(root, suite.pkg));
  }
  try {
    const base = prepare(suite, "baseline");
    const baseline = runSuite(suite, base.dir, base.pkgDir);
    process.stdout.write(
      `\n== ${suite.name}: baseline ${baseline.failed ? "FAILED" : `passed (${baseline.passedCount} tests)`}\n`,
    );
    if (baseline.failed || baseline.passedCount === 0) {
      process.stdout.write(baseline.output.slice(-2000));
      problems++;
      continue;
    }
    for (const mutant of suite.mutants) {
      const { pkgDir, dir } = prepare(suite, mutant.id);
      const target = join(dir, mutant.file);
      const source = readFileSync(target, "utf8").replaceAll("\r\n", "\n");
      const occurrences = source.split(mutant.find).length - 1;
      if (occurrences !== 1) {
        results.push({
          ...mutant,
          suite: suite.name,
          outcome: `STALE (find matched ${occurrences}x)`,
          ok: false,
        });
        problems++;
        continue;
      }
      writeFileSync(target, source.replace(mutant.find, mutant.replace));
      let killedRuns = 0;
      for (let i = 0; i < suite.runs; i++) if (runSuite(suite, dir, pkgDir).failed) killedRuns++;
      const killed = killedRuns > 0;
      const ok = mutant.expect === "killed" ? killedRuns === suite.runs : !killed;
      if (!ok) problems++;
      results.push({
        ...mutant,
        suite: suite.name,
        outcome: `${killed ? "killed" : "survived"} ${killedRuns}/${suite.runs}`,
        ok,
      });
      rmSync(dir, { recursive: true, force: true });
    }
    rmSync(base.dir, { recursive: true, force: true });
  } finally {
    if (suite.docker) {
      run("docker", [...composeArgs, "down", "-v"], join(root, suite.pkg));
      credentialsModule.removeLocalCredentials(join(root, suite.pkg));
    }
    rmSync(join(root, suite.pkg, ".cache", "mutation"), { recursive: true, force: true });
  }
}

process.stdout.write(
  "\n| Mutant | Suite | Guard | Expected | Outcome | OK |\n|---|---|---|---|---|---|\n",
);
for (const r of results) {
  process.stdout.write(
    `| ${r.id} | ${r.suite} | ${r.note} | ${r.expect} | ${r.outcome} | ${r.ok ? "yes" : "**NO**"} |\n`,
  );
}
process.stdout.write(
  `\n${problems === 0 ? "All mutants behaved as expected." : `${problems} problem(s).`}\n`,
);
process.exit(problems === 0 ? 0 : 1);
