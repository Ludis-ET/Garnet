// Generates a fresh, random, local-only S3 identity for each F-07 run, so no credentials are
// ever committed. The SeaweedFS config is written to .cache/ (git-ignored) and mounted by
// compose.yaml; the same keys are passed to the tests through environment variables.
import { randomBytes } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function prepareLocalCredentials(pkgDir) {
  const accessKey = `f07-${randomBytes(8).toString("hex")}`;
  const secretKey = randomBytes(24).toString("hex");
  const dir = join(pkgDir, ".cache", "s3-config");
  mkdirSync(dir, { recursive: true });
  const config = {
    identities: [
      {
        name: "garnet-f07-local-only",
        credentials: [{ accessKey, secretKey }],
        actions: ["Admin", "Read", "Write", "List", "Tagging"],
      },
    ],
  };
  writeFileSync(join(dir, "s3.json"), JSON.stringify(config));
  return {
    F07_S3_ENDPOINT: "http://127.0.0.1:18333",
    F07_S3_ACCESS_KEY: accessKey,
    F07_S3_SECRET_KEY: secretKey,
  };
}

export function removeLocalCredentials(pkgDir) {
  rmSync(join(pkgDir, ".cache", "s3-config"), { recursive: true, force: true });
}
