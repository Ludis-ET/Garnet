/**
 * Production entrypoint for cPanel / Phusion Passenger.
 * Automatically runs pending database migrations (if database URL is configured)
 * and loads the compiled production bundle from ./dist/main.mjs.
 */
import { existsSync } from "node:fs";
import process from "node:process";
import { URL } from "node:url";

// 1. Auto-run migrations on startup if database URL is configured
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
