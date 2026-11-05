// Makes Sign in with Apple's client secret (P-79): a JWT signed with your Apple key (ES256),
// valid for at most six months, as Apple requires. Nothing is sent anywhere; the key file is
// read and the secret printed for GARNET_APPLE_CLIENT_SECRET in apps/api/.env. Never commit
// the key or the secret.
//
//   node scripts/apple-client-secret.mjs --team TEAMID --key-id KEYID \
//     --client app.garnet.signin --key path/to/AuthKey_KEYID.p8 [--days 180]
import { Buffer } from "node:buffer";
import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const fail = (line) => {
  process.stderr.write(`${line}\n`);
  process.exit(1);
};

const team = arg("team");
const keyId = arg("key-id");
const client = arg("client");
const keyPath = arg("key");
const days = Number(arg("days") ?? "180");
if (!team || !keyId || !client || !keyPath)
  fail("Usage: --team TEAMID --key-id KEYID --client SERVICES_ID --key AuthKey.p8 [--days 180]");
if (!Number.isInteger(days) || days < 1 || days > 180) fail("--days must be 1 to 180.");

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const now = Math.floor(Date.now() / 1000);
const header = b64({ alg: "ES256", kid: keyId, typ: "JWT" });
const payload = b64({
  iss: team,
  iat: now,
  exp: now + days * 24 * 60 * 60,
  aud: "https://appleid.apple.com",
  sub: client,
});
const key = createPrivateKey(readFileSync(keyPath, "utf8"));
// JWTs carry the raw r||s form of the ECDSA signature, not DER.
const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
  key,
  dsaEncoding: "ieee-p1363",
}).toString("base64url");
process.stdout.write(`${header}.${payload}.${signature}\n`);
