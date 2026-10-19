/**
 * Model-based test support for the offline-sync spike: a weighted command generator, a driver
 * that tracks every typed text with its causal context, and the protocol invariants.
 */
import fc from "fast-check";
import { expect } from "vitest";
import type { DeviceSnapshot } from "./client";
import { copyLineage, type World } from "./harness";

export type Command =
  | { t: "create"; who: number; shared: boolean }
  | { t: "edit" | "share" | "attach" | "delete"; who: number; pick: number }
  | { t: "send"; who: number; times: number }
  | { t: "pull" | "toggle" | "snapshot" | "restore"; who: number }
  | { t: "expire-idempotency" };

/**
 * Weighted so that the interesting interleavings (concurrent edits, deletes racing queued
 * work, replays after restore) occur often. Weights were tuned by mutation testing: each
 * server guard (tombstones, idempotency, versions, audiences) must be caught when removed.
 */
export const commandArb = (
  deviceCount: number,
  { staleDevices = false } = {},
): fc.Arbitrary<Command> => {
  const who = fc.integer({ min: 0, max: deviceCount - 1 });
  const pick = fc.nat({ max: 3 });
  const targeted = (t: "edit" | "share" | "attach" | "delete") =>
    fc.record({ t: fc.constant(t), who, pick });
  const simple = (t: "pull" | "toggle" | "snapshot" | "restore") =>
    fc.record({ t: fc.constant(t), who });

  const weighted: fc.WeightedArbitrary<Command>[] = [
    {
      arbitrary: fc.record({ t: fc.constant("create" as const), who, shared: fc.boolean() }),
      weight: 3,
    },
    { arbitrary: targeted("edit"), weight: 5 },
    { arbitrary: targeted("share"), weight: 1 },
    { arbitrary: targeted("attach"), weight: 1 },
    { arbitrary: targeted("delete"), weight: 2 },
    {
      arbitrary: fc.record({
        t: fc.constant("send" as const),
        who,
        times: fc.integer({ min: 1, max: 4 }),
      }),
      weight: 5,
    },
    { arbitrary: simple("pull"), weight: 4 },
    { arbitrary: simple("toggle"), weight: 1 },
  ];
  if (staleDevices) {
    weighted.push(
      { arbitrary: simple("snapshot"), weight: 2 },
      { arbitrary: simple("restore"), weight: 2 },
      { arbitrary: fc.record({ t: fc.constant("expire-idempotency" as const) }), weight: 2 },
    );
  }
  return fc.oneof(...weighted);
};

/**
 * A whole scenario. `size: "max"` matters: fast-check's default size bias keeps arrays at
 * roughly ten elements regardless of maxLength, which left most runs nearly empty.
 */
export const scenarioArb = (deviceCount: number, options: { staleDevices?: boolean } = {}) =>
  fc.array(commandArb(deviceCount, options), { minLength: 20, maxLength: 150, size: "max" });

export const faultsArb = fc.record({
  dropRequest: fc.double({ min: 0, max: 0.4, noNaN: true }),
  dropResponse: fc.double({ min: 0, max: 0.4, noNaN: true }),
  duplicate: fc.double({ min: 0, max: 0.3, noNaN: true }),
});

/** Every text a user typed, with the text it replaced on that device (causal context). */
export interface Write {
  readonly device: number;
  readonly entryId: string;
  readonly text: string;
  readonly replaced: string | null;
  readonly mutationId: string;
  /** Made after the backup that this device was later restored from. */
  restoredAway: boolean;
}
export type Ledger = Write[];

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Test model invariant: value expected");
  return value;
}

export function run(w: World, commands: readonly Command[]): Ledger {
  const ledger: Ledger = [];
  const backups = new Map<number, { snapshot: DeviceSnapshot; ledgerLength: number }>();
  let n = 0;
  const write = (who: number, entryId: string, text: string, replaced: string | null) => {
    const mutationId = required(required(w.devices[who]).outbox.at(-1)).mutationId;
    ledger.push({ device: who, entryId, text, replaced, mutationId, restoredAway: false });
  };

  for (const c of commands) {
    if (c.t === "expire-idempotency") {
      w.server.forgetIdempotencyRecords();
      continue;
    }
    const d = required(w.devices[c.who]);
    const own = [...d.entries.values()]
      .filter((e) => e.authorId === d.userId)
      .sort((x, y) => x.id.localeCompare(y.id));
    const all = [...d.entries.values()].sort((x, y) => x.id.localeCompare(y.id));
    const pickFrom = <T>(list: readonly T[], i: number) =>
      list.length ? list[i % list.length] : undefined;

    switch (c.t) {
      case "create": {
        const body = `text-${String(++n)}`;
        write(c.who, d.create(body, c.shared ? "shared" : "private"), body, null);
        break;
      }
      case "edit": {
        const target = pickFrom(own, c.pick);
        if (target) {
          const body = `text-${String(++n)}`;
          d.edit(target.id, body);
          write(c.who, target.id, body, target.body);
        }
        break;
      }
      case "share": {
        const target = pickFrom(
          own.filter((e) => e.visibility === "private"),
          c.pick,
        );
        if (target) d.share(target.id);
        break;
      }
      case "attach": {
        const target = pickFrom(own, c.pick);
        if (target) d.attach(target.id);
        break;
      }
      case "delete": {
        const target = pickFrom(all, c.pick);
        if (target) d.delete(target.id);
        break;
      }
      case "send":
        for (let i = 0; i < c.times; i++) d.sendNext();
        break;
      case "pull":
        d.pull();
        break;
      case "toggle":
        d.online = !d.online;
        break;
      case "snapshot":
        backups.set(c.who, { snapshot: d.snapshot(), ledgerLength: ledger.length });
        break;
      case "restore": {
        const backup = backups.get(c.who);
        if (backup) {
          d.restore(backup.snapshot);
          // Writes made after the backup that never reached the server are legitimately lost.
          for (const entry of ledger.slice(backup.ledgerLength)) {
            if (entry.device === c.who) entry.restoredAway = true;
          }
        }
        break;
      }
    }
  }
  return ledger;
}

export function checkInvariants(w: World, ledger: Ledger): void {
  const { server, devices } = w;

  // 1. Every mutation's effect applied at most once.
  for (const count of server.effectCount.values()) expect(count).toBe(1);

  // 2. No resurrection, on the server or on any device.
  for (const id of server.tombstones) {
    expect(server.entries.has(id)).toBe(false);
    for (const d of devices) expect(d.entries.has(id)).toBe(false);
  }

  for (const d of devices) {
    // 3. Fully drained, and no protocol-level rejections for well-formed client behaviour.
    expect(d.outbox).toHaveLength(0);
    expect(d.issues.filter((i) => i.kind === "rejected")).toEqual([]);

    // 4. Convergence: each device holds exactly what the server lets its user see.
    const local = [...d.entries.values()]
      .map((e) => ({
        id: e.id,
        body: e.body,
        visibility: e.visibility,
        version: e.expectedVersion,
        media: e.mediaIds,
      }))
      .sort((x, y) => x.id.localeCompare(y.id));
    const remote = server
      .visibleTo(d.userId)
      .map((e) => ({
        id: e.id,
        body: e.body,
        visibility: e.visibility,
        version: e.version,
        media: e.mediaIds,
      }))
      .sort((x, y) => x.id.localeCompare(y.id));
    expect(local).toEqual(remote);

    // 5. Privacy: nothing private from the partner ever arrived, not even a deletion notice.
    const ownPrefix = d.userId === "B" ? "b" : "a";
    for (const e of d.received)
      expect(e.visibility === "shared" || e.authorId === d.userId).toBe(true);
    const seen = new Set(d.received.map((e) => e.id));
    for (const id of d.receivedDeletes) expect(seen.has(id) || id.startsWith(ownPrefix)).toBe(true);
  }

  // 6. No silently lost words. Every typed text is accounted for: it survives (in its entry or
  //    a conflict copy), or deletion intervened, or a later write by a device that had SEEN it
  //    replaced it. A text overwritten by a device that never saw it is a lost update.
  const surviving = new Set([...server.entries.values()].map((e) => e.body));
  const deleted = (entryId: string) =>
    [...copyLineage(devices, entryId)].some((id) => server.tombstones.has(id));
  const applied = (write: Write) => server.effectCount.has(write.mutationId);
  const accounted = new Set<string>();
  for (const write of ledger) {
    if (surviving.has(write.text) || deleted(write.entryId)) accounted.add(write.text);
  }
  // A text is legitimately superseded by any accounted write from a device that had seen it,
  // including unsent intermediate writes on the same device (t1 → t2 → t3 typed offline).
  for (let grew = true; grew;) {
    grew = false;
    for (const later of ledger) {
      if (later.replaced !== null && accounted.has(later.text) && !accounted.has(later.replaced)) {
        accounted.add(later.replaced);
        grew = true;
      }
    }
  }
  const lost = ledger.filter((wr) => !accounted.has(wr.text) && !(wr.restoredAway && !applied(wr)));
  expect(lost).toEqual([]);

  // 7. Stored media always belongs to a live entry, and live entries reference stored media.
  for (const owner of server.storedMedia.values()) expect(server.entries.has(owner)).toBe(true);
  for (const e of server.entries.values()) {
    for (const m of e.mediaIds) expect(server.storedMedia.get(m)).toBe(e.id);
  }
}
