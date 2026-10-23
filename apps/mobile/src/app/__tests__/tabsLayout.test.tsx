/**
 * Regression guard (owner report 2026-10-23: "I can't scroll the home page"). The tab
 * containers must be one screen tall (flex: 1). expo-router's TabSlot grows with its content by
 * default, so a tab page becomes as tall as its content and its ScrollView never scrolls.
 */
import type * as ReactNative from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";
import type { ReactNode } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import { MockStore } from "@/data/mock/MockStore";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import { ThemeProvider } from "@/theme/ThemeProvider";
import TabsLayout from "../(tabs)/_layout";

jest.mock("expo-router", () => ({
  Redirect: () => null,
  usePathname: () => "/home",
}));
// Stand-ins that keep the props the layout passes, so the test can read them.
jest.mock("expo-router/ui", () => {
  const { View: RNView } = jest.requireActual<typeof ReactNative>("react-native");
  const pass =
    (testID: string) =>
    ({ children, ...props }: ViewProps & { children?: ReactNode; asChild?: boolean }) => (
      <RNView testID={testID} {...props}>
        {children}
      </RNView>
    );
  return {
    Tabs: pass("tabs"),
    TabSlot: pass("tab-slot"),
    TabList: pass("tab-list"),
    TabTrigger: pass("tab-trigger"),
  };
});

function setUpStore() {
  const store = new MockStore({ latencyMs: 0 });
  store.update((s) => ({
    ...s,
    auth: { ...s.auth, status: { kind: "signedIn", userId: DEMO_ME_ID, keepSignedIn: true } },
    pairing: { ...s.pairing, byUser: { [DEMO_ME_ID]: { ...EMPTY_PAIRING, partnerName: "Noah" } } },
    profiles: {
      ...s.profiles,
      byUser: { [DEMO_ME_ID]: { ...newProfile("Selam"), complete: true } },
    },
  }));
  return store;
}

it("keeps the tab containers one screen tall so pages can scroll", async () => {
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 667 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <QueryClientProvider client={new QueryClient()}>
        <RepositoryProvider store={setUpStore()}>
          <ThemeProvider>
            <View style={{ flex: 1 }}>
              <TabsLayout />
            </View>
          </ThemeProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  for (const id of ["tabs", "tab-slot"]) {
    const style = StyleSheet.flatten((await screen.findByTestId(id)).props.style) as Record<
      string,
      unknown
    >;
    expect({ id, flex: style.flex }).toEqual({ id, flex: 1 });
  }
});
