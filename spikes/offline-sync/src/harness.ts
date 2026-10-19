import { Device } from "./client";
import { createRandom, FaultyNetwork, NO_FAULTS, type FaultRates } from "./network";
import type { EntryId, UserId } from "./protocol";
import { ReferenceServer } from "./server";

export const PARTNERS = ["A", "B"] as const satisfies readonly [UserId, UserId];

export interface World {
  readonly server: ReferenceServer;
  readonly network: FaultyNetwork;
  readonly devices: readonly Device[];
}

/** Partner A may have several devices (multi-device per user is U-19); partner B has one. */
export function createWorld(seed: number, faults: FaultRates, devicesForA = 1): World {
  const server = new ReferenceServer(PARTNERS);
  const network = new FaultyNetwork(createRandom(seed), faults);
  const devices = [
    ...Array.from({ length: devicesForA }, (_, i) => new Device("A", `a${i + 1}`, server, network)),
    new Device("B", "b1", server, network),
  ];
  return { server, network, devices };
}

/** Heals the network, brings every device online and syncs until quiescent. */
export function settle({ network, devices }: World, maxRounds = 500): void {
  network.faults = NO_FAULTS;
  for (const d of devices) d.online = true;
  for (let round = 0; round < maxRounds; round++) {
    for (const d of devices) {
      while (d.outbox.length > 0) d.sendNext();
    }
    for (const d of devices) d.pull();
    if (devices.every((d) => d.outbox.length === 0)) {
      for (const d of devices) d.pull();
      return;
    }
  }
  throw new Error("Sync did not settle");
}

/** All entry ids that are, or descend via conflict copies from, the given entry. */
export function copyLineage(devices: readonly Device[], root: EntryId): Set<EntryId> {
  const lineage = new Set([root]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const d of devices) {
      for (const issue of d.issues) {
        if (
          issue.kind === "conflict-copy-created" &&
          lineage.has(issue.original) &&
          !lineage.has(issue.copy)
        ) {
          lineage.add(issue.copy);
          grew = true;
        }
      }
    }
  }
  return lineage;
}
