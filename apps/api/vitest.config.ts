import { defineConfig } from "vitest/config";

// NestJS uses TypeScript's legacy decorators. Said here explicitly (not left to tsconfig
// discovery) so tests compile the same way from any folder, including mutation-check copies.
export default defineConfig({
  oxc: { decorator: { legacy: true } },
  // Each test API migrates a fresh database and signs real people in (Argon2id), which takes a
  // few seconds; tests that start their own need more than vitest's 5 s default.
  test: { testTimeout: 30_000, hookTimeout: 60_000 },
});
