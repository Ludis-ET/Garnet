#!/usr/bin/env node
/**
 * Automated Secrets Scanner (B-120, §5).
 * Scans all git-tracked files for committed secrets, credentials, tokens, and private keys.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const say = (line) => process.stdout.write(`${line}\n`);
const fail = (line) => process.stderr.write(`${line}\n`);

// High-confidence secret patterns
const SECRET_PATTERNS = [
  {
    name: "Private Key",
    regex: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: "AWS Access Key",
    regex: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    name: "GitHub Token",
    regex: /\b(ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{82})\b/,
  },
  {
    name: "Slack Webhook",
    regex: /https:\/\/hooks\.slack\.com\/services\/T[0-9a-zA-Z_]+\/B[0-9a-zA-Z_]+\/[0-9a-zA-Z_]+/,
  },
  {
    name: "Production Database Password URL",
    // Catches postgres://user:password@host where host is not localhost/127.0.0.1 or example.(com|test|org)
    regex:
      /postgres(?:ql)?:\/\/[a-zA-Z0-9_-]+:[^@\s/]+@(?!localhost\b|127\.0\.0\.1\b|[^@\s/]*example\.(?:com|org|test)\b)[a-zA-Z0-9.-]+/,
  },
  {
    name: "Hardcoded API Key / Secret Token",
    regex: /(?:secret|api_key|apikey|bearer)\s*[:=]\s*["']([0-9a-zA-Z_-]{32,})["']/i,
    // Filter out obvious test/mock hashes or test-secrets
    allow: (match) => {
      const val = match[1]?.toLowerCase() ?? "";
      return (
        val.includes("test") ||
        val.includes("example") ||
        val.includes("0000") ||
        val.includes("abcdef") ||
        val.includes("0123456789")
      );
    },
  },
];

// Files or extensions excluded from secret scanning
const IGNORED_PATHS = [
  /\.env\.example$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.webp$/,
  /\.gif$/,
  /\.ico$/,
  /\.svg$/,
  /\.pdf$/,
  /\.woff2?$/,
  /\.ttf$/,
  /pnpm-lock\.yaml$/,
  /scripts\/scan-secrets\.mjs$/, // ignore self
];

function getTrackedFiles() {
  const output = execSync("git ls-files", { encoding: "utf-8" });
  return output
    .split("\n")
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
}

function scan() {
  say("=== Garnet Repository Secrets Scanner (B-120) ===");
  const trackedFiles = getTrackedFiles();
  say(`Scanning ${trackedFiles.length} tracked files...`);

  let totalFindings = 0;

  for (const filePath of trackedFiles) {
    if (IGNORED_PATHS.some((pattern) => pattern.test(filePath))) {
      continue;
    }

    let content;
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {
      continue; // Binary or unreadable
    }

    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of SECRET_PATTERNS) {
        const match = pattern.regex.exec(line);
        if (match) {
          if (pattern.allow && pattern.allow(match)) {
            continue;
          }
          fail(`[!] LEAK DETECTED: ${pattern.name} in ${filePath}:${i + 1}`);
          fail(`    Line: ${line.trim().slice(0, 80)}...`);
          totalFindings++;
        }
      }
    }
  }

  if (totalFindings === 0) {
    say("✓ Scan complete: 0 secrets or credentials found. Repository is clean.");
    process.exit(0);
  } else {
    fail(`\nFAILED: Found ${totalFindings} potential secret leaks!`);
    process.exit(1);
  }
}

scan();
