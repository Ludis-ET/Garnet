/**
 * Production entrypoint for cPanel / Phusion Passenger.
 * Loads the compiled production bundle from ./dist/main.mjs.
 */
import { existsSync } from "node:fs";
import { URL } from "node:url";

if (existsSync(new URL("./dist/main.mjs", import.meta.url))) {
  await import("./dist/main.mjs");
} else {
  await import("./src/main.ts");
}
