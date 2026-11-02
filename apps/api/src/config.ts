import { z } from "zod";

/**
 * The API's settings, from the environment, checked once at start-up. A bad or missing value
 * stops the process with the variable's name only (never its value: it may hold a password).
 */
const schema = z.object({
  /** The API's own login role (not the owner): RLS always applies to it (AGENTS.md §6). */
  GARNET_API_DATABASE_URL: z.string().min(1),
  GARNET_API_HOST: z.string().min(1).default("127.0.0.1"),
  GARNET_API_PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  GARNET_API_LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "silent"])
    .default("info"),
});

export interface ApiConfig {
  databaseUrl: string;
  host: string;
  port: number;
  logLevel: z.infer<typeof schema>["GARNET_API_LOG_LEVEL"];
}

export function readConfig(env: Readonly<Record<string, string | undefined>>): ApiConfig {
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((i) => i.path.join(".")))].join(", ");
    throw new Error(`Invalid or missing configuration: ${names}`);
  }
  const c = parsed.data;
  return {
    databaseUrl: c.GARNET_API_DATABASE_URL,
    host: c.GARNET_API_HOST,
    port: c.GARNET_API_PORT,
    logLevel: c.GARNET_API_LOG_LEVEL,
  };
}
