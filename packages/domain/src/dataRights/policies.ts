/**
 * Policies and unresolved decision models for Data Rights, Account Lifecycle,
 * Space Ending, and Data Portability (B-100, B-101, P-37, P-80, U-20, U-23).
 *
 * Decision discipline (AGENTS.md Rule 4):
 * - Items marked Unresolved (U-20, U-23) must NOT have a silent default chosen.
 * - Options are exported as named typed constants and policies require explicit parameters.
 */

/**
 * U-20: What happens to shared memories when a partner deletes their account or ends pairing?
 * Direction P-37: "ask during the flow; give remaining partner opportunity to export;
 * by default remove the departing partner's entries."
 */
export type SpaceEndingPolicy =
  | { readonly kind: "remove_departing_entries" }
  | { readonly kind: "retain_shared_readonly" }
  | { readonly kind: "tombstone_all_shared" };

export const SPACE_ENDING_POLICIES = {
  /** Recommended by owner direction P-37: departing partner's entries removed, remaining partner keeps theirs. */
  REMOVE_DEPARTING_ENTRIES: { kind: "remove_departing_entries" } as const,
  /** Alternative: shared entries remain visible to remaining partner in read-only mode. */
  RETAIN_SHARED_READONLY: { kind: "retain_shared_readonly" } as const,
  /** Alternative: all entries belonging to the paired relationship are tombstoned. */
  TOMBSTONE_ALL_SHARED: { kind: "tombstone_all_shared" } as const,
} as const;

/**
 * U-23: Is there a grace period before account deletion takes effect?
 * Options: immediate deletion vs pending grace period of N days.
 */
export type AccountDeletionGracePolicy =
  { readonly kind: "immediate" } | { readonly kind: "grace_period"; readonly graceDays: number };

export const ACCOUNT_DELETION_GRACE_POLICIES = {
  /** Immediate deletion upon confirmation. */
  IMMEDIATE: { kind: "immediate" } as const,
  /** 14-day grace period where account can be restored before permanent purge. */
  GRACE_14_DAYS: { kind: "grace_period", graceDays: 14 } as const,
  /** 30-day grace period. */
  GRACE_30_DAYS: { kind: "grace_period", graceDays: 30 } as const,
} as const;

/**
 * Filter an export item list to ensure §5 / §11 product guardrails:
 * - A partner's private drafts MUST NEVER be included in the requester's export.
 * - A received Open When letter that is still sealed MUST NOT have its body exported (U-34).
 */
export interface ExportFilterInput {
  readonly requesterId: string;
  readonly days: readonly {
    readonly id: string;
    readonly authorId: string;
    readonly visibility: "private" | "shared";
    readonly body: string | null;
  }[];
  readonly letters: readonly {
    readonly id: string;
    readonly authorId: string;
    readonly recipientId: string;
    readonly status: "draft" | "sealed" | "opened";
    readonly body?: string | null;
  }[];
}

export interface SanitizedExportData {
  readonly days: readonly {
    readonly id: string;
    readonly authorId: string;
    readonly visibility: "private" | "shared";
    readonly body: string | null;
  }[];
  readonly letters: readonly {
    readonly id: string;
    readonly authorId: string;
    readonly recipientId: string;
    readonly status: "draft" | "sealed" | "opened";
    readonly body: string | null;
  }[];
}

export function sanitizeExportData(input: ExportFilterInput): SanitizedExportData {
  // Guardrail §5: Only requester's own drafts or shared entries are exported.
  // Partner's private drafts are stripped even if mistakenly loaded.
  const safeDays = input.days.filter((d) => {
    if (d.authorId === input.requesterId) return true;
    return d.visibility === "shared";
  });

  // Guardrail B-90 / U-34: For received letters, body is only visible if already opened.
  const safeLetters = input.letters.map((l) => {
    if (l.authorId === input.requesterId) {
      // Author sees their own letter body
      return { ...l, body: l.body ?? null };
    }
    // Recipient only sees body if opened
    if (l.status === "opened") {
      return { ...l, body: l.body ?? null };
    }
    return { ...l, body: null };
  });

  return {
    days: safeDays,
    letters: safeLetters,
  };
}
