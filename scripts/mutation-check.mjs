#!/usr/bin/env node
// Reproducible mutation checks for the Phase 1 evidence suites and the Phase 2 mobile guards.
//
// For each mutant: copy the suite into a scratch directory (never touching the real sources),
// apply ONE deliberate break, run the suite's real tests, and require them to FAIL ("killed").
// Each suite is first run unmutated in the same way; if that baseline fails, nothing is trusted.
//
// Usage:
//   pnpm mutation                 # domain, offline-sync, data-model
//   pnpm mutation --with-docker   # also media-retry (starts local S3 storage in Docker)
//   pnpm mutation --runs 5        # repeat randomized (property-based) suites N times per mutant
//   pnpm mutation --only offline-sync   # run one suite (also: db, api, mobile)
//   pnpm mutation --only mobile         # the Phase 2 mobile prototype (Jest)
//   pnpm mutation --only mobile --ids DAYS-1,US-1   # just these mutants (after the baseline)
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
const idsArg = args.indexOf("--ids");
const ids = idsArg === -1 ? null : new Set(args[idsArg + 1]?.split(","));
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
  {
    name: "db",
    pkg: "packages/db",
    copy: ["src", "migrations"],
    runs: 1,
    mutants: [
      {
        id: "DB-1",
        file: "migrations/0001_initial.sql",
        find: "    from session s\n    where s.token_hash = p_token_hash\n      and s.revoked_at is null\n",
        replace: "    from session s\n    where s.token_hash = p_token_hash\n",
        expect: "killed",
        note: "auth_session never returns a revoked session (ADR-0006)",
      },
      {
        id: "DB-2",
        file: "src/migrate.ts",
        find: "      if (file.checksum !== row.checksum)",
        replace: "      if (false)",
        expect: "killed",
        note: "an applied migration that changed stops the runner (append-only migrations)",
      },
      {
        id: "DB-3",
        file: "src/dev.ts",
        find: "       where not exists (",
        replace: "       where true or not exists (",
        expect: "killed",
        note: "seeding twice is safe (the two-partner trigger fires before ON CONFLICT)",
      },
    ],
  },
  {
    name: "api",
    pkg: "apps/api",
    copy: ["src", "test", "vitest.config.ts"],
    runs: 1,
    mutants: [
      {
        id: "API-1",
        file: "src/auth/session.guard.ts",
        find: "    if (isPublic === true) return true;",
        replace: "    if (isPublic !== false) return true;",
        expect: "killed",
        note: "routes are private unless marked @Public() (default deny)",
      },
      {
        id: "API-2",
        file: "src/db/database.ts",
        find: "    await sql`set local role garnet_app`.execute(trx);\n    return fn(trx);",
        replace: "    return fn(trx);",
        expect: "killed",
        note: "every viewer transaction runs as garnet_app, so RLS applies (ADR-0004)",
      },
      {
        id: "API-3",
        file: "src/app.ts",
        find: 'route: request.routeOptions.url ?? "unmatched",',
        replace: "route: request.url,",
        expect: "killed",
        note: "logs carry the route pattern, never the raw URL (AGENTS.md §6)",
      },
      {
        id: "API-4",
        file: "src/errors/problem.filter.ts",
        find: "  const body = problemBody(code, request.id);",
        replace:
          '  const body = { ...problemBody(code, request.id), detail: error instanceof Error ? error.message : "" };',
        expect: "killed",
        note: "problems never carry an error's message (B-12)",
      },
    ],
  },
  {
    name: "mobile",
    pkg: "apps/mobile",
    runner: "jest",
    copy: ["src", "jest.setup.js"],
    runs: 2,
    mutants: [
      {
        id: "OW-1",
        file: "src/domain/openWhen.ts",
        find: "        eligible: isRecipient && isEligible(letter, now),\n      };",
        replace:
          "        eligible: isRecipient && isEligible(letter, now),\n        ...{ body: letter.body },\n      };",
        expect: "killed",
        note: "sealed Open When view never carries the body (U-34 conservative)",
      },
      {
        id: "OW-2",
        file: "src/domain/openWhen.ts",
        find: "        eligible: isRecipient && isEligible(letter, now),\n      };",
        replace:
          "        eligible: isRecipient && isEligible(letter, now),\n        ...{ paper: letter.paper },\n      };",
        expect: "killed",
        note: "sealed Open When view never carries the letter paper (P-71)",
      },
      {
        id: "WID-1",
        file: "src/widgets/snapshot.ts",
        find: "    km: distance === null ? null : Math.round(distance.km / 100) * 100,\n",
        replace:
          "    km: distance === null ? null : Math.round(distance.km / 100) * 100,\n    ...{ partner: v.partner.name },\n",
        expect: "killed",
        note: "the widget snapshot never carries a name or any words (P-73)",
      },
      {
        id: "WID-2",
        file: "src/widgets/snapshot.ts",
        find: '  if (hour >= 5 && hour < 11) return "morning";',
        replace: '  if (hour >= 4 && hour < 11) return "morning";',
        expect: "killed",
        note: "widget part of the day follows the zoned wall clock (P-73, ADR-0002)",
      },
      {
        id: "FIG-1",
        file: "src/features/figures/scenes.ts",
        find: `line: "Take your time. I'm listening.",`,
        replace: `line: "You missed my message. I'm listening.",`,
        expect: "killed",
        note: "figure copy stays free of banned/guilt words",
      },
      {
        id: "FIG-2",
        file: "src/features/figures/poses.ts",
        find: "  if (reduceMotion) return { lift: 0, sway: 0, breathe: 1 };\n",
        replace: "",
        expect: "killed",
        note: "reduced motion holds every pose",
      },
      {
        id: "FIG-4",
        file: "src/features/figures/types.ts",
        find: '  "sneaky",\n] as const;',
        replace: '  "sneaky",\n  "sad",\n] as const;',
        expect: "killed",
        note: "no sad, angry or abandoned moods",
      },
      {
        id: "AUTH-1",
        file: "src/domain/auth.ts",
        find: "  return `${first}***${e.slice(at)}`;",
        replace: "  return e;",
        expect: "killed",
        note: "verify screen shows only a masked email",
      },
      {
        id: "AUTH-2",
        file: "src/data/mock/mockAuth.ts",
        find: '          resetLinks: { ...a.resetLinks, [token]: "used" },',
        replace: "          resetLinks: a.resetLinks,",
        expect: "killed",
        note: "reset links work once",
      },
      {
        id: "AUTH-3",
        file: "src/data/mock/mockAuth.ts",
        find: '          // A reset signs out every device (ADR-0006).\n          status: { kind: "signedOut" },',
        replace: "          // A reset signs out every device (ADR-0006).",
        expect: "killed",
        note: "a password reset signs the session out",
      },
      {
        id: "AUTH-4",
        file: "src/data/mock/mockAuth.ts",
        find: "          const lock = failed >= DEMO_MAX_ATTEMPTS;",
        replace: "          const lock = false;",
        expect: "killed",
        note: "repeated wrong sign-ins back off",
      },
      {
        id: "AUTH-5",
        file: "src/data/mock/mockAuth.ts",
        find: '          return { ok: false as const, reason: "may-already-exist" as const };',
        replace:
          '          return { ok: false as const, reason: "may-already-exist" as const, email: normal };',
        expect: "killed",
        note: "duplicate-account answer carries nothing about the existing account",
      },
      {
        id: "AUTH-6",
        file: "src/domain/auth.ts",
        find: "  for (const field of CREATE_ACCOUNT_STEPS[step]) {",
        replace: "  for (const field of CREATE_ACCOUNT_STEPS[0]) {",
        expect: "killed",
        note: "each create-account step checks its own fields (P-48)",
      },
      {
        id: "PAIR-1",
        file: "src/data/mock/mockPairing.ts",
        find: '    return invite?.state === "valid" ? invite : null;',
        replace: "    return invite ?? null;",
        expect: "killed",
        note: "expired and used invitations are refused, with the one message (P-18)",
      },
      {
        id: "PAIR-2",
        file: "src/data/mock/mockPairing.ts",
        find: '        setIncoming(code, { state: "used" });',
        replace: "",
        expect: "killed",
        note: "an invitation works once (P-18)",
      },
      {
        id: "PAIR-3",
        file: "src/domain/pairing.ts",
        find: "  return createdAt.add({ hours: policy.ttlHours });",
        replace: "  return createdAt.add({ hours: policy.ttlHours + 1 });",
        expect: "killed",
        note: "invitations last exactly the policy's hours (P-18)",
      },
      {
        id: "PAIR-4",
        file: "src/domain/pairing.ts",
        find: "    .filter((c) => INVITE_ALPHABET.includes(c))",
        replace: '    .filter((c) => c !== " ")',
        expect: "killed",
        note: "codes are normalised to the look-alike-free alphabet (P-50)",
      },
      {
        id: "SIDE-1",
        file: "src/domain/identity.ts",
        find: "  return partnerSide !== side;",
        replace: "  return true;",
        expect: "killed",
        note: "the two partners can never hold the same side (P-51)",
      },
      {
        id: "SIDE-2",
        file: "src/data/mock/mockSetup.ts",
        find: "        if (!isSideAvailable(side, taken)) {",
        replace: "        if (taken === null && side === null) {",
        expect: "killed",
        note: "the server refuses a side the partner holds (P-51)",
      },
      {
        id: "HOME-1",
        file: "src/data/mock/mockHome.ts",
        find: "          .filter((m) => m.authorId === userId)",
        replace: "          .filter((m) => m.authorId.length > 0)",
        expect: "killed",
        note: "Home never shows the partner's day before the reveal (U-02)",
      },
      {
        id: "HOME-2",
        file: "src/data/mock/mockHome.ts",
        find: "          shared: share,",
        replace: "          shared: true,",
        expect: "killed",
        note: "a moment stays private unless the person shares it (day-log rule 2)",
      },
      {
        id: "HOME-3",
        file: "src/data/mock/mockHome.ts",
        find: '          return v.kind === "sealed" && v.viewerIsRecipient && v.eligible;',
        replace: '          return v.kind === "sealed";',
        expect: "killed",
        note: "only a letter the viewer may open now counts as waiting",
      },
      {
        id: "HOME-4",
        file: "src/features/home/components/SignalButton.tsx",
        find: "        onLongPress={send}",
        replace: "        onLongPress={send}\n        onPress={send}",
        expect: "killed",
        note: "signals never send on a tap (HOME-04)",
      },
      {
        id: "SCROLL-1",
        file: "src/components/ui/GlassScreen.tsx",
        find: '  column: { flexGrow: 1, width: "100%", maxWidth: 440, alignSelf: "center" },',
        replace: '  column: { flex: 1, width: "100%", maxWidth: 440, alignSelf: "center" },',
        expect: "killed",
        note: "long pages scroll (scroll content grows, never shrinks)",
      },
      {
        id: "SCROLL-2",
        file: "src/app/(tabs)/_layout.tsx",
        find: "      <TabSlot style={styles.fill} />",
        replace: "      <TabSlot />",
        expect: "killed",
        note: "tab pages are one screen tall, so they scroll",
      },
      {
        id: "DAYS-1",
        file: "src/domain/days.ts",
        find: '    case "afterReveal":\n      return revealed;',
        replace: '    case "afterReveal":\n      return true;',
        expect: "killed",
        note: "'after our days meet' stays the author's until the reveal (§4)",
      },
      {
        id: "DAYS-2",
        file: "src/domain/days.ts",
        find: '  if (from === "shared") return false;',
        replace: "",
        expect: "killed",
        note: "a shared moment stays shared (P-20)",
      },
      {
        id: "DAYS-3",
        file: "src/data/mock/mockDays.ts",
        find: '.filter((x) => x.mine || partnerCanSee(x.e.visibility, stateOf(s, x.day) === "ready"))',
        replace: ".filter((x) => x.mine || x.e.visibility !== undefined)",
        expect: "killed",
        note: "the partner's private drafts never leave the repository (§4)",
      },
      {
        id: "DAYS-4",
        file: "src/domain/days.ts",
        find: "(input.meReady && input.partnerReady) ||",
        replace: "(input.meReady || input.partnerReady) ||",
        expect: "killed",
        note: "the recap waits for both (U-06 option both-ready)",
      },
      {
        id: "US-1",
        file: "src/data/mock/mockUs.ts",
        find: "              i.responses.length === 0 &&",
        replace: "              true &&",
        expect: "killed",
        note: "an answered support signal is no longer pinned (US-05)",
      },
      {
        id: "CHAT-1",
        file: "src/domain/chat.ts",
        find: "  return mine === true && partners === true;",
        replace: "  return mine === true;",
        expect: "killed",
        note: '"Seen" only when both said yes (P-58, U-35)',
      },
      {
        id: "CHAT-2",
        file: "src/data/mock/mockChat.ts",
        find: "partnerTyping: chat.partner.typingIndicators && chat.partnerTyping,",
        replace: "partnerTyping: chat.partnerTyping,",
        expect: "killed",
        note: "typing shows only when the partner shares it (P-58)",
      },
      {
        id: "CHAT-3",
        file: "src/data/mock/mockChat.ts",
        find: "receiptsActive(chat.settings.readReceipts, chat.partner.readReceipts) &&\n            chat.partnerInChat,",
        replace: "chat.partnerInChat,",
        expect: "killed",
        note: "the partner shows as here only under mutual Seen (P-61)",
      },
      {
        id: "COMP-1",
        file: "src/data/mock/mockHome.ts",
        find: '.filter((e) => mine || e.visibility === "shared")',
        replace: ".filter((e) => mine || e.visibility !== undefined)",
        expect: "killed",
        note: "characters never reflect the partner's drafts (P-57, §4)",
      },
      {
        id: "LOG-1",
        file: "src/features/home/components/LogSheet.tsx",
        find: 'if (hasContent) onSave({ input: input("private"), draft: true });',
        replace: 'if (hasContent) onSave({ input: input("shared"), draft: true });',
        expect: "killed",
        note: "closing the log sheet keeps a private draft, never shares it (P-62, §5)",
      },
      {
        id: "SRCH-1",
        file: "src/data/mock/mockSearch.ts",
        find: 'if (!mine && e.visibility !== "shared") continue;',
        replace: "if (!mine && e.deleted === true) continue;",
        expect: "killed",
        note: "search never finds a partner's private or unrevealed moment (P-63, §4)",
      },
      {
        id: "SRCH-2",
        file: "src/data/mock/mockSearch.ts",
        find: "if (!matches(view.safePrompt, query)) continue;",
        replace: "if (!matches(`${view.safePrompt} ${l.body}`, query)) continue;",
        expect: "killed",
        note: "search matches a letter's prompt only, never its words (P-63)",
      },
      {
        id: "DIST-1",
        file: "src/data/mock/mockUs.ts",
        find: "!sharing || !paired || a === null || b === null",
        replace: "!sharing || a === null || b === null",
        expect: "killed",
        note: "no distance from the partner's location before pairing (P-66)",
      },
      {
        id: "LOC-1",
        file: "src/data/mock/mockUs.ts",
        find: "{ ...coarsen(point.lat, point.lon), at: now().toString() }",
        replace: "{ lat: point.lat, lon: point.lon, at: now().toString() }",
        expect: "killed",
        note: "only a rounded location (about 10 km) is ever kept (P-66)",
      },
      {
        id: "UNREAD-1",
        file: "src/data/mock/mockChat.ts",
        find: "{ ...s, chat: { ...s.chat, readUpTo: at } }",
        replace: "{ ...s, chat: { ...s.chat, readUpTo: at, partnerSeenUpTo: at } }",
        expect: "killed",
        note: "reading clears your own count and tells the partner nothing (P-66, P-58)",
      },
      {
        id: "NOTIF-1",
        file: "src/domain/notifications.ts",
        find: "return { ...GENERIC_NOTIFICATION };",
        replace: "return { title: GENERIC_NOTIFICATION.title, body: spec.label };",
        expect: "killed",
        note: "generic previews read the same for every category (P-17, §5)",
      },
      {
        id: "WATCH-1",
        file: "src/data/mock/mockHome.ts",
        find: "s.profiles.partner.ready,",
        replace: "true,",
        expect: "killed",
        note: "both characters only once both use the app (P-63)",
      },
      {
        id: "SUR-1",
        file: "src/domain/surprises.ts",
        find: "content: fromMe ? s.content : null,",
        replace: "content: s.content,",
        expect: "killed",
        note: "a surprise's content never reaches the recipient before it opens (SUR, A9)",
      },
      {
        id: "SUR-2",
        file: "src/data/mock/mockSurprises.ts",
        find: 'if (current.kind !== "locked" || current.fromMe || !current.ready)',
        replace: 'if (current.kind !== "locked" || current.fromMe)',
        expect: "killed",
        note: "a surprise opens only once its time has come (SUR-06)",
      },
      {
        id: "EVT-1",
        file: "src/domain/events.ts",
        find: ': { ok: false, reason: "missing" };',
        replace: ": { ok: true, instant: later.toInstant() };",
        expect: "killed",
        note: "a time the clocks skip is refused, not moved (ADR-0002)",
      },
      {
        id: "MEM-1",
        file: "src/data/mock/mockMemories.ts",
        find: "patch(id, (m) => ({ ...m, deleted: true }));",
        replace: "patch(id, (m) => ({ ...m }));",
        expect: "killed",
        note: "a deleted memory is gone for both (MEM-09)",
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

/** Runs the copied suite; returns { failed, passedCount } from the runner's summary line. */
/**
 * Runs a suite on a scratch copy. For Jest, `related` (a mutated file) limits the run to the
 * tests that import it, directly or indirectly (--findRelatedTests): a mutant can only be
 * killed by those, and the full mobile suite takes minutes per run. The baseline runs it all.
 */
function runSuite(suite, dir, pkgDir, related) {
  if (suite.runner === "jest") {
    // The package's Jest config (package.json) is reused with the scratch copy as rootDir.
    const { status, output } = run(
      "pnpm",
      // The real config ignores /.cache/ (where these copies live); only node_modules here.
      [
        "exec",
        "jest",
        "--ci",
        // A failing render can leave a timer open; don't let one mutant hang the whole run.
        "--forceExit",
        "--rootDir",
        dir,
        "--testPathIgnorePatterns",
        "/node_modules/",
        ...(related === undefined ? [] : ["--findRelatedTests", related]),
      ],
      pkgDir,
    );
    const summary = /Tests:\s+(?:(\d+) failed, )?(\d+) passed/.exec(output);
    return {
      failed: status !== 0,
      failedCount: Number(summary?.[1] ?? 0),
      passedCount: Number(summary?.[2] ?? 0),
      output,
    };
  }
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
      if (ids !== null && !ids.has(mutant.id)) continue;
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
      for (let i = 0; i < suite.runs; i++)
        if (runSuite(suite, dir, pkgDir, suite.runner === "jest" ? target : undefined).failed)
          killedRuns++;
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
