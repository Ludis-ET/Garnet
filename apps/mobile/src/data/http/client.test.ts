/**
 * The app's API client (P-76, B0): contract-checked answers, one error type, and no hanging.
 */
import { healthSchema, problemType } from "@garnet/contracts";
import { ApiError, createApiClient } from "./client";
import { parseApiAreas, parseApiUrl } from "./config";

function reply(status: number, body: unknown, contentType = "application/json"): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "content-type": contentType },
  });
}

async function failure(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("expected the request to fail");
}

describe("API client", () => {
  it("returns a checked answer and sends the session token when there is one", async () => {
    const calls: { url: string; init: RequestInit | undefined }[] = [];
    const client = createApiClient({
      baseUrl: "http://127.0.0.1:3000/",
      headers: () => Promise.resolve({ cookie: `garnet.session_token=${"t".repeat(43)}` }),
      fetch: (url, init) => {
        calls.push({
          url: typeof url === "string" ? url : url instanceof URL ? url.href : url.url,
          init,
        });
        return Promise.resolve(reply(200, { status: "ok", database: "ok" }));
      },
    });
    await expect(client.get("/v1/health", healthSchema)).resolves.toEqual({
      status: "ok",
      database: "ok",
    });
    expect(calls[0]?.url).toBe("http://127.0.0.1:3000/v1/health");
    expect(calls[0]?.init?.headers).toMatchObject({
      cookie: `garnet.session_token=${"t".repeat(43)}`,
    });
  });

  it("turns an RFC 9457 answer into a problem error", async () => {
    const problem = {
      type: problemType("unauthorized"),
      title: "Please sign in again.",
      status: 401,
      code: "unauthorized",
      instance: "abc",
    };
    const client = createApiClient({
      baseUrl: "http://x",
      fetch: () => Promise.resolve(reply(401, problem, "application/problem+json")),
    });
    const error = await failure(client.get("/v1/me", healthSchema));
    expect(error).toMatchObject({ kind: "problem", status: 401, problem });
  });

  it("refuses an answer that doesn't match the contract", async () => {
    const client = createApiClient({
      baseUrl: "http://x",
      fetch: () => Promise.resolve(reply(200, { status: "fine" })),
    });
    expect(await failure(client.get("/v1/health", healthSchema))).toMatchObject({
      kind: "invalid",
    });
    const html = createApiClient({
      baseUrl: "http://x",
      fetch: () => Promise.resolve(reply(502, "<html>bad gateway</html>", "text/html")),
    });
    expect(await failure(html.get("/v1/health", healthSchema))).toMatchObject({
      kind: "invalid",
      status: 502,
    });
  });

  it("says offline when there is no connection, and timeout when it hangs", async () => {
    const offline = createApiClient({
      baseUrl: "http://x",
      fetch: () => Promise.reject(new TypeError("Network request failed")),
    });
    expect(await failure(offline.get("/v1/health", healthSchema))).toMatchObject({
      kind: "offline",
    });
    const hanging = createApiClient({
      baseUrl: "http://x",
      timeoutMs: 20,
      fetch: (_, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new Error("aborted"));
          });
        }),
    });
    expect(await failure(hanging.get("/v1/health", healthSchema))).toMatchObject({
      kind: "timeout",
    });
  });
});

describe("API configuration", () => {
  it("accepts only http(s) URLs", () => {
    expect(parseApiUrl(undefined)).toBeNull();
    expect(parseApiUrl(" ")).toBeNull();
    expect(parseApiUrl("not a url")).toBeNull();
    expect(parseApiUrl("ftp://x")).toBeNull();
    expect(parseApiUrl("http://127.0.0.1:3000/")).toBe("http://127.0.0.1:3000");
  });

  it("switches on only known areas", () => {
    expect([...parseApiAreas("settings, auth,unknown")]).toEqual(["auth", "settings"]);
    expect(parseApiAreas(undefined).size).toBe(0);
  });
});
