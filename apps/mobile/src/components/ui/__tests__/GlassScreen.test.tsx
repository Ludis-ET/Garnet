/**
 * Regression guard (owner report 2026-10-23: "I can't scroll the home page"). Inside a
 * ScrollView the content must grow, never shrink: `flex: 1` (basis 0, shrink 1) squeezes the
 * content into one screen on web, so long pages can't scroll. Every screen uses GlassScreen.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet, Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MockStore } from "@/data/mock/MockStore";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { GlassScreen } from "../GlassScreen";

const metrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

function flat(id: string) {
  return StyleSheet.flatten(screen.getByTestId(id).props.style) as Record<string, unknown>;
}

describe("GlassScreen scrolling", () => {
  it.each([false, true])("lets long content scroll (tab bar: %s)", async (tabBar) => {
    await render(
      <SafeAreaProvider initialMetrics={metrics}>
        <QueryClientProvider client={new QueryClient()}>
          <RepositoryProvider store={new MockStore({ latencyMs: 0 })}>
            <ThemeProvider>
              <GlassScreen tabBar={tabBar}>
                <Text>Long page</Text>
              </GlassScreen>
            </ThemeProvider>
          </RepositoryProvider>
        </QueryClientProvider>
      </SafeAreaProvider>,
    );
    const container = StyleSheet.flatten(
      screen.getByTestId("glass-screen-scroll").props.contentContainerStyle,
    ) as Record<string, unknown>;
    expect(container.flexGrow).toBe(1);
    for (const id of ["glass-screen-column", "glass-screen-body"]) {
      const style = flat(id);
      expect(style.flexGrow).toBe(1);
      expect(style.flex).toBeUndefined();
      expect(style.flexShrink ?? 0).toBe(0);
      expect(style.height).toBeUndefined();
      expect(style.overflow).not.toBe("hidden");
    }
  });
});
