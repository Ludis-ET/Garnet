import { build } from "esbuild";
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, "..");
const repoRoot = resolve(apiRoot, "../..");
const distDir = resolve(apiRoot, "dist");

mkdirSync(distDir, { recursive: true });

process.stdout.write("🔨 Building @garnet/api for production...\n");

// 1. Bundle NestJS / Fastify API entrypoint
await build({
  entryPoints: [resolve(apiRoot, "src/main.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: resolve(distDir, "main.mjs"),
  external: [
    "@nestjs/*",
    "better-auth",
    "@better-auth/expo",
    "fastify",
    "kysely",
    "pg",
    "nodemailer",
    "@aws-sdk/*",
    "temporal-polyfill",
    "zod",
    "rxjs",
    "reflect-metadata",
  ],
});

// 2. Bundle database migration CLI
await build({
  entryPoints: [resolve(repoRoot, "packages/db/src/cli.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: resolve(distDir, "migrate.mjs"),
  external: ["pg"],
});

// 3. Copy SQL migrations into dist/migrations
const migrationsSource = resolve(repoRoot, "packages/db/migrations");
const migrationsDest = resolve(distDir, "migrations");
if (existsSync(migrationsSource)) {
  cpSync(migrationsSource, migrationsDest, { recursive: true });
}

process.stdout.write("✅ API and migration runner built into apps/api/dist\n");
