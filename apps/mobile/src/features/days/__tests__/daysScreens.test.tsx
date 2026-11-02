/**
 * DAYS-01 to DAYS-06 per docs/design/prompts/06 (P-56): the partner's private drafts and
 * unrevealed moments never show anywhere (§4); new moments start "Only you" (day-log rule 2);
 * shared ones stay shared (P-20); waiting copy never says who hasn't finished (no blame). Uses
 * the PROVISIONAL day policy (U-02, U-06 open).
 */
import { sharedDayOf } from "@garnet/domain";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Temporal } from "temporal-polyfill";
import { ToastProvider } from "@/components/ui/Toast";
import { DEMO_ME_ID, DEMO_PARTNER_ID } from "@/data/fixtures/demo";
import type { DemoEntry } from "@/data/fixtures/demoDays";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import { MockStore } from "@/data/mock/MockStore";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import { PROVISIONAL_DAY_POLICY } from "@/domain/days";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { ComposeScreen } from "../ComposeScreen";
import { DaysScreen } from "../DaysScreen";
import { DayScreen } from "../DayScreen";
import { EntryScreen } from "../EntryScreen";

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
  usePathname: () => "/days",
}));

const metrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};
const WAIT = { timeout: 8000 };
jest.setTimeout(30_000);

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();

function entry(e: Partial<DemoEntry> & Pick<DemoEntry, "id" | "authorId" | "text">): DemoEntry {
  return {
    kind: "text",
    emoji: "✏️",
    dayOffset: 0,
    localTime: null,
    at: ago(5),
    visibility: "shared",
    ...e,
  };
}

/** Fixed entries a few minutes old, so the test never depends on the hour it runs at. */
function daysStore(entries: DemoEntry[]) {
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
    days: { entries, ready: { byOffset: {}, byDate: {} } },
  }));
  return store;
}

const ENTRIES = [
  entry({
    id: "m1",
    authorId: DEMO_ME_ID,
    text: "Coffee on the balcony",
    emoji: "☕",
    at: ago(30),
  }),
  entry({
    id: "m2",
    authorId: DEMO_ME_ID,
    text: "Just for me",
    visibility: "private",
    at: ago(20),
  }),
  entry({ id: "n1", authorId: DEMO_PARTNER_ID, text: "Secret draft", visibility: "private" }),
  entry({ id: "n2", authorId: DEMO_PARTNER_ID, text: "Hidden plant", visibility: "afterReveal" }),
];

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

const LEAKS = /Secret draft|Hidden plant/;

/** Today's shared day under the provisional policy (what the mock uses). */
const todayNow = () =>
  sharedDayOf(Temporal.Now.instant(), PROVISIONAL_DAY_POLICY.sharedDay).toString();

describe("DAYS-01 Days", () => {
  it("lists today with only the viewer's dot when the partner's moments aren't visible", async () => {
    await renderWith(<DaysScreen />, daysStore(ENTRIES));
    const today = await screen.findByRole("button", { name: /^Today\./ }, WAIT);
    expect(today.props.accessibilityLabel).toContain("Moments from Selam.");
    expect(today.props.accessibilityLabel).not.toContain("Noah");
    expect(screen.queryByText(LEAKS)).toBeNull();
    expect(screen.queryByText(/\d+ moments|streak|score/i)).toBeNull();
  });
});

describe("DAYS-02 to DAYS-04 a day", () => {
  it("shows my moments, marks private ones, and keeps the partner's day theirs", async () => {
    const store = daysStore(ENTRIES);
    await renderWith(<DayScreen date={todayNow()} />, store);
    expect(await screen.findByText("Coffee on the balcony", {}, WAIT)).toBeTruthy();
    expect(screen.getByText("Just for me")).toBeTruthy();
    expect(screen.getAllByLabelText("Only you")).toHaveLength(1);

    await fireEvent.press(screen.getByRole("radio", { name: "Noah" }));
    expect(await screen.findByText("Noah's day is still theirs for now.", {}, WAIT)).toBeTruthy();
    expect(screen.queryByText(LEAKS)).toBeNull();
  });

  it("finishes my day and then waits without saying who hasn't finished", async () => {
    const store = daysStore(ENTRIES);
    const today = todayNow();
    await renderWith(<DayScreen date={today} />, store);
    await fireEvent.press(await screen.findByRole("button", { name: "Finish my day" }, WAIT));
    const confirm = await screen.findAllByRole("button", { name: "Finish my day" }, WAIT);
    // The second one is the confirm button in the sheet.
    await fireEvent.press(confirm[confirm.length - 1]!);
    expect(
      await screen.findByText("Your days will meet when you're both ready.", {}, WAIT),
    ).toBeTruthy();
    expect(store.read().days.ready.byDate[today]).toEqual({ me: true, partner: false });
    expect(screen.queryByText(/hasn't finished|not finished|waiting for Noah/i)).toBeNull();
  });
});

describe("DAYS-05 a moment", () => {
  it("reads the same for a partner's private draft as for one that doesn't exist", async () => {
    await renderWith(<EntryScreen id="n1" />, daysStore(ENTRIES));
    expect(await screen.findByText("This item isn't available here.", {}, WAIT)).toBeTruthy();
    expect(screen.queryByText(LEAKS)).toBeNull();
  });
});

describe("DAYS-06 new moment", () => {
  beforeEach(() => {
    mockRouter.back.mockClear();
  });

  it("starts as Only you, asks for words or a picture, and saves privately", async () => {
    const store = await renderWith(<ComposeScreen />, daysStore(ENTRIES));
    const onlyYou = await screen.findByRole("radio", { name: "Only you" }, WAIT);
    expect(onlyYou.props.accessibilityState).toMatchObject({ checked: true });

    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Add a few words or a picture.", {}, WAIT)).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText("What's happening?"), "Rain on the window");
    await fireEvent.press(screen.getByRole("radio", { name: "Feeling" }));
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(mockRouter.back).toHaveBeenCalled();
    }, WAIT);
    const saved = store.read().days.entries.find((e) => e.text === "Rain on the window");
    expect(saved).toMatchObject({ visibility: "private", kind: "feeling", authorId: DEMO_ME_ID });
  });

  it("keeps a shared moment shared when editing (P-20)", async () => {
    await renderWith(<ComposeScreen id="m1" />, daysStore(ENTRIES));
    const onlyYou = await screen.findByRole("radio", { name: "Only you" }, WAIT);
    expect(onlyYou.props.accessibilityState).toMatchObject({ checked: false, disabled: true });
    expect(
      screen.getByRole("radio", { name: "Share with Noah" }).props.accessibilityState,
    ).toMatchObject({ checked: true });
  });
});
