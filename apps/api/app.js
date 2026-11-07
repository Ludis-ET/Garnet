/**
 * Production entrypoint for LiteSpeed (lsnode.js) and Phusion Passenger.
 *
 * LiteSpeed loads this entrypoint synchronously via CommonJS require().
 * Under Node.js 20+, require() can load ESM modules ONLY if the module
 * graph has NO top-level await (ERR_REQUIRE_ASYNC_MODULE).
 *
 * Therefore, all asynchronous initialization is wrapped inside bootstrap().
 */
import { existsSync } from "node:fs";
import process from "node:process";
import { URL } from "node:url";

async function bootstrap() {
  try {
    // 1. Auto-run database migrations on startup if database URL is configured
    const dbUrl = process.env.GARNET_DATABASE_OWNER_URL || process.env.DATABASE_URL;
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
