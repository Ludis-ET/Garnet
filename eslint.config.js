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
    // NestJS modules, controllers and guards are classes defined by their decorators.
    files: ["apps/api/**/*.ts"],
    rules: { "@typescript-eslint/no-extraneous-class": ["error", { allowWithDecorator: true }] },
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
    // Node scripts (mutation checks, spike runners, the local backend launcher).
    files: ["**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        URL: "readonly",
        fetch: "readonly",
        AbortSignal: "readonly",
        setTimeout: "readonly",
      },
    },
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
    // Expo reads app.config.js, metro.config.js and local config plugins as Node CommonJS.
    files: ["apps/mobile/app.config.js", "apps/mobile/metro.config.js", "apps/mobile/plugins/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { require: "readonly", module: "writable", __dirname: "readonly" },
    },
  },
);
