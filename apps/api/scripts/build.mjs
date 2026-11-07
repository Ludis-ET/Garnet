import { build } from "esbuild";
import { cpSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
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
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  external: ["@nestjs/*", "fastify", "pg", "rxjs", "reflect-metadata"],
});

// 2. Bundle database migration CLI
await build({
  entryPoints: [resolve(repoRoot, "packages/db/src/cli.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: resolve(distDir, "migrate.mjs"),
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);",
  },
  external: ["pg"],
});

// 3. Copy SQL migrations into dist/migrations
const migrationsSource = resolve(repoRoot, "packages/db/migrations");
const migrationsDest = resolve(distDir, "migrations");
if (existsSync(migrationsSource)) {
  cpSync(migrationsSource, migrationsDest, { recursive: true });
}

// 4. Generate clean standalone production package.json for cPanel (no workspace:*, no catalog:, no devDependencies)
const prodPkg = {
  name: "garnet-api",
  version: "1.0.0",
  private: true,
  type: "module",
  scripts: {
    start: "node app.js",
  },
  dependencies: {
    "@nestjs/common": "12.2.0",
    "@nestjs/core": "12.2.0",
    "@nestjs/platform-fastify": "12.2.0",
    fastify: "5.12.7",
    pg: "8.23.1",
    "reflect-metadata": "0.2.2",
    rxjs: "7.8.2",
  },
};
writeFileSync(resolve(distDir, "package.json"), JSON.stringify(prodPkg, null, 2) + "\n");

process.stdout.write("✅ API and migration runner built into apps/api/dist\n");
