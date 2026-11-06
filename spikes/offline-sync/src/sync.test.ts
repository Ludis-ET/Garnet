import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Device } from "./client";
import { createWorld, settle, type World } from "./harness";
import { checkInvariants, faultsArb, run, scenarioArb } from "./model";
import { NO_FAULTS } from "./network";

const deviceById = (w: World, id: string): Device => {
  const device = w.devices.find((d) => d.deviceId === id);
  if (!device) throw new Error(`No device ${id}`);
  return device;
};

function world(devicesForA = 1): World & { a: Device; b: Device } {
  const w = createWorld(1, NO_FAULTS, devicesForA);
  return { ...w, a: deviceById(w, "a1"), b: deviceById(w, "b1") };
}

describe("idempotent retries", () => {
  it("a lost response followed by a retry applies the effect exactly once", () => {
    const { server, network, a } = world();
    const id = a.create("hello", "shared");

    network.faults = { dropRequest: 0, dropResponse: 1, duplicate: 0 };
    a.sendNext(); // applied on server, response lost
    expect(a.outbox).toHaveLength(1);

    network.faults = NO_FAULTS;
    a.sendNext(); // retry with the same mutationId
    expect(a.outbox).toHaveLength(0);
    expect(server.entries.get(id)?.body).toBe("hello");
    expect([...server.effectCount.values()]).toEqual([1]);
  });

  it("a duplicated request is applied once", () => {
    const { server, network, a } = world();
    a.create("hello", "shared");
    network.faults = { dropRequest: 0, dropResponse: 0, duplicate: 1 };
    a.sendNext();
    expect(server.entries.size).toBe(1);
    expect([...server.effectCount.values()]).toEqual([1]);
  });

  it("reusing an idempotency key with a different payload is rejected", () => {
    const { server } = world();
    const create = { kind: "create", entryId: "x", body: "one", visibility: "shared" } as const;
    expect(server.apply("A", { ...create, mutationId: "m1" }).status).toBe("applied");
    expect(server.apply("A", { ...create, mutationId: "m1", body: "two" })).toEqual({
      status: "rejected",
      reason: "idempotency-key-reuse",
    });
    expect(server.entries.get("x")?.body).toBe("one");
  });
});

describe("deletion cannot be undone by stale devices (§11, §12)", () => {
  it("queued edits and media uploads for a deleted entry are answered 'gone' and dropped", () => {
    const { server, a, b } = world();
    const id = a.create("our day", "shared");
    a.sendNext();
    b.pull();

    a.online = false; // A is offline and keeps working
    a.edit(id, "our day, edited");
    a.attach(id);

    b.delete(id); // B deletes the shared memory for both
    b.sendNext();

    a.online = true;
    while (a.outbox.length > 0) a.sendNext();

    expect(server.tombstones.has(id)).toBe(true);
    expect(server.entries.has(id)).toBe(false);
    expect(server.storedMedia.size).toBe(0);
    expect(a.entries.has(id)).toBe(false);
    expect(a.issues).toContainEqual({ kind: "deleted-elsewhere", entryId: id });
  });

  it("pulling first purges queued uploads before they are ever sent", () => {
    const { server, a, b } = world();
    const id = a.create("our day", "shared");
    a.sendNext();
    b.pull();
    a.online = false;
    a.attach(id);
    b.delete(id);
    b.sendNext();

    a.online = true;
    a.pull();
    expect(a.outbox).toHaveLength(0); // the media upload was never attempted
    expect(server.storedMedia.size).toBe(0);
  });

  it("re-sending a create for a deleted id cannot resurrect it", () => {
    const { server } = world();
    const create = { kind: "create", entryId: "x", body: "hi", visibility: "shared" } as const;
    server.apply("A", { ...create, mutationId: "m1" });
    server.apply("B", { kind: "delete", entryId: "x", mutationId: "m2" });
    expect(server.apply("A", { ...create, mutationId: "m3" })).toEqual({ status: "gone" });
    expect(server.entries.has("x")).toBe(false);
  });

  it("a device restored from an old backup cannot resurrect a deleted entry, even after idempotency records expire", () => {
    const w = world();
    const { server, a, b } = w;
    const id = a.create("our day", "shared");
    const backup = a.snapshot(); // backup taken while the create was still queued
    settle(w);

    b.delete(id);
    b.sendNext();
    server.forgetIdempotencyRecords();

    a.restore(backup); // old outbox re-sends the original create
    settle(w);
    expect(server.entries.has(id)).toBe(false);
    expect(a.entries.has(id)).toBe(false);
  });

  it("deleting media-bearing entries purges stored media", () => {
    const w = world();
    const { server, a } = w;
    const id = a.create("photo", "shared");
    a.attach(id);
    settle(w);
    expect(server.storedMedia.size).toBe(1);
    a.delete(id);
    a.sendNext();
    expect(server.storedMedia.size).toBe(0);
  });
});

describe("privacy of drafts (§2, §11)", () => {
  it("the partner never receives a private draft or its edit history", () => {
    const { a, b } = world();
    const id = a.create("draft v1", "private");
    a.edit(id, "draft v2");
    while (a.outbox.length > 0) a.sendNext();
    b.pull();
    expect(b.entries.size).toBe(0);
    expect(b.received).toHaveLength(0);

    a.share(id);
    a.sendNext();
    b.pull();
    expect(b.received.map((e) => [e.body, e.visibility])).toEqual([["draft v2", "shared"]]);
  });

  it("probing a partner's private entry id is indistinguishable from a missing one", () => {
    const { server, a } = world();
    const id = a.create("secret", "private");
    a.sendNext();
    expect(server.apply("B", { kind: "delete", entryId: id, mutationId: "probe1" })).toEqual({
      status: "rejected",
      reason: "not-found",
    });
    expect(
      server.apply("B", {
        kind: "edit",
        entryId: id,
        mutationId: "probe2",
        body: "x",
        baseVersion: 1,
      }),
    ).toEqual({ status: "rejected", reason: "not-found" });
    expect(server.entries.get(id)?.body).toBe("secret");
  });

  it("deleting a private draft is not announced to the partner", () => {
    const { a, b } = world();
    const id = a.create("secret", "private");
    a.sendNext();
    a.delete(id);
    a.sendNext();
    b.pull();
    expect(b.receivedDeletes).toHaveLength(0);
  });

  it("rejects non-members", () => {
    const { server } = world();
    expect(server.apply("mallory", { kind: "delete", entryId: "x", mutationId: "m" })).toEqual({
      status: "rejected",
      reason: "forbidden",
    });
  });
});

describe("deterministic regressions for the three design bugs found by property tests (F-04)", () => {
  it("bug 1: a delete queued after a conflicting edit is not lost during conflict resolution", () => {
    const w = world(2);
    const a1 = w.a;
    const a2 = deviceById(w, "a2");
    const id = a1.create("v1", "shared");
    a1.sendNext();
    a2.pull();
    a2.edit(id, "edited on tablet");
    a2.sendNext(); // server now at v2

    a1.online = false;
    a1.edit(id, "edited on phone"); // based on v1, will conflict
    a1.delete(id); // the user then deletes it
    a1.online = true;
    settle(w);

    expect(w.server.tombstones.has(id)).toBe(true);
    for (const d of w.devices) expect(d.entries.has(id)).toBe(false);
  });

  it("bug 2: server updates are not skipped while more local work is queued (no stale base version)", () => {
    const w = world();
    const { server, network, a } = w;
    const id = a.create("v1", "shared");
    a.sendNext(); // server v1
    a.edit(id, "a"); // E1, base 1
    a.edit(id, "b"); // E2, base 2, still queued behind E1
    network.faults = { dropResponse: 1, dropRequest: 0, duplicate: 0 };
    a.sendNext(); // E1 applied (server v2), response lost
    network.faults = NO_FAULTS;
    a.pull(); // acknowledges E1; E2 is still queued for the same entry
    a.edit(id, "c"); // must be based on the server's v2 + E2, not a stale v1
    settle(w);

    expect(a.issues.filter((i) => i.kind === "conflict-copy-created")).toEqual([]);
    expect(server.entries.get(id)?.body).toBe("c");
  });

  it("a device restored from a backup converges with the server", () => {
    const w = world();
    const { server, a } = w;
    const id = a.create("t1", "private");
    const backup = a.snapshot(); // the create is still queued in the backup
    a.edit(id, "t2");
    a.sendNext();
    a.sendNext();
    a.pull();
    a.restore(backup);
    server.forgetIdempotencyRecords();
    a.pull(); // with the old design, these updates were skipped and the cursor advanced
    settle(w);

    expect(a.entries.get(id)?.body).toBe(server.entries.get(id)?.body);
    expect(a.entries.get(id)?.expectedVersion).toBe(server.entries.get(id)?.version);
  });

  it("bug 3: a lost response followed by a pull is acknowledged, so the next edit does not falsely conflict", () => {
    const w = world();
    const { server, network, a } = w;
    const id = a.create("v1", "shared");
    a.sendNext();
    a.edit(id, "v2");
    network.faults = { dropRequest: 0, dropResponse: 1, duplicate: 0 };
    a.sendNext(); // applied on the server, response lost; still queued
    network.faults = NO_FAULTS;
    a.pull(); // the feed carries our own mutationId: acknowledge it
    expect(a.outbox).toHaveLength(0);

    a.edit(id, "v3");
    a.sendNext();
    expect(a.issues.filter((i) => i.kind === "conflict-copy-created")).toEqual([]);
    expect(server.entries.get(id)?.body).toBe("v3");
  });
});

describe("multi-device conflicts (U-19)", () => {
  it("a conflicting offline edit is preserved as a private conflict copy, never lost", () => {
    const w = world(2);
    const a1 = w.a;
    const a2 = deviceById(w, "a2");
    const id = a1.create("v1", "shared");
    a1.sendNext();
    a2.pull();

    a1.edit(id, "from phone");
    a2.edit(id, "from tablet");
    a1.sendNext();
    a2.sendNext(); // conflict

    settle(w);
    const bodies = [...w.server.entries.values()].map((e) => [e.body, e.visibility]);
    expect(bodies).toContainEqual(["from phone", "shared"]);
    expect(bodies).toContainEqual(["from tablet", "private"]); // never auto-shared
    expect(a2.issues.some((i) => i.kind === "conflict-copy-created")).toBe(true);
  });
});

describe("properties under random faults (fast-check)", () => {
  it("one device per partner: all invariants hold and edits never conflict", () => {
    fc.assert(
      fc.property(fc.integer(), faultsArb, scenarioArb(2), (seed, faults, commands) => {
        const w = createWorld(seed, faults, 1);
        const ledger = run(w, commands);
        settle(w);
        checkInvariants(w, ledger);
        for (const d of w.devices)
          expect(d.issues.filter((i) => i.kind === "conflict-copy-created")).toEqual([]);
      }),
      { numRuns: 400 },
    );
  }, 30_000);

  it("two devices for one partner: all invariants hold, conflicts preserve text", () => {
    fc.assert(
      fc.property(fc.integer(), faultsArb, scenarioArb(3), (seed, faults, commands) => {
        const w = createWorld(seed, faults, 2);
        const ledger = run(w, commands);
        settle(w);
        checkInvariants(w, ledger);
      }),
      { numRuns: 400 },
    );
    // Thousands of simulated syncs: seconds alone, longer when `pnpm check` runs every suite at once.
  }, 30_000);

  it("stale devices restored from backups + expired idempotency records: no resurrection, no double effects", () => {
    fc.assert(
      fc.property(
        fc.integer(),
        faultsArb,
        scenarioArb(3, { staleDevices: true }),
        (seed, faults, commands) => {
          const w = createWorld(seed, faults, 2);
          const ledger = run(w, commands);
          settle(w);
          checkInvariants(w, ledger);
        },
      ),
      { numRuns: 400 },
    );
  }, 30_000);
});
