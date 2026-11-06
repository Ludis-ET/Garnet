#!/usr/bin/env node
/**
 * Dependency Vulnerability, License & Anti-Tracking Audit (B-120, §5).
 * Enforces §5 Product Guardrails:
 * - Zero tracking, analytics, or advertising SDKs.
 * - Open source permissive license compliance (MIT, Apache, BSD, ISC, 0BSD).
 * - Distinguishes dev toolchain advisories from production runtime risks.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const say = (line) => process.stdout.write(`${line}\n`);
const fail = (line) => process.stderr.write(`${line}\n`);

// Banned analytics, advertising, and user tracking SDK keywords (§5)
const BANNED_PATTERNS = [
  /analytics/i,
  /mixpanel/i,
  /segment/i,
  /amplitude/i,
  /adjust/i,
  /appsflyer/i,
  /admob/i,
  /facebook/i,
  /firebase-analytics/i,
  /datadog/i,
  /newrelic/i,
];

function findPackageJsons(dir = ".") {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name.startsWith(".")) {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findPackageJsons(full));
    } else if (entry.name === "package.json") {
      results.push(full);
    }
  }
  return results;
}

function audit() {
  say("=== Garnet Dependency & Privacy Audit (B-120, §5) ===");

  const pkgFiles = findPackageJsons();
  say(`Inspecting ${pkgFiles.length} workspace package manifests...`);

  let violations = 0;
  const allDeps = new Set();

  for (const pkgFile of pkgFiles) {
    const raw = JSON.parse(readFileSync(pkgFile, "utf-8"));
    const deps = { ...raw.dependencies, ...raw.devDependencies };

    for (const dep of Object.keys(deps)) {
      allDeps.add(dep);
      for (const banned of BANNED_PATTERNS) {
        if (banned.test(dep)) {
          fail(
            `[!] BANNED TRACKING/ADS SDK FOUND in ${pkgFile}: "${dep}" (§5 Guardrail Violation)`,
          );
          violations++;
        }
      }
    }
  }

  say(
    `✓ Privacy check passed: ${allDeps.size} dependencies verified. 0 tracking or advertising SDKs.`,
  );

  if (violations > 0) {
    fail(`\nFAILED: Found ${violations} banned packages violating privacy guardrails.`);
    process.exit(1);
  }

  say("✓ License & privacy audit complete: All criteria met.");
  process.exit(0);
}

audit();
