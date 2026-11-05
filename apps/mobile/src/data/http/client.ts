import { problemSchema, type Problem, type Schema } from "@garnet/contracts";

/**
 * Talking to the Garnet API (P-76). Every response is checked against its contract before a
 * screen sees it, and every failure becomes one ApiError with a kind a screen can act on:
 * offline (no connection), timeout, problem (the API said no, RFC 9457), or invalid (an answer
 * that doesn't match the contract). Nothing about the request is kept or logged.
 */
export type ApiErrorKind = "offline" | "timeout" | "problem" | "invalid";

/** Marks a request as the app's own; the API refuses changes without it (CSRF). */
export const CLIENT_HEADER = { name: "x-garnet-client", value: "app" } as const;

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
  /** Extra headers for every request: the session cookie from Better Auth's client (B1). */
  headers?: () => Promise<Record<string, string>>;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface ApiClient {
  get<T>(path: string, schema: Schema<T>): Promise<T>;
  post<T>(path: string, schema: Schema<T>, body?: unknown): Promise<T>;
  /** A POST the API answers with 204 No Content. */
  postNoContent(path: string, body: unknown): Promise<void>;
  patch(path: string, body: unknown): Promise<void>;
  delete(path: string): Promise<void>;
  /** A DELETE the API answers with a body. */
  deleteWith<T>(path: string, schema: Schema<T>): Promise<T>;
}

/** No phone request should wait longer than this before telling the person. */
export const DEFAULT_TIMEOUT_MS = 10_000;

type Method = "GET" | "POST" | "PATCH" | "DELETE";

export function createApiClient(options: ApiClientOptions): ApiClient {
  const base = options.baseUrl.replace(/\/+$/, "");
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const doFetch = options.fetch ?? fetch;

  /** Sends one request; returns the parsed JSON body, or undefined for an empty answer. */
  async function send(method: Method, path: string, body?: unknown): Promise<unknown> {
    const extra = (await options.headers?.()) ?? {};
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
    let response: Response;
    try {
      response = await doFetch(`${base}${path}`, {
        method,
        headers: {
          accept: "application/json",
          [CLIENT_HEADER.name]: CLIENT_HEADER.value,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          ...extra,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        // The session travels in the header above; the platform's own cookie jar stays out.
        credentials: "omit",
        signal: controller.signal,
      });
    } catch {
      throw new ApiError(controller.signal.aborted ? "timeout" : "offline");
    } finally {
      clearTimeout(timer);
    }
    if (response.status === 204) {
      if (response.ok) return undefined;
    }
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new ApiError("invalid", response.status);
    }
    if (!response.ok) {
      const problem = problemSchema.safeParse(json);
      throw new ApiError(
        problem.success ? "problem" : "invalid",
        response.status,
        problem.success ? problem.data : null,
      );
    }
    return json;
  }

  function parse<T>(schema: Schema<T>, json: unknown, status: number | null = 200): T {
    const parsed = schema.safeParse(json);
    if (!parsed.success) throw new ApiError("invalid", status);
    return parsed.data;
  }

  return {
    get: async (path, schema) => parse(schema, await send("GET", path)),
    post: async (path, schema, body) => parse(schema, await send("POST", path, body ?? {})),
    postNoContent: async (path, body) => {
      await send("POST", path, body);
    },
    patch: async (path, body) => {
      await send("PATCH", path, body);
    },
    delete: async (path) => {
      await send("DELETE", path);
    },
    deleteWith: async (path, schema) => parse(schema, await send("DELETE", path)),
  };
}
