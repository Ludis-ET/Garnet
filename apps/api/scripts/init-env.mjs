// Creates apps/api/.env from .env.example on first run, with a fresh random GARNET_AUTH_SECRET.
// Never overwrites an existing .env. Local development only (the file is git-ignored).
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = join(root, ".env");
if (existsSync(target)) {
  process.stdout.write("apps/api/.env already exists; left as it is.\n");
} else {
  const secret = randomBytes(32).toString("base64url");
  const text = readFileSync(join(root, ".env.example"), "utf8").replace(
    /^GARNET_AUTH_SECRET=.*$/m,
    `GARNET_AUTH_SECRET=${secret}`,
  );
  writeFileSync(target, text, { mode: 0o600 });
  process.stdout.write("Created apps/api/.env with a new local secret.\n");
}
