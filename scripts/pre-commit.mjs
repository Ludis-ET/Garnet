import { execSync } from "node:child_process";

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] });
  } catch (err) {
    const stdout = err.stdout ? err.stdout.toString() : "";
    const stderr = err.stderr ? err.stderr.toString() : "";
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    throw new Error(`Command failed: ${cmd}`, { cause: err });
  }
}

try {
  // 1. Get staged files
  const staged = run("git diff --cached --name-only --diff-filter=d")
    .trim()
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  if (staged.length === 0) {
    process.exit(0);
  }

  const codeFiles = staged.filter((f) => /\.(ts|tsx|js|mjs|json|css|md|ya?ml)$/i.test(f));

  if (codeFiles.length === 0) {
    process.exit(0);
  }

  process.stdout.write(`🔍 Running pre-commit checks on ${codeFiles.length} staged file(s)...\n`);

  // 2. Prettier check on staged files
  process.stdout.write("  ↳ Checking format with Prettier...\n");
  const filesList = codeFiles.map((f) => `"${f}"`).join(" ");
  execSync(`npx prettier --check ${filesList}`, { stdio: "inherit" });

  // 3. ESLint on staged ts/tsx/js/mjs files
  const lintFiles = staged.filter((f) => /\.(ts|tsx|js|mjs)$/i.test(f));
  if (lintFiles.length > 0) {
    process.stdout.write(`  ↳ Linting ${lintFiles.length} script file(s) with ESLint...\n`);
    const lintList = lintFiles.map((f) => `"${f}"`).join(" ");
    execSync(`npx eslint ${lintList}`, { stdio: "inherit" });
  }

  // 4. Targeted Typecheck based on which workspaces were touched
  const touchedMobile = staged.some((f) => f.startsWith("apps/mobile/"));
  const touchedApi = staged.some((f) => f.startsWith("apps/api/"));
  const touchedContracts = staged.some((f) => f.startsWith("packages/contracts/"));
  const touchedDomain = staged.some((f) => f.startsWith("packages/domain/"));
  const touchedDb = staged.some((f) => f.startsWith("packages/db/"));

  if (touchedContracts) {
    process.stdout.write("  ↳ Typechecking @garnet/contracts...\n");
    execSync("pnpm --filter @garnet/contracts typecheck", { stdio: "inherit" });
  }
  if (touchedDomain) {
    process.stdout.write("  ↳ Typechecking @garnet/domain...\n");
    execSync("pnpm --filter @garnet/domain typecheck", { stdio: "inherit" });
  }
  if (touchedDb) {
    process.stdout.write("  ↳ Typechecking @garnet/db...\n");
    execSync("pnpm --filter @garnet/db typecheck", { stdio: "inherit" });
  }
  if (touchedApi) {
    process.stdout.write("  ↳ Typechecking @garnet/api...\n");
    execSync("pnpm --filter @garnet/api typecheck", { stdio: "inherit" });
  }
  if (touchedMobile) {
    process.stdout.write("  ↳ Typechecking @garnet/mobile...\n");
    execSync("pnpm --filter @garnet/mobile typecheck", { stdio: "inherit" });
  }

  process.stdout.write("✅ Pre-commit verification passed!\n");
} catch {
  process.stderr.write(
    `\n❌ Pre-commit check failed. Please resolve the errors above before committing.\n`,
  );
  process.exit(1);
}
