// Builds the Android test APK locally (P-73): no cloud, nothing uploaded. Steps: make the widget
// images from the owner's pictures (if Python and Pillow are present), generate the git-ignored
// android/ project, and run a release build for arm64 phones against the local Android SDK,
// signed with the debug key (fine for the two partners' own phones, never for a store).
//
//   pnpm --filter @garnet/mobile apk              build
//   pnpm --filter @garnet/mobile apk -- --install build, then install on the phone over USB
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const android = join(root, "android");
const win = process.platform === "win32";
const say = (text) => process.stdout.write(`${text}\n`);

// Windows' 260-character path limit (long paths are off by default) breaks the native C++ build
// under a long checkout path: pnpm's folder names plus CMake's object folders run past it, and
// ninja loops "Re-running CMake". So on Windows, a long checkout is mirrored to a short folder
// (GARNET_BUILD_DIR, default C:\gb; never a folder this script didn't create) and built there.
const repo = resolve(root, "..", "..");
const spikes = (base) =>
  existsSync(join(base, "spikes"))
    ? readdirSync(join(base, "spikes")).map((d) => `spikes/${d}`)
    : [];
const MARK = ".garnet-build-copy";
if (win && process.env.GARNET_IN_SHORT !== "1" && repo.length > 24) {
  const short = process.env.GARNET_BUILD_DIR ?? "C:\\gb";
  if (existsSync(short) && !existsSync(join(short, MARK))) {
    process.stderr.write(`${short} exists and isn't a Garnet build copy. Set GARNET_BUILD_DIR.\n`);
    process.exit(1);
  }
  say(`Building from a short copy at ${short} (Windows path limit).`);
  // /MIR keeps the copy exact; the excluded folders are neither copied nor deleted.
  const copy = spawnSync(
    "robocopy",
    [repo, short, "/MIR", "/XD", "node_modules", "android", ".git", ".expo", ".cache", "dist"]
      .concat(["/XF", MARK, "/NFL", "/NDL", "/NJH", "/NP"])
      .map((a) => (a.includes(" ") ? `"${a}"` : a)),
    { stdio: "inherit", shell: true },
  );
  if (copy.status === null || copy.status >= 8) process.exit(copy.status ?? 1);
  writeFileSync(join(short, MARK), "Made by apps/mobile/scripts/build-android-apk.mjs\n");
  const step = (args) => {
    const r = spawnSync(args[0], args.slice(1), {
      cwd: short,
      stdio: "inherit",
      shell: true,
      env: { ...process.env, GARNET_IN_SHORT: "1" },
    });
    if (r.status !== 0) process.exit(r.status ?? 1);
  };
  // A flat (hoisted) node_modules in the copy only: pnpm's nested .pnpm/<name@version_hash>/
  // folders alone push CMake's prefab files past 260 characters. A copy installed the nested way
  // keeps links into .pnpm, so its node_modules folders are removed first.
  const modules = join(short, "node_modules", ".modules.yaml");
  if (existsSync(modules) && !readFileSync(modules, "utf8").includes("nodeLinker: hoisted")) {
    for (const dir of ["", "apps/mobile", "packages/domain", ...spikes(short)])
      rmSync(join(short, dir, "node_modules"), { recursive: true, force: true });
  }
  step([
    "pnpm",
    "install",
    "--frozen-lockfile",
    "--config.node-linker=hoisted",
    "--config.confirmModulesPurge=false",
  ]);
  step(["node", "apps/mobile/scripts/build-android-apk.mjs", ...process.argv.slice(2)]);
  process.exit(0);
}

function run(cmd, args, cwd, env = {}) {
  // Through the Windows shell, a path with a space (C:\Users\first last) must be quoted.
  const q = (a) => (win && a.includes(" ") ? `"${a}"` : a);
  const r = spawnSync(q(cmd), args.map(q), {
    cwd,
    stdio: "inherit",
    shell: win,
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) {
    process.stderr.write(`\n${cmd} ${args.join(" ")} failed (exit ${String(r.status)})\n`);
    process.exit(r.status ?? 1);
  }
}

// 1. Widget images (optional: without them the widgets show gem colours and words).
const py = spawnSync(win ? "python" : "python3", ["scripts/make-widget-art.py"], {
  cwd: root,
  stdio: "inherit",
  shell: win,
});
if (py.status !== 0) say("Widget images skipped (needs Python 3 with Pillow).");

// 2. The native project. Prebuild rewrites the android/ios scripts in package.json; keep ours.
const pkgPath = join(root, "package.json");
const pkg = readFileSync(pkgPath, "utf8");
run("npx", ["expo", "prebuild", "--platform", "android", "--no-install"], root, { CI: "1" });
writeFileSync(pkgPath, pkg);

// 3. Where the Android SDK lives, passed to Gradle (android/ itself is never edited).
// On Windows the NDK's link flags break when the SDK path has a space (C:\Users\first last), so
// an SDK without one is preferred (for example C:\Android\sdk).
const sdks = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  ...(win
    ? ["C:\\Android\\sdk", join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk")]
    : [join(homedir(), "Library", "Android", "sdk"), join(homedir(), "Android", "Sdk")]),
].filter((d) => d !== undefined && d !== "" && existsSync(d));
const sdk = sdks.find((d) => !win || !d.includes(" ")) ?? sdks[0] ?? "";
if (win && sdk.includes(" "))
  say(`The Android SDK path has a space (${sdk}); native linking may fail. Use one without.`);
if (!existsSync(sdk)) {
  process.stderr.write(`No Android SDK at ${sdk}. Set ANDROID_HOME and try again.\n`);
  process.exit(1);
}

// React Native's Gradle plugins want a JDK 17 toolchain, which Gradle doesn't find on its own in
// every install folder (and its download can time out). Point it at any JDK 17 found here.
const jdkRoots = win
  ? ["Microsoft", "Eclipse Adoptium", "Java", "Zulu", "Amazon Corretto"].map((d) =>
      join(process.env.ProgramFiles ?? "C:\\Program Files", d),
    )
  : ["/usr/lib/jvm", "/Library/Java/JavaVirtualMachines"];
const jdk17 = jdkRoots
  .filter((d) => existsSync(d))
  .flatMap((d) => readdirSync(d).map((name) => join(d, name)))
  .find((p) => /(jdk|openjdk|temurin|zulu|corretto)[-_]?17/i.test(p));

// The Android SDK's default CMake 3.22 ships an old ninja that loops "manifest 'build.ninja'
// still dirty" on Windows. Use the newest CMake installed in the SDK (install 3.31 with
// sdkmanager "cmake;3.31.6"); Expo applies it to every native module (android.cmakeVersion).
const cmakeDir = join(sdk, "cmake");
const ver = (v) => v.split(".").map(Number);
const newer = (a, b) => {
  const [x, y] = [ver(a), ver(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++)
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
};
const cmake = existsSync(cmakeDir)
  ? readdirSync(cmakeDir)
      .filter((v) => /^\d+\.\d+\.\d+$/.test(v))
      .reduce((best, v) => (best === null || newer(v, best) ? v : best), null)
  : null;
if (win && (cmake === null || !newer(cmake, "3.30.0")))
  say('Tip: if ninja loops "Re-running CMake", install a newer CMake: sdkmanager "cmake;3.31.6".');

// 4. Release build, arm64 only (almost every phone from the last several years).
run(
  join(android, win ? "gradlew.bat" : "gradlew"),
  [
    "assembleRelease",
    "-PreactNativeArchitectures=arm64-v8a",
    ...(jdk17 === undefined ? [] : [`-Porg.gradle.java.installations.paths=${jdk17}`]),
    ...(cmake === null ? [] : [`-Pandroid.cmakeVersion=${cmake}`]),
    "--console=plain",
  ],
  android,
  { ANDROID_HOME: sdk },
);
const apk = join(android, "app", "build", "outputs", "apk", "release", "app-release.apk");
say(`\nAPK: ${apk}`);

if (process.argv.includes("--install")) run("adb", ["install", "-r", apk], root);
