/**
 * Settings (prompt 15), search (prompt 14) and the notification centre (prompt 17), P-63.
 * Each person's settings are their own; open questions stay open (quiet hours U-21 only
 * suggested, reminders not chosen send none, P-65); sealed letters show only their prompt.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "@/components/ui/Toast";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import { MockStore } from "@/data/mock/MockStore";
import { createMockRepositories } from "@/data/mock/mockRepositories";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import { NotificationCentreScreen } from "@/features/notifications/NotificationCentreScreen";
import { SearchScreen } from "@/features/search/SearchScreen";
import { HomeScreen } from "@/features/home/HomeScreen";
import { NotificationDetailScreen } from "@/features/notifications/NotificationDetailScreen";
import { setTestingTools } from "@/features/prototype/devTools";
import { AboutPage } from "../pages/InfoPages";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { SettingsPageScreen } from "../SettingsPageScreen";
import { SettingsScreen } from "../SettingsScreen";

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
  usePathname: () => "/settings",
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
      partner: { ...d.profiles.partner, side: "sapphire" },
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
            <ToastProvider>{ui}</ToastProvider>
          </ThemeProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  return s;
}

const mine = (s: MockStore) => s.read().settings.byUser[DEMO_ME_ID];

describe("SET-01 Settings", () => {
  it("shows the groups, generic previews and no reminder choice yet", async () => {
    await renderWith(<SettingsScreen />);
    expect(await screen.findByText("Selam", {}, WAIT)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lock-screen previews, Generic" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reminders, Not chosen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Quiet hours, Off" })).toBeTruthy();
    // Ending the space and deleting the account are separate rows.
    expect(screen.getByRole("button", { name: "End our space" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete my account" })).toBeTruthy();
  });
});

describe("SET-06 quiet hours (U-21 open)", () => {
  it("only suggests 22:00–07:00 and applies it when the person chooses", async () => {
    const s = await renderWith(<SettingsPageScreen page="quiet-hours" />);
    expect(await screen.findByText("Suggested", {}, WAIT)).toBeTruthy();
    expect(mine(s)).toBeUndefined();
    await fireEvent.press(screen.getByRole("button", { name: "Use the suggested hours" }));
    await waitFor(() => {
      expect(mine(s)?.quiet).toEqual({ on: true, start: "22:00", end: "07:00" });
    }, WAIT);
  });
});

describe("SET-07 lock-screen previews", () => {
  it("starts generic and changes only this person's own setting", async () => {
    const s = await renderWith(<SettingsPageScreen page="previews" />);
    expect(
      (await screen.findByRole("radio", { name: "Generic" }, WAIT)).props.accessibilityState,
    ).toMatchObject({ checked: true });
    await fireEvent.press(screen.getByRole("radio", { name: "Full content" }));
    await waitFor(() => {
      expect(mine(s)?.previews).toBe("full");
    }, WAIT);
    expect(Object.keys(s.read().settings.byUser)).toEqual([DEMO_ME_ID]);
  });
});

describe("SET-14 end our space", () => {
  it("needs the typed word before it ends anything", async () => {
    const s = await renderWith(<SettingsPageScreen page="end-space" />);
    await fireEvent.press(await screen.findByRole("button", { name: "Continue" }, WAIT));
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
    const end = screen.getByRole("button", { name: "End our space" });
    expect(end.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.changeText(screen.getByLabelText("Type END"), "END");
    await fireEvent.press(screen.getByRole("button", { name: "End our space" }));
    await waitFor(() => {
      expect(s.read().pairing.byUser[DEMO_ME_ID]?.partnerName).toBeNull();
    }, WAIT);
  });
});

describe("SEARCH-01 search", () => {
  it("finds a sealed letter by its prompt and marks it sealed; clears history", async () => {
    const s = await renderWith(<SearchScreen />);
    await fireEvent.changeText(await screen.findByLabelText("Search Garnet", {}, WAIT), "miss me");
    expect(
      await screen.findByRole("button", { name: /^Open when you miss me, sealed/ }, WAIT),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: /^Open when you miss me, sealed/ }));
    await waitFor(() => {
      expect(s.read().settings.recentSearches[DEMO_ME_ID]).toEqual(["miss me"]);
    }, WAIT);
    await fireEvent.changeText(screen.getByLabelText("Search Garnet"), "");
    await fireEvent.press(await screen.findByRole("button", { name: "Clear history" }, WAIT));
    await fireEvent.press(await screen.findByRole("button", { name: "Clear" }, WAIT));
    await waitFor(() => {
      expect(s.read().settings.recentSearches[DEMO_ME_ID]).toEqual([]);
    }, WAIT);
  });
});

describe("NOTIF-01 notification centre", () => {
  it("lists what happened and marks it read for this person only", async () => {
    const s = await renderWith(<NotificationCentreScreen />);
    await fireEvent.press(await screen.findByRole("button", { name: "Mark all as read" }, WAIT));
    await waitFor(() => {
      expect(screen.queryAllByRole("button", { name: /^Unread\./ })).toHaveLength(0);
    }, WAIT);
    expect(Object.keys(s.read().settings.readIds)).toEqual([DEMO_ME_ID]);
  });
});

describe("Settings control the app (P-66)", () => {
  it("finds a setting by everyday words", async () => {
    await renderWith(<SettingsScreen />);
    await fireEvent.changeText(await screen.findByLabelText("Search settings", {}, WAIT), "seen");
    expect(await screen.findByRole("button", { name: "Chat" }, WAIT)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Appearance" })).toBeNull();
  });

  it("quick controls change only this person's own settings", async () => {
    const s = await renderWith(<SettingsScreen />);
    await fireEvent.press(await screen.findByRole("switch", { name: "Distance" }, WAIT));
    await waitFor(() => {
      expect(mine(s)?.location).toEqual({ share: false });
    }, WAIT);
    expect(Object.keys(s.read().settings.byUser)).toEqual([DEMO_ME_ID]);
  });

  it("hides a Home card the person turned off", async () => {
    const s = store();
    s.update((d) => ({
      ...d,
      settings: {
        ...d.settings,
        byUser: {
          [DEMO_ME_ID]: {
            home: {
              ring: true,
              watchers: true,
              cards: {
                now: false,
                messages: true,
                upcoming: true,
                letters: true,
                memory: true,
                today: true,
              },
            },
          },
        },
      },
    }));
    await renderWith(<HomeScreen />, s);
    expect(await screen.findByRole("button", { name: /^Messages with Noah/ }, WAIT)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Right now/ })).toBeNull();
  });
});

describe("NOTIF-01 details", () => {
  it("reads it on opening, and can keep it unread", async () => {
    const s = store();
    const items = await createMockRepositories(s).inbox.list();
    const first = items.find((i) => i.unread);
    if (first === undefined) throw new Error("nothing unread");
    await renderWith(<NotificationDetailScreen id={first.id} />, s);
    expect(await screen.findByText(first.title, {}, WAIT)).toBeTruthy();
    await waitFor(() => {
      expect(s.read().settings.readIds[DEMO_ME_ID]).toContain(first.id);
    }, WAIT);
    await fireEvent.press(await screen.findByRole("button", { name: "Keep unread" }, WAIT));
    await waitFor(() => {
      expect(s.read().settings.keptUnread[DEMO_ME_ID]).toContain(first.id);
    }, WAIT);
  });
});

describe("WIDGET-01 to WIDGET-07 gallery", () => {
  it("character widgets (P-72) carry no content or counts and ask before 'Thinking of you' sends", async () => {
    const s = await renderWith(<SettingsPageScreen page="widgets" />);
    expect(await screen.findByLabelText("Widget preview: Thinking of you", {}, WAIT)).toBeTruthy();
    expect(screen.getByLabelText("Widget preview: Something waiting for you")).toBeTruthy();
    // Never a streak, a count or any words from the app (widgets plan §1-2).
    expect(
      screen.queryByText(/streak|in a row|Coffee ceremony|Same sky|bench by the river/i),
    ).toBeNull();
    const before = s.read().home.sent.length;
    await fireEvent.press(screen.getByRole("button", { name: "Thinking of you" }));
    expect(await screen.findByText("Send 'I thought of you'?", {}, WAIT)).toBeTruthy();
    expect(s.read().home.sent.length).toBe(before);
  });

  it("simple widgets stay privacy-neutral and ask before a quick action sends anything", async () => {
    const s = await renderWith(<SettingsPageScreen page="widgets" />);
    await fireEvent.press(await screen.findByRole("radio", { name: "Simple" }, WAIT));
    expect(
      await screen.findByLabelText("Widget preview: Something coming up", {}, WAIT),
    ).toBeTruthy();
    // No real titles: not the next event, not a memory.
    expect(screen.queryByText(/birthday|Coffee ceremony|Same sky/i)).toBeNull();
    const before = s.read().home.sent.length;
    const [first] = screen.getAllByRole("button", { name: /^Quick action/ });
    if (first === undefined) throw new Error("no quick action");
    await fireEvent.press(first);
    expect(await screen.findByText("Send this?", {}, WAIT)).toBeTruthy();
    expect(s.read().home.sent.length).toBe(before);
  });
});

describe("Testing tools stay hidden (P-75)", () => {
  afterEach(() => {
    setTestingTools(false);
  });

  it("shows no testing section by default", async () => {
    await renderWith(<SettingsScreen />);
    expect(await screen.findByText("Widgets", {}, WAIT)).toBeTruthy();
    expect(screen.queryByText("Widget designs")).toBeNull();
    expect(screen.queryByText("Reset sample data")).toBeNull();
  });

  it("turns the tools on after seven taps on the version in About", async () => {
    await renderWith(<AboutPage />);
    expect(
      await screen.findByText("Preview build: everything stays on this phone.", {}, WAIT),
    ).toBeTruthy();
    const version = screen.getByLabelText("Version 0.1, preview");
    for (let i = 0; i < 7; i++) await fireEvent.press(version);
    expect(await screen.findByText("Testing tools are on.", {}, WAIT)).toBeTruthy();
  });

  it("shows the testing section once the tools are on", async () => {
    setTestingTools(true);
    await renderWith(<SettingsScreen />);
    expect(await screen.findByText("Widget designs", {}, WAIT)).toBeTruthy();
  });
});
