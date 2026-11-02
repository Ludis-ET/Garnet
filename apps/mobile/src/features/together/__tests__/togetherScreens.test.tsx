/**
 * Our World's plans, places and soundtrack (prompt 13): plans by date with the done ones folded
 * away; marking one done plays the together moment; places are only what you type (never a
 * position, P-21); songs keep an https link, never audio.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Temporal } from "temporal-polyfill";
import { ToastProvider } from "@/components/ui/Toast";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import { createMockRepositories } from "@/data/mock/mockRepositories";
import { MockStore } from "@/data/mock/MockStore";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import { MediaPlayerProvider } from "@/features/media/MediaPlayerContext";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { PlacesScreen, SoundtrackScreen } from "../PlaceSongScreens";
import { PlanDetailScreen, PlansScreen } from "../PlanScreens";

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  usePathname: () => "/our-world",
}));

const metrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};
const WAIT = { timeout: 8000 };
jest.setTimeout(30_000);

function store() {
  const s = new MockStore({ latencyMs: 0 });
  s.update((d) => ({
    ...d,
    auth: { ...d.auth, status: { kind: "signedIn", userId: DEMO_ME_ID, keepSignedIn: true } },
    pairing: { ...d.pairing, byUser: { [DEMO_ME_ID]: { ...EMPTY_PAIRING, partnerName: "Noah" } } },
    profiles: {
      ...d.profiles,
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

async function renderWith(ui: ReactElement, s: MockStore = store()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={client}>
        <RepositoryProvider store={s}>
          <ThemeProvider>
            <MediaPlayerProvider>
              <ToastProvider>{ui}</ToastProvider>
            </MediaPlayerProvider>
          </ThemeProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  return s;
}

describe("FUT-01 to FUT-03 plans", () => {
  it("lists open plans by date, with the done ones folded away", async () => {
    await renderWith(<PlansScreen />);
    expect(
      await screen.findByRole("button", { name: /^Watch the sunrise by the sea\./ }, WAIT),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^A rainy museum afternoon/ })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Done together, 1" }));
    expect(
      await screen.findByRole(
        "button",
        { name: /^A rainy museum afternoon.*Done together$/ },
        WAIT,
      ),
    ).toBeTruthy();
    expect(screen.queryByText(/\d+ days (left|to go)/)).toBeNull(); // never a countdown
  });

  it("marks a plan done together with the together moment", async () => {
    const s = await renderWith(<PlanDetailScreen id="plan-sea" />);
    await fireEvent.press(
      await screen.findByRole("button", { name: "Mark as done together" }, WAIT),
    );
    expect(await screen.findByText("We finally did it. ❤️💙", {}, WAIT)).toBeTruthy();
    await waitFor(() => {
      expect(s.read().together.plans.find((p) => p.id === "plan-sea")?.doneAt).not.toBeNull();
    }, WAIT);
  });

  it("refuses a plan with no name or a backwards range", async () => {
    const repos = createMockRepositories(store(), () => Temporal.Now.instant());
    await expect(
      repos.together.savePlan({
        title: " ",
        note: "",
        theme: "Food",
        art: null,
        place: "",
        when: { type: "someday" },
      }),
    ).rejects.toThrow("Give it a name.");
    await expect(
      repos.together.savePlan({
        title: "Trip",
        note: "",
        theme: "Travel",
        art: null,
        place: "",
        when: { type: "range", from: "2027-02-01", to: "2027-01-01" },
      }),
    ).rejects.toThrow();
  });
});

describe("PLACE-01 places", () => {
  it("saves only the place you name, with no position", async () => {
    const s = await renderWith(<PlacesScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "📍 I'm here today" }, WAIT));
    await fireEvent.changeText(await screen.findByLabelText("Place name", {}, WAIT), "Home");
    await fireEvent.press(screen.getByRole("button", { name: "Save place" }));
    await waitFor(() => {
      expect(s.read().together.places.some((p) => p.name === "Home")).toBe(true);
    }, WAIT);
    const saved = s.read().together.places.find((p) => p.name === "Home");
    expect(Object.keys(saved ?? {}).sort()).toEqual([
      "art",
      "authorId",
      "date",
      "id",
      "name",
      "note",
    ]);
  });
});

describe("SONG-01 soundtrack", () => {
  it("adds a song by its https link and refuses anything else", async () => {
    const s = await renderWith(<SoundtrackScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Add a song" }, WAIT));
    await fireEvent.changeText(
      await screen.findByLabelText("Link", {}, WAIT),
      "javascript:alert(1)",
    );
    expect(await screen.findByText("Use a full https:// link.", {}, WAIT)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Link"), "https://music.example/t/1");
    await fireEvent.changeText(screen.getByLabelText("Title"), "Our tune");
    await fireEvent.press(screen.getByRole("button", { name: "Add to our soundtrack" }));
    await waitFor(() => {
      expect(s.read().together.songs.some((x) => x.title === "Our tune")).toBe(true);
    }, WAIT);
  });
});
