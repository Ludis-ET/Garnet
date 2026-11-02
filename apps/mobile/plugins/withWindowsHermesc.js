// Windows build fix for the Android test APK (P-73). React Native's Gradle plugin runs the Hermes
// compiler through `cmd /c`, and cmd drops the quotes around a first argument that contains a
// space, so a checkout under "C:\Users\first last\..." fails at createBundleReleaseJsAndAssets.
// On Windows only, this copies hermesc to a folder without spaces and points the build at it.
// It changes nothing on macOS or Linux, and nothing in the app.
const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// garnet: windows-hermesc";

const GRADLE = `
${MARKER}
if (System.getProperty("os.name").toLowerCase().contains("windows")) {
    // The same lookup as the generated react {} block above.
    def compiler = new File(["node", "--print", "require.resolve('hermes-compiler/package.json', { paths: [require.resolve('react-native/package.json')] })"].execute(null, rootDir).text.trim()).getParentFile()
    def hermesc = new File(compiler, "hermesc/win64-bin/hermesc")
    if (hermesc.absolutePath.contains(" ") && hermesc.parentFile.exists()) {
        def temp = System.getenv("TEMP") ?: ""
        def base = temp && !temp.contains(" ") ? temp : (System.getenv("PUBLIC") ?: "C:\\\\Users\\\\Public")
        def safe = new File(base, "garnet-hermesc")
        copy { from hermesc.parentFile; into safe }
        react { hermesCommand = new File(safe, hermesc.name).absolutePath }
    }
}
`;

module.exports = function withWindowsHermesc(config) {
  return withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes(MARKER)) c.modResults.contents += GRADLE;
    return c;
  });
};
