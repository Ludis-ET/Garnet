import type { OpenWhenView, OpenResult } from "@/domain/openWhen";
import type { DemoUser, Relationship } from "@/domain/models";

/**
 * Repository contracts. Screens and hooks depend on these interfaces only. Phase 2 provides
 * mock implementations (src/data/mock); Phase 4/5 swap in API adapters without touching screens.
 * Add an interface here when a page that needs it is designed — not before.
 */
export interface RelationshipRepository {
  getMe(): Promise<DemoUser>;
  getPartner(): Promise<DemoUser>;
  getRelationship(): Promise<Relationship>;
}

export interface OpenWhenRepository {
  /** Views for the current viewer: sealed letters never include a body. */
  list(): Promise<OpenWhenView[]>;
  get(id: string): Promise<OpenWhenView>;
  open(id: string): Promise<Exclude<OpenResult, { ok: true }> | { ok: true; view: OpenWhenView }>;
}

export interface Repositories {
  relationship: RelationshipRepository;
  openWhen: OpenWhenRepository;
}
