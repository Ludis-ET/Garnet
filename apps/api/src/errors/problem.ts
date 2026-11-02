import { HttpException } from "@nestjs/common";
import { PROBLEMS, problemType, type Problem, type ProblemCode } from "@garnet/contracts";

/** Thrown by API code for a known outcome; the filter turns it into a problem response. */
export class ApiProblem extends Error {
  constructor(readonly code: ProblemCode) {
    super(code);
    this.name = "ApiProblem";
  }
}

/** The problem body for a code. The request id is the only per-request detail it carries. */
export function problemBody(code: ProblemCode, requestId: string): Problem {
  const { status, title } = PROBLEMS[code];
  return { type: problemType(code), title, status, code, instance: requestId };
}

const BY_STATUS: Readonly<Record<number, ProblemCode>> = {
  400: "bad_request",
  401: "unauthorized",
  404: "not_found",
  405: "method_not_allowed",
  413: "payload_too_large",
  415: "unsupported_media_type",
  503: "unavailable",
};

/**
 * Which problem an error is. Anything unexpected is "internal": its message never reaches the
 * client. Framework errors (Nest's HttpException, Fastify's parser errors) map by status.
 */
export function problemCodeOf(error: unknown): ProblemCode {
  if (error instanceof ApiProblem) return error.code;
  const status =
    error instanceof HttpException
      ? error.getStatus()
      : typeof error === "object" && error !== null && "statusCode" in error
        ? Number(error.statusCode)
        : 500;
  if (status >= 500) return BY_STATUS[status] ?? "internal";
  return BY_STATUS[status] ?? "bad_request";
}
