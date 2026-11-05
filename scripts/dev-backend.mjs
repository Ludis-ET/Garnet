#!/usr/bin/env node
// Starts Garnet's local backend (P-76, B0 and B1): Docker (Postgres and Mailpit), the API's .env,
// migrations, and the API itself in its own window, then waits until it answers. Local only:
// everything listens on 127.0.0.1 and nothing is deployed. Used by apps/run-mobile.bat.
//
//   pnpm backend          or     node scripts/dev-backend.mjs
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const win = process.platform === "win32";
const say = (line) => process.stdout.write(`${line}\n`);
const fail = (line) => {
  process.stderr.write(`\n${line}\n`);
  process.exit(1);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const API = "http://127.0.0.1:3000";
// The same local-only password docker-compose.yml uses (GARNET_DB_OWNER_PASSWORD overrides both).
const ownerPassword = encodeURIComponent(
  process.env.GARNET_DB_OWNER_PASSWORD ?? "garnet-owner-local",
);
const OWNER_URL = `postgres://garnet_owner:${ownerPassword}@127.0.0.1:55432/garnet`;
const COMPOSE = ["compose", "-f", join(root, "infra", "docker-compose.yml")];

// Windows needs the shell to find pnpm.cmd and docker; it gets one quoted command line (every
// argument here is a fixed string or a path from this repository, never user input).
function exec(cmd, args, options) {
  if (!win) return spawnSync(cmd, args, { cwd: root, ...options });
  const line = [cmd, ...args].map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" ");
  return spawnSync(line, { cwd: root, shell: true, ...options });
}

const run = (cmd, args, options = {}) => exec(cmd, args, { stdio: "inherit", ...options });
const quiet = (cmd, args) => exec(cmd, args, { stdio: "ignore" }).status === 0;

async function healthy() {
  try {
    const res = await fetch(`${API}/v1/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

// 1. Docker: start Docker Desktop when it isn't running (Windows), and wait for it.
if (!quiet("docker", ["--version"]))
  fail("Docker isn't installed. Install Docker Desktop, then run this again.");
if (!quiet("docker", ["info"])) {
  if (win) {
    const desktop = join(
      process.env.ProgramFiles ?? "C:\\Program Files",
      "Docker",
      "Docker",
      "Docker Desktop.exe",
    );
    if (!existsSync(desktop))
      fail("Docker isn't running. Start Docker Desktop, then run this again.");
    say("Starting Docker Desktop...");
    spawn(desktop, [], { detached: true, stdio: "ignore" }).unref();
  } else {
    say("Waiting for Docker to start...");
  }
  let ready = false;
  for (let i = 0; i < 90 && !ready; i++) {
    await sleep(2000);
    ready = quiet("docker", ["info"]);
  }
  if (!ready)
    fail("Docker didn't start within 3 minutes. Start Docker Desktop, then run this again.");
}
say("Docker is running.");

// 2. Postgres and Mailpit (bound to 127.0.0.1 only).
if (run("docker", [...COMPOSE, "up", "-d", "--wait"]).status !== 0)
  fail("Couldn't start the local database and mailbox (docker compose).");

// 3. The API's local settings (git-ignored), with a fresh secret on first run.
if (run("node", [join(root, "apps", "api", "scripts", "init-env.mjs")]).status !== 0)
  fail("Couldn't create apps/api/.env.");

// 4. Migrations.
const migrate = run("pnpm", ["--filter", "@garnet/db", "migrate"], {
  env: { ...process.env, GARNET_DATABASE_OWNER_URL: OWNER_URL },
});
if (migrate.status !== 0) fail("Migrations failed. Read the messages above.");

// 5. The API, in its own window (close that window to stop it), unless it already answers.
if (await healthy()) {
  say("The API is already running.");
} else {
  say("Starting the API...");
  if (win) {
    spawn('start "Garnet API" cmd /k pnpm --filter @garnet/api dev', {
      cwd: root,
      shell: true,
      detached: true,
      stdio: "ignore",
    }).unref();
  } else {
    spawn("pnpm", ["--filter", "@garnet/api", "dev"], {
      cwd: root,
      detached: true,
      stdio: "ignore",
    }).unref();
  }
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    await sleep(1000);
    up = await healthy();
  }
  if (!up) fail("The API didn't answer within a minute. Read its window for the reason.");
}

say("");
say("  Garnet backend is running on this PC");
say(`  API      ${API}`);
say("  Mailbox  http://127.0.0.1:8025   (every account email lands here)");
say("  Test people: GARNET_SEED_PASSWORD='a local password' pnpm --filter @garnet/api seed");
say("");
