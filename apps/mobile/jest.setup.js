// Jest runs without the native worklets runtime: use the official mocks (Reanimated 4 / Worklets).
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
require("react-native-reanimated").setUpTests();

// Owner-supplied character images are bundled by Metro's require.context, which Jest lacks.
// Tests run with none (the built-in drawings); artwork lookup is unit-tested separately.
jest.mock("./src/features/figures/art/artworkFiles", () => ({ artworkFiles: {} }));
require("react-native-gesture-handler/jestSetup");
