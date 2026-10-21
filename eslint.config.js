// @ts-check
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.cache/**",
      "**/.expo/**",
      "**/expo-env.d.ts",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      // Privacy guard: never log through console in shared code. Use an injected, redacting logger.
      "no-console": "error",
    },
  },
  {
    // React rules for the mobile app (hooks correctness and the React Compiler-ready rule set).
    files: ["apps/mobile/**/*.tsx", "apps/mobile/**/*.ts"],
    extends: [reactHooks.configs.flat["recommended-latest"]],
  },
  {
    // react-native-svg's types merge a deprecated `x`/`y` transform shorthand into every
    // element, so `<Rect x y>` (the rectangle's real position attributes) is falsely flagged.
    files: ["apps/mobile/src/features/figures/art/**/*.tsx"],
    rules: { "@typescript-eslint/no-deprecated": "off" },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    // Node scripts (mutation checks, spike runners).
    files: ["**/*.mjs"],
    languageOptions: { globals: { process: "readonly" } },
  },
  {
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    // Jest setup runs as CommonJS with Jest globals.
    files: ["apps/mobile/jest.setup.js"],
    languageOptions: { globals: { jest: "readonly", require: "readonly" } },
  },
  {
    // Interactive UI preview files (browser globals and inter-script variables)
    files: ["ui/**/*.js"],
    languageOptions: {
      globals: {
        document: "readonly",
        window: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        GARNET_DATA: "writable",
        GARNET_SCREENS: "writable",
      },
    },
    rules: {
      "no-unused-vars": "off",
    },
  },
);
