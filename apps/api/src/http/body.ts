import type { Schema } from "@garnet/contracts";
import { ApiProblem } from "../errors/problem";

/**
 * Checks a request body against its contract. On failure: a validation_failed problem that
 * names where (paths) and why (zod codes), never echoing what was sent.
 */
export function parseBody<T>(schema: Schema<T>, body: unknown): T {
  const parsed = schema.safeParse(body ?? {});
  if (parsed.success) return parsed.data;
  throw new ApiProblem(
    "validation_failed",
    parsed.error.issues.map((i) => ({
      path: i.path.filter((p): p is string | number => typeof p !== "symbol"),
      code: i.code,
    })),
  );
}
