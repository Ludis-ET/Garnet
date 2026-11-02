import { defineConfig } from "vitest/config";

// NestJS uses TypeScript's legacy decorators. Said here explicitly (not left to tsconfig
// discovery) so tests compile the same way from any folder, including mutation-check copies.
export default defineConfig({
  oxc: { decorator: { legacy: true } },
});
