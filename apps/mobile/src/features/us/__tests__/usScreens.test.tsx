/**
 * US-01 to US-10 per docs/design/prompts/07 (P-56): signals carry what the sender chose and say
 * "Sent" only (never seen or delivered, §5); the partner's support signal is pinned until
 * answered; history has no counts and says who can see it (retention U-09 open).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "@/components/ui/Toast";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import type { DemoSignalEvent } from "@/data/fixtures/demoHome";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import { MockStore } from "@/data/mock/MockStore";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { HistoryScreen } from "../HistoryScreen";
import { UsScreen } from "../UsScreen";

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};
jest.mock("expo-router", () => ({
  // A getter: the factory runs before `mockRouter` is initialised.
  get router() {
    return mockRouter;
  },
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  usePathname: () => "/us",
}));

const metrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};
const WAIT = { timeout: 8000 };
jest.setTimeout(30_000);

function usStore(incoming: DemoSignalEvent[] = []) {
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
      partner: { ...s.profiles.partner, side: "sapphire" },
    },
    home: { ...s.home, incoming: [...s.home.incoming, ...incoming] },
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

const METRICS = /seen|delivered|read at|\d+ (times|signals)|streak|score/i;

describe("US-01 to US-04 Us", () => {
  it("sends I Need You with the chosen need, then says Sent and nothing more", async () => {
    const store = await renderWith(<UsScreen />, usStore());
    await fireEvent.press(await screen.findByRole("button", { name: "I Need You" }, WAIT));
    await fireEvent.press(await screen.findByRole("radio", { name: "I'm overwhelmed" }, WAIT));
    await fireEvent.changeText(screen.getByLabelText("A few words"), "Long day");
    await fireEvent.press(screen.getByRole("button", { name: "Send to Noah" }));
    expect(await screen.findByText("Sent 🫂", {}, WAIT)).toBeTruthy();
    expect(store.read().home.sent.at(-1)).toMatchObject({
      signal: "need-you",
      payload: { need: "overwhelmed", note: "Long day" },
    });
    expect(screen.queryByText(METRICS)).toBeNull();
  });

  it("shows check-in times in Noah's own zone (P-56)", async () => {
    await renderWith(<UsScreen />, usStore());
    await fireEvent.press(await screen.findByRole("button", { name: "Please Check On Me" }, WAIT));
    expect(
      await screen.findByRole("radio", { name: /^Tonight, around \d\d:\d\d for Noah$/ }, WAIT),
    ).toBeTruthy();
    expect(
      screen.getByText("Garnet will remind Noah gently, respecting quiet hours."),
    ).toBeTruthy();
  });
});

describe("How far apart on the hero (P-66)", () => {
  const Location = jest.requireMock<{
    requestForegroundPermissionsAsync: jest.Mock;
    getCurrentPositionAsync: jest.Mock;
  }>("expo-location");
  afterEach(() => {
    Location.requestForegroundPermissionsAsync.mockImplementation(() =>
      Promise.resolve({ status: "denied" }),
    );
  });

  it("uses the phone's location, keeping only a rounded point, and shows the kilometres", async () => {
    Location.requestForegroundPermissionsAsync.mockImplementation(() =>
      Promise.resolve({ status: "granted" }),
    );
    Location.getCurrentPositionAsync.mockImplementation(() =>
      Promise.resolve({ coords: { latitude: 9.03456, longitude: 38.74321 } }),
    );
    const store = await renderWith(<UsScreen />, usStore());
    expect(
      await screen.findByLabelText(/ 5,9\d0 kilometres apart, about 8 h by plane\.$/, {}, WAIT),
    ).toBeTruthy();
    expect(store.read().settings.locations[DEMO_ME_ID]).toMatchObject({ lat: 9, lon: 38.7 });
    // Distance, not a score: no streaks, counts or comparisons alongside it.
    expect(screen.queryByText(METRICS)).toBeNull();
  });

  it('falls back to time zones ("about") when location is refused, never asking for a place', async () => {
    await renderWith(<UsScreen />, usStore());
    expect(await screen.findByLabelText(/About 5,[89]\d0 kilometres apart/, {}, WAIT)).toBeTruthy();
    expect(screen.queryByText(/choose my city/i)).toBeNull();
  });

  it("shows nothing and forgets the location when this person turns distance off", async () => {
    const store = usStore();
    store.update((s) => ({
      ...s,
      settings: {
        ...s.settings,
        byUser: { [DEMO_ME_ID]: { location: { share: false } } },
        locations: { ...s.settings.locations, [DEMO_ME_ID]: { lat: 9, lon: 38.7, at: "x" } },
      },
    }));
    await renderWith(<UsScreen />, store);
    await waitFor(() => {
      expect(store.read().settings.locations[DEMO_ME_ID]).toBeNull();
    }, WAIT);
    expect(screen.queryByLabelText(/kilometres apart/)).toBeNull();
  });

  it("uses nothing of the partner's before the two of you are paired", async () => {
    const store = usStore();
    store.update((s) => ({
      ...s,
      pairing: { ...s.pairing, byUser: { [DEMO_ME_ID]: EMPTY_PAIRING } },
    }));
    await renderWith(<UsScreen />, store);
    await screen.findByRole("button", { name: "I Need You" }, WAIT);
    expect(screen.queryByLabelText(/kilometres apart/)).toBeNull();
  });
});

describe("US-05 support from Noah", () => {
  it("pins Noah's support signal until answered, then records the reply", async () => {
    const store = await renderWith(
      <UsScreen />,
      usStore([
        {
          id: "i-open",
          signal: "need-you",
          at: null,
          minutesAgo: 4,
          payload: { need: "overwhelmed", note: "Rough meeting" },
        },
      ]),
    );
    // In the pinned card (and again in Recent).
    expect(
      (await screen.findAllByText('Noah: "I\'m overwhelmed"', {}, WAIT)).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("“Rough meeting”")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /call/i })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "I'm here" }));
    expect(await screen.findByText("You let Noah know you're here.", {}, WAIT)).toBeTruthy();
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "I'm here" })).toBeNull();
    }, WAIT);
    expect(store.read().home.incoming.find((e) => e.id === "i-open")?.responses).toEqual(["here"]);
  });
});

describe("US-10 history", () => {
  // The demo signals are minutes old, so just after midnight in Addis Ababa the newest one is
  // "Yesterday". A fixed midday clock (still running) keeps "Today" true at any hour.
  beforeEach(() => {
    jest.useFakeTimers({ now: Date.parse("2026-10-21T09:00:00Z"), advanceTimers: true });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("lists signals by day with no totals, and says who can see them", async () => {
    await renderWith(<HistoryScreen />, usStore());
    expect(await screen.findByText("Today", {}, WAIT)).toBeTruthy();
    expect(
      screen.getAllByText(/^You sent a thought$|^A little thought from Noah/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Only the two of you can see this.")).toBeTruthy();
    expect(screen.queryByText(METRICS)).toBeNull();
  });
});
