/**
 * The space opens for both together (P-99): home waits until the partner has finished setup,
 * and every launch after that opens on the fusion, once.
 */
import type * as ReactNative from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import { MockStore } from "@/data/mock/MockStore";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import { markFusionPlayed, resetFusionForTest } from "@/features/pairing/fusionOnLaunch";
import { ThemeProvider } from "@/theme/ThemeProvider";
import EntryGate from "../index";

jest.mock("expo-router", () => {
  const { Text: RNText } = jest.requireActual<typeof ReactNative>("react-native");
  return {
    Redirect: ({ href }: { href: string }) => <RNText testID="redirect">{href}</RNText>,
    useRouter: () => ({ replace: jest.fn() }),
  };
});

const WAIT = { timeout: 4000 };

function store({ partnerReady }: { partnerReady: boolean }) {
  const s = new MockStore({ latencyMs: 0 });
  s.update((state) => ({
    ...state,
    auth: { ...state.auth, status: { kind: "signedIn", userId: DEMO_ME_ID, keepSignedIn: true } },
    pairing: {
      ...state.pairing,
      byUser: { [DEMO_ME_ID]: { ...EMPTY_PAIRING, partnerName: "Noah" } },
    },
    profiles: {
      ...state.profiles,
      byUser: { [DEMO_ME_ID]: { ...newProfile("Selam"), complete: true } },
      partner: { ...state.profiles.partner, name: "Noah", ready: partnerReady },
    },
  }));
  return s;
}

async function gateFor(s: MockStore): Promise<string> {
  await render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 375, height: 667 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <QueryClientProvider client={new QueryClient()}>
        <RepositoryProvider store={s}>
          <ThemeProvider>
            <EntryGate />
          </ThemeProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  const target = await screen.findByTestId("redirect", {}, WAIT);
  return String((target.props as { children: unknown }).children);
}

beforeEach(() => {
  resetFusionForTest();
});

describe("opening the space together (P-99)", () => {
  it("waits for the partner's setup before anything of the space opens", async () => {
    expect(await gateFor(store({ partnerReady: false }))).toBe("/waiting");
  });

  it("opens on the fusion once both have finished", async () => {
    expect(await gateFor(store({ partnerReady: true }))).toBe("/fusion");
  });

  it("goes straight home once the fusion has played in this launch", async () => {
    markFusionPlayed();
    expect(await gateFor(store({ partnerReady: true }))).toBe("/home");
  });
});
