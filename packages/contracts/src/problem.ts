import { z } from "zod";

/**
 * Every API error is an RFC 9457 problem (`application/problem+json`, AGENTS.md §6, B-12).
 * `code` is stable and safe to show logic on; `title` is a fixed, human sentence per code. No
 * problem ever carries request content, ids from other relationships, or internal details.
 */
export const PROBLEM_CODES = [
  "bad_request",
  "validation_failed",
  "unauthorized",
  "registration_required",
  "recent_sign_in_required",
  "not_found",
  "method_not_allowed",
  "payload_too_large",
  "unsupported_media_type",
  "rate_limited",
  "unavailable",
  "internal",
] as const;
export type ProblemCode = (typeof PROBLEM_CODES)[number];

/** The fixed status and title for each code. */
export const PROBLEMS: Readonly<Record<ProblemCode, { status: number; title: string }>> = {
  bad_request: { status: 400, title: "The request couldn't be read." },
  validation_failed: { status: 400, title: "Some details aren't valid." },
  // "Not signed in" and "session ended" read the same: no hint about which (enumeration safety).
  unauthorized: { status: 401, title: "Please sign in again." },
  // Signed in, but the birthday or the current terms are still to come (P-79).
  registration_required: { status: 403, title: "A couple of details are still needed." },
  // Changing how someone gets in needs a recent sign-in, so a stolen phone can't do it (P-80).
  recent_sign_in_required: { status: 403, title: "Please sign in again to do this." },
  // "Not yours" and "not found" are indistinguishable (ADR-0004).
  not_found: { status: 404, title: "That isn't here." },
  method_not_allowed: { status: 405, title: "That isn't allowed here." },
  payload_too_large: { status: 413, title: "That's too large to send." },
  unsupported_media_type: { status: 415, title: "That format isn't accepted." },
  rate_limited: { status: 429, title: "That's a lot of tries. Please wait a moment." },
  unavailable: { status: 503, title: "Garnet is resting for a moment. Please try again." },
  internal: { status: 500, title: "Something went wrong on our side." },
};

/** Stable problem type URIs (RFC 9457 §3.1.1). */
export function problemType(code: ProblemCode): string {
  return `urn:garnet:problem:${code}`;
}

/** Where a validation problem was found: a path into the request, never the value itself. */
export const issueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  code: z.string(),
});

export const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  code: z.enum(PROBLEM_CODES),
  /** The request id, to match a report with the server's logs. */
  instance: z.string().optional(),
  issues: z.array(issueSchema).optional(),
});
export type Problem = z.infer<typeof problemSchema>;
