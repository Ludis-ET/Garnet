import { readFileSync } from "node:fs";

/** One KEY=value line of a .env file, or null for blanks, comments and anything else. */
export function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) return null;
  const key = trimmed.slice(0, eq).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;
  let value = trimmed.slice(eq + 1).trim();
  const quote = value[0];
  if ((quote === '"' || quote === "'") && value.length >= 2 && value.endsWith(quote))
    value = value.slice(1, -1);
  return [key, value];
}

/** .env into process.env (Node 20.12+ has loadEnvFile; older 20.x reads it by hand). */
export function loadEnvFile(file: string): void {
  const builtIn = (process as { loadEnvFile?: (path: string) => void }).loadEnvFile;
  if (typeof builtIn === "function") {
    builtIn(file);
    return;
  }
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const pair = parseEnvLine(line);
    if (pair !== null) process.env[pair[0]] ??= pair[1];
  }
}
