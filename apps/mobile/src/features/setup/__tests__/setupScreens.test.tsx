/**
 * SETUP-01 to SETUP-08 render and behave per docs/design/prompts/03 (Daylight Glass "liquid",
 * P-51): the two partners can never hold the same side, the name preview is in-app only and
 * the lock-screen preview generic (P-17), permissions are simulated and labelled, and quiet
 * hours are on without inventing a window (U-21 open). Navigation is mocked.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import type * as ReactNative from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "@/components/ui/Toast";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile, type Profile } from "@/data/fixtures/demoProfile";
import { MockStore } from "@/data/mock/MockStore";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import type { GemSide } from "@/domain/identity";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { SetupScreen } from "../SetupScreen";

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

/** Selam signed in and paired with Noah, with the given setup progress. */
function setupStore(profile: Partial<Profile> = {}, partnerSide: GemSide | null = null) {
  const store = new MockStore({ latencyMs: 0 });
  store.update((s) => ({
    ...s,
    auth: { ...s.auth, status: { kind: "signedIn", userId: DEMO_ME_ID, keepSignedIn: true } },
    pairing: { ...s.pairing, byUser: { [DEMO_ME_ID]: { ...EMPTY_PAIRING, partnerName: "Noah" } } },
    profiles: {
      byUser: { [DEMO_ME_ID]: { ...newProfile("Selam"), ...profile } },
      partner: { ...s.profiles.partner, side: partnerSide },
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

const press = async (name: string | RegExp) => {
  await fireEvent.press(await screen.findByRole("button", { name }, WAIT));
};
const mine = (store: MockStore) => store.read().profiles.byUser[DEMO_ME_ID];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("SETUP-02 Your name", () => {
  it("previews the greeting in the app, using the nickname, and keeps lock screens private", async () => {
    await renderWith(<SetupScreen />, setupStore());
    expect(
      await screen.findByRole("header", { name: "What should Noah call you?" }, WAIT),
    ).toBeTruthy();
    expect(screen.getByLabelText("Step 1 of 6, Name")).toBeTruthy();
    expect(screen.getByText("A little thought from Selam.")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Nickname (optional)"), "Sel");
    expect(await screen.findByText("A little thought from Sel.", {}, WAIT)).toBeTruthy();
    expect(screen.getByText("Only Noah sees this.")).toBeTruthy();
  });

  it("asks for a name before moving on", async () => {
    const store = await renderWith(<SetupScreen />, setupStore());
    await fireEvent.changeText(await screen.findByLabelText("Display name", {}, WAIT), "  ");
    await press("Continue");
    expect(await screen.findByText("Please fill this in.", {}, WAIT)).toBeTruthy();
    expect(mine(store)?.done).toEqual([]);
  });
});

describe("SETUP-03 Choose your side (P-51)", () => {
  it("locks the side Noah holds and takes the other", async () => {
    const store = await renderWith(<SetupScreen />, setupStore({ done: ["name"] }, "sapphire"));
    expect(await screen.findByRole("header", { name: "Choose your side" }, WAIT)).toBeTruthy();
    const taken = screen.getByRole("radio", { name: "Sapphire, taken by Noah" });
    expect(taken.props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByText("Noah is Sapphire")).toBeTruthy();
    expect(
      await screen.findByRole("button", { name: "Continue", disabled: true }, WAIT),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole("radio", { name: "Ruby, Warm, expressive, alive." }));
    await press("Continue");
    expect(await screen.findByRole("header", { name: "Your picture" }, WAIT)).toBeTruthy();
    expect(mine(store)?.side).toBe("ruby");
  });

  it("resolves a same-moment choice kindly, giving the other side", async () => {
    const store = await renderWith(<SetupScreen />, setupStore({ done: ["name"] }));
    await fireEvent.press(
      await screen.findByRole("radio", { name: "Ruby, Warm, expressive, alive." }, WAIT),
    );
    // Noah takes Ruby on his phone a moment before this person presses Continue.
    await act(() => {
      store.update((s) => ({
        ...s,
        profiles: { ...s.profiles, partner: { ...s.profiles.partner, side: "ruby" } },
      }));
    });
    await press("Continue");
    expect(await screen.findByRole("header", { name: "Noah just chose Ruby" }, WAIT)).toBeTruthy();
    expect(screen.getByText("You'll be Sapphire, the other half of Garnet.")).toBeTruthy();
    await press("Be Sapphire");
    expect(await screen.findByRole("header", { name: "Your picture" }, WAIT)).toBeTruthy();
    expect(mine(store)?.side).toBe("sapphire");
    expect(store.read().profiles.partner.side).toBe("ruby");
  });
});

describe("SETUP-04 to SETUP-07", () => {
  it("offers a photo only through a permission prompt (labelled with testing tools on)", async () => {
    await renderWith(<SetupScreen />, setupStore({ done: ["name", "side"], side: "ruby" }));
    await fireEvent.press(await screen.findByRole("radio", { name: "Photo" }, WAIT));
    await press("Choose a photo");
    expect(
      await screen.findByText(
        "Garnet only uses the photo you pick. Nothing else in your library is read.",
        {},
        WAIT,
      ),
    ).toBeTruthy();
    await press("Open photo library");
    // The prompt itself; its "Simulated" badge shows only with testing tools on (P-75).
    expect(
      await screen.findByText("“Garnet” would like to access your photos", {}, WAIT),
    ).toBeTruthy();
    expect(screen.queryByText("Simulated system prompt")).toBeNull();
    await press("Don't Allow");
    expect(
      await screen.findByText(
        "Garnet can work without this permission. You can enable it in Settings later.",
        {},
        WAIT,
      ),
    ).toBeTruthy();
  });

  it("shows both cities' times", async () => {
    await renderWith(
      <SetupScreen />,
      setupStore({ done: ["name", "side", "photo"], side: "ruby", timeZone: "Africa/Addis_Ababa" }),
    );
    expect(await screen.findByRole("header", { name: "Where's home?" }, WAIT)).toBeTruthy();
    expect(screen.getByText("You · Addis Ababa")).toBeTruthy();
    expect(screen.getByText("Noah · London")).toBeTruthy();
    expect(screen.getByText("London's time changes with UK daylight saving.")).toBeTruthy();
  });

  it("keeps quiet hours on without inventing hours, and previews only the generic text", async () => {
    await renderWith(
      <SetupScreen />,
      setupStore({
        done: ["name", "side", "photo", "time", "look"],
        side: "sapphire",
        timeZone: "Africa/Addis_Ababa",
      }),
    );
    expect(await screen.findByRole("header", { name: "Stay close, gently" }, WAIT)).toBeTruthy();
    expect(screen.getByText("Quiet hours on · set the hours later")).toBeTruthy();
    expect(screen.queryByText(/\d{1,2}:\d\d\s*[–-]\s*\d{1,2}:\d\d/)).toBeNull();
    expect(
      screen.getByLabelText("Lock-screen preview: Garnet, now, Something new for you 💜"),
    ).toBeTruthy();
    await press("Turn on notifications");
    const confirms = await screen.findAllByRole("button", { name: "Continue" }, WAIT);
    const sheetConfirm = confirms[confirms.length - 1];
    if (sheetConfirm === undefined) throw new Error("no sheet button");
    await fireEvent.press(sheetConfirm);
    await press("Allow");
    expect(await screen.findByText("Notifications are on.", {}, WAIT)).toBeTruthy();
  });
});

describe("SETUP-08 You're all set", () => {
  it("summarises every answer and finishes setup", async () => {
    const store = await renderWith(
      <SetupScreen />,
      setupStore({
        done: ["name", "side", "photo", "time", "look", "alerts"],
        side: "ruby",
        nickname: "Sel",
        timeZone: "Africa/Addis_Ababa",
        notifications: { status: "on", thoughts: true, support: true, days: false },
      }),
    );
    expect(await screen.findByRole("header", { name: "You're all set" }, WAIT)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Side: ❤️ Ruby. Edit" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Time zone: Addis Ababa. Edit" })).toBeTruthy();
    expect(screen.getByText("Still setting up…")).toBeTruthy();
    await press("Go to our space");
    await screen.findByRole("button", { name: "Go to our space", busy: false }, WAIT);
    expect(mockRouter.replace).toHaveBeenCalledWith("/home");
    expect(mine(store)?.complete).toBe(true);
  });
});
