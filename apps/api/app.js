/**
 * Production entrypoint for LiteSpeed (lsnode.js) and Phusion Passenger.
 *
 * LiteSpeed loads this entrypoint synchronously via CommonJS require().
 * Under Node.js 20+, require() can load ESM modules ONLY if the module
 * graph has NO top-level await (ERR_REQUIRE_ASYNC_MODULE).
 *
 * Therefore, all asynchronous initialization is wrapped inside bootstrap().
 */
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";
import { URL } from "node:url";

function loadEnv() {
  const envPath = new URL("./.env", import.meta.url);
  if (!existsSync(envPath)) return;
  try {
    if (typeof process.loadEnvFile === "function") {
      process.loadEnvFile(envPath);
      return;
    }
  } catch {
    // Fall back to manual parsing if built-in loader fails or format has quotes
  }
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch (err) {
    process.stderr.write(`Notice: could not load .env file: ${String(err)}\n`);
  }
}

async function bootstrap() {
  try {
    // 0. Load environment variables from .env if present
    loadEnv();

    // 1. Auto-run database migrations on startup if database URL is configured
    const dbUrl =
      process.env.GARNET_DATABASE_OWNER_URL ||
      process.env.DATABASE_URL ||
      process.env.GARNET_API_DATABASE_URL;
    if (dbUrl && existsSync(new URL("./dist/migrate.mjs", import.meta.url))) {
      try {
        const savedArgv = process.argv;
        process.argv = [process.argv[0] || "node", "migrate.mjs", "migrate"];
        await import("./dist/migrate.mjs");
        process.argv = savedArgv;
      } catch (err) {
        process.stderr.write(`Notice: automatic startup migration notice: ${String(err)}\n`);
      }
    }

    // 2. Start API server
    if (existsSync(new URL("./dist/main.mjs", import.meta.url))) {
      await import("./dist/main.mjs");
    } else {
      await import("./src/main.ts");
    }
  } catch (fatal) {
    process.stderr.write(
      `Fatal error during API startup: ${String(fatal instanceof Error ? (fatal.stack ?? fatal.message) : fatal)}\n`,
    );
    process.exit(1);
  }
}

// Start without top-level await so require() in lsnode.js succeeds synchronously
void bootstrap();
