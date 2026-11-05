// Jest runs without the native worklets runtime: use the official mocks (Reanimated 4 / Worklets).
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
require("react-native-reanimated").setUpTests();

// Owner-supplied character images are bundled by Metro's require.context, which Jest lacks.
// Tests run with none (the built-in drawings); artwork lookup is unit-tested separately.
jest.mock("./src/features/figures/art/artworkFiles", () => ({ artworkFiles: {} }));
jest.mock("./src/widgets/widgetArtFiles", () => ({ widgetArtFiles: {} }));
// The API's auth client (B1) only runs in builds pointed at an API. Jest runs on mock data, so
// these never load (better-auth ships ESM that Jest doesn't transform, and the keystore is native).
jest.mock("better-auth/react", () => ({ createAuthClient: () => ({}) }));
jest.mock("@better-auth/expo/client", () => ({ expoClient: () => ({}) }));
jest.mock("expo-secure-store", () => ({
  getItem: () => null,
  setItem: () => undefined,
  deleteItemAsync: () => Promise.resolve(),
}));
require("react-native-gesture-handler/jestSetup");

// The phone's location (P-66): no device in Jest. By default permission is refused, so the
// distance falls back to time zones; tests that need a position set one on this mock.
jest.mock("expo-location", () => ({
  PermissionStatus: { GRANTED: "granted", DENIED: "denied" },
  Accuracy: { Lowest: 1 },
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: "denied" })),
  getCurrentPositionAsync: jest.fn(() => Promise.reject(new Error("No location in tests"))),
}));
