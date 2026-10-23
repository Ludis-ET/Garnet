/**
 * HOME-01 to HOME-05 per docs/design/prompts/05 (P-53): signals send only on press-and-hold and
 * say "Sent" (never delivered or seen, §5); moments are private until shared (day-log rule 2)
 * and private ones say "Only you"; the waiting item has no content (A9); no streaks or scores.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import type * as ReactNative from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "@/components/ui/Toast";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import { MockStore } from "@/data/mock/MockStore";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { HomeScreen } from "../HomeScreen";

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  Redirect: ({ href }: { href: string }) => {
    const { Text: RNText } = jest.requireActual<typeof ReactNative>("react-native");
    return <RNText>{`redirect:${href}`}</RNText>;
  },
}));

const metrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};
const WAIT = { timeout: 8000 };
jest.setTimeout(30_000);

function homeStore() {
  const store = new MockStore({ latencyMs: 0 });
  store.update((s) => ({
    ...s,
    auth: { ...s.auth, status: { kind: "signedIn", userId: DEMO_ME_ID, keepSignedIn: true } },
    pairing: { ...s.pairing, byUser: { [DEMO_ME_ID]: { ...EMPTY_PAIRING, partnerName: "Noah" } } },
    profiles: {
      ...s.profiles,
      byUser: {
        [DEMO_ME_ID]: {
          ...newProfile("Selam"),
          side: "ruby",
          timeZone: "Africa/Addis_Ababa",
          complete: true,
        },
      },
    },
    // Fixed so the test doesn't depend on the hour it runs at.
    days: {
      ...s.days,
      entries: [
        {
          id: "a",
          authorId: DEMO_ME_ID,
          kind: "text",
          text: "Shared thing",
          emoji: "☕",
          dayOffset: 0,
          localTime: null,
          at: new Date(Date.now() - 60_000).toISOString(),
          visibility: "shared",
        },
        {
          id: "b",
          authorId: DEMO_ME_ID,
          kind: "text",
          text: "Private thing",
          emoji: "🍝",
          dayOffset: 0,
          localTime: null,
          at: new Date(Date.now() - 30_000).toISOString(),
          visibility: "private",
        },
      ],
    },
  }));
  return store;
}

async function renderWith(ui: ReactElement, store: MockStore) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={client}>
        <RepositoryProvider store={store}>
          <ThemeProvider>
            <ToastProvider>{ui}</ToastProvider>
          </ThemeProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  return store;
}

describe("HOME-01 Home", () => {
  it("greets, shows today's own moments, marks private ones, and the waiting item without content", async () => {
    await renderWith(<HomeScreen />, homeStore());
    expect(
      await screen.findByRole(
        "header",
        { name: /^(Good (morning|afternoon|evening)|Hi), Selam$/ },
        WAIT,
      ),
    ).toBeTruthy();
    expect(screen.getByText("Shared thing")).toBeTruthy();
    expect(screen.getByText("Private thing")).toBeTruthy();
    expect(screen.getAllByLabelText("Only you")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Something's waiting for you" })).toBeTruthy();
    expect(screen.queryByText(/Demo letter body|Open when you miss me/)).toBeNull();
    expect(screen.queryByText(/streak|days apart|score/i)).toBeNull();
  });
});

describe("HOME-04 Hold to send", () => {
  it("does nothing on a tap, and explains how to send", async () => {
    const store = await renderWith(<HomeScreen />, homeStore());
    const button = await screen.findByRole("button", { name: "I Thought of You, to Noah" }, WAIT);
    const before = store.read().home.sent.length;
    // A full tap: press in, the tap itself, press out. Nothing may send.
    await fireEvent(button, "pressIn");
    await fireEvent.press(button);
    await fireEvent(button, "pressOut");
    expect(await screen.findByText("Hold to send", {}, WAIT)).toBeTruthy();
    expect(store.read().home.sent).toHaveLength(before);
  });

  it("sends on a long press and says Sent, nothing more", async () => {
    const store = await renderWith(<HomeScreen />, homeStore());
    const button = await screen.findByRole("button", { name: "Missing You, to Noah" }, WAIT);
    const before = store.read().home.sent.length;
    await fireEvent(button, "pressIn");
    await fireEvent(button, "longPress");
    expect(await screen.findByText("Sent", {}, WAIT)).toBeTruthy();
    await screen.findByText("Missing", {}, WAIT);
    const sent = store.read().home.sent;
    expect(sent).toHaveLength(before + 1);
    expect(sent.at(-1)?.signal).toBe("missing-you");
    expect(screen.queryByText(/delivered|seen|read by/i)).toBeNull();
  });
});

describe("HOME-03 Log a moment", () => {
  it("keeps a moment private unless shared, and says which", async () => {
    const store = await renderWith(<HomeScreen />, homeStore());
    await fireEvent.press(await screen.findByRole("button", { name: "Log a moment" }, WAIT));
    await fireEvent.changeText(
      await screen.findByLabelText("A small moment", {}, WAIT),
      "Quiet walk",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Keep private" }));
    expect(await screen.findByText("Kept private.", {}, WAIT)).toBeTruthy();
    const saved = store.read().days.entries.find((m) => m.text === "Quiet walk");
    expect(saved?.visibility).toBe("private");
  });

  it("shares only on the explicit button", async () => {
    const store = await renderWith(<HomeScreen />, homeStore());
    await fireEvent.press(await screen.findByRole("button", { name: "Log a moment" }, WAIT));
    await fireEvent.changeText(await screen.findByLabelText("A small moment", {}, WAIT), "Sunset");
    await fireEvent.press(screen.getByRole("button", { name: "Share with Noah" }));
    expect(await screen.findByText("Shared with Noah.", {}, WAIT)).toBeTruthy();
    expect(store.read().days.entries.find((m) => m.text === "Sunset")?.visibility).toBe("shared");
  });
});

describe("HOME-02 Noah reaches out", () => {
  it("floats Noah's signal above the orb", async () => {
    const store = await renderWith(<HomeScreen />, homeStore());
    await screen.findByRole("button", { name: "Log a moment" }, WAIT);
    await act(() => {
      store.update((s) => ({
        ...s,
        home: {
          ...s.home,
          incoming: [{ id: "in-1", signal: "thought-of-you", at: new Date().toISOString() }],
        },
      }));
    });
    expect(await screen.findByText("Noah thought of you", {}, WAIT)).toBeTruthy();
  });
});

describe("HOME-05 Profile menu", () => {
  it("offers settings and sign out", async () => {
    await renderWith(<HomeScreen />, homeStore());
    await fireEvent.press(await screen.findByRole("button", { name: "Profile menu" }, WAIT));
    expect(await screen.findByRole("menuitem", { name: "Settings" }, WAIT)).toBeTruthy();
    await fireEvent.press(screen.getByRole("menuitem", { name: "Sign out" }));
    expect(await screen.findByRole("header", { name: "Sign out?" }, WAIT)).toBeTruthy();
  });
});
