// Runs spike F-07 end to end: start local S3 storage in Docker, run the suite, tear down.
// Usage: pnpm spike:media (from the repo root). Requires a running Docker daemon.
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { prepareLocalCredentials, removeLocalCredentials } from "./local-credentials.mjs";

const cwd = dirname(dirname(fileURLToPath(import.meta.url)));
const compose = ["compose", "-f", "compose.yaml", "-p", "garnet-f07"];
const shell = process.platform === "win32";

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell, env });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

if (run("docker", ["info", "--format", "{{.ServerVersion}}"]) !== 0) {
  process.stderr.write("F-07 BLOCKED: the Docker daemon is not reachable. Start Docker Desktop.\n");
  process.exit(2);
}

let status;
const credentials = prepareLocalCredentials(cwd);
try {
  if (run("docker", [...compose, "up", "-d"]) !== 0) throw new Error("docker compose up failed");
  // Outage scenarios wait on timeouts by design, so allow 60 s per test.
  status = run("pnpm", ["exec", "vitest", "run", "--reporter=verbose", "--testTimeout=60000"], {
    ...process.env,
    ...credentials,
  });
} finally {
  run("docker", [...compose, "down", "-v"]);
  removeLocalCredentials(cwd);
}
process.exit(status);
