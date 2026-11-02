import { problemSchema, type Problem, type Schema } from "@garnet/contracts";

/**
 * Talking to the Garnet API (P-76, B0). Every response is checked against its contract before a
 * screen sees it, and every failure becomes one ApiError with a kind a screen can act on:
 * offline (no connection), timeout, problem (the API said no, RFC 9457), or invalid (an answer
 * that doesn't match the contract). Nothing about the request is kept or logged.
 */
export type ApiErrorKind = "offline" | "timeout" | "problem" | "invalid";

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number | null = null,
    readonly problem: Problem | null = null,
  ) {
    super(kind);
    this.name = "ApiError";
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** The session token, when there is one (B1 onwards). */
  token?: () => string | null;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface ApiClient {
  get<T>(path: string, schema: Schema<T>): Promise<T>;
}

/** No phone request should wait longer than this before telling the person. */
export const DEFAULT_TIMEOUT_MS = 10_000;

export function createApiClient(options: ApiClientOptions): ApiClient {
  const base = options.baseUrl.replace(/\/+$/, "");
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const doFetch = options.fetch ?? fetch;

  async function request<T>(path: string, schema: Schema<T>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
    const token = options.token?.() ?? null;
    let response: Response;
    try {
      response = await doFetch(`${base}${path}`, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...(token === null ? {} : { authorization: `Bearer ${token}` }),
        },
        signal: controller.signal,
      });
    } catch {
      throw new ApiError(controller.signal.aborted ? "timeout" : "offline");
    } finally {
      clearTimeout(timer);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError("invalid", response.status);
    }
    if (!response.ok) {
      const problem = problemSchema.safeParse(body);
      throw new ApiError(
        problem.success ? "problem" : "invalid",
        response.status,
        problem.success ? problem.data : null,
      );
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new ApiError("invalid", response.status);
    return parsed.data;
  }

  return { get: request };
}
