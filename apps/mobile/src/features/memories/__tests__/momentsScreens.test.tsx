/**
 * Moments and Our World screens (EVT-01, EVT-02, EVT-05, EVT-07, MEM-01, MEM-02, MEM-05; P-59):
 * events in both zones, birthday mode in the birthday person's name, optional chapter prompts
 * with "Skip", memories by month, and "Delete" that says it's for both of you.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "@/components/ui/Toast";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import { MockStore } from "@/data/mock/MockStore";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import { EventScreen } from "@/features/events/EventScreen";
import { MediaPlayerProvider } from "@/features/media/MediaPlayerContext";
import { MomentsScreen } from "@/features/moments/MomentsScreen";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { ChapterScreen } from "../ChapterScreen";
import { MemoryScreen } from "../MemoryScreen";
import { OurWorldScreen } from "../OurWorldScreen";

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
  usePathname: () => "/moments",
}));

const metrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};
const WAIT = { timeout: 8000 };
jest.setTimeout(30_000);

function store() {
  const s = new MockStore({ latencyMs: 0 });
  s.update((st) => ({
    ...st,
    auth: { ...st.auth, status: { kind: "signedIn", userId: DEMO_ME_ID, keepSignedIn: true } },
    pairing: { ...st.pairing, byUser: { [DEMO_ME_ID]: { ...EMPTY_PAIRING, partnerName: "Noah" } } },
    profiles: {
      ...st.profiles,
      byUser: {
        [DEMO_ME_ID]: {
          ...newProfile("Selam"),
          side: "ruby",
          timeZone: "Africa/Addis_Ababa",
          complete: true,
        },
      },
    },
  }));
  return s;
}

async function renderWith(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={client}>
        <RepositoryProvider store={store()}>
          <ThemeProvider>
            <ToastProvider>
              <MediaPlayerProvider>{ui}</MediaPlayerProvider>
            </ToastProvider>
          </ThemeProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe("EVT-01 Moments", () => {
  it("lists events with their times in both zones, and switches to Open When", async () => {
    await renderWith(<MomentsScreen initial="events" />);
    expect((await screen.findAllByText("Our anniversary", {}, WAIT)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Addis Ababa · \d\d:\d\d London/).length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole("radio", { name: "Open When" }));
    expect(await screen.findByText("Open when you miss me", {}, WAIT)).toBeTruthy();
    expect(screen.queryByText(/Demo letter body|bench by the river/)).toBeNull();
  });
});

describe("EVT-05 birthday mode", () => {
  it("opens Noah's birthday as a special page with a way to leave something waiting", async () => {
    await renderWith(<EventScreen id="e-birthday" />);
    // On 2 November itself the page greets instead (EVT-09), so either title is right.
    expect(
      await screen.findByText(/^(Noah's birthday|Happy birthday, Noah)$/, {}, WAIT),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Write a birthday letter" })).toBeTruthy();
    expect(screen.getByText(/^Reminders|1 week before · On the day/)).toBeTruthy();
  });
});

describe("MEM-01 Our World", () => {
  it("shows memories under chapter month headers and the story hero", async () => {
    await renderWith(<OurWorldScreen />);
    expect(await screen.findByText("October · Chapter 02", {}, WAIT)).toBeTruthy();
    expect(screen.getByText("Our story")).toBeTruthy();
    expect(screen.getAllByText("Same sky").length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole("radio", { name: "Collections" }));
    expect(await screen.findByText("First days apart", {}, WAIT)).toBeTruthy();
  });

  it("says a deleted memory goes for both of you", async () => {
    await renderWith(<MemoryScreen id="mem-airport" />);
    await fireEvent.press(await screen.findByRole("button", { name: "Delete memory" }, WAIT));
    expect(await screen.findByText(/removed for both of you/, {}, WAIT)).toBeTruthy();
  });
});

describe("EVT-07 chapters", () => {
  it("offers every prompt as optional, with Skip", async () => {
    await renderWith(<ChapterScreen month="2026-10" />);
    expect(await screen.findByText("Favourite moment", {}, WAIT)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^Skip / }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/score|streak|missed/i)).toBeNull();
  });
});
