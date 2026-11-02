import type { ZodType } from "zod";
export { healthSchema, type Health } from "./health";
export { meSchema, type Me } from "./me";
export {
  issueSchema,
  PROBLEM_CODES,
  PROBLEMS,
  problemSchema,
  problemType,
  type Problem,
  type ProblemCode,
} from "./problem";

/** A contract schema for values of type T (so callers need no direct zod import). */
export type Schema<T> = ZodType<T>;
