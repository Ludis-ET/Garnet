import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "@/components/ui/Toast";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { newProfile } from "@/data/fixtures/demoProfile";
import { MockStore } from "@/data/mock/MockStore";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import { MediaPlayerProvider } from "@/features/media/MediaPlayerContext";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { OpenWhenCreateScreen } from "../OpenWhenCreateScreen";
import { OpenWhenDetailScreen } from "../OpenWhenDetailScreen";
import { MomentsScreen } from "@/features/moments/MomentsScreen";

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
  useLocalSearchParams: () => ({ id: "demo-letter-miss-me" }),
  usePathname: () => "/moments/open-when",
}));

const metrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

const WAIT = { timeout: 8000 };
jest.setTimeout(30_000);

function createTestStore() {
  const store = new MockStore({ latencyMs: 0 });
  store.update((s) => ({
    ...s,
    auth: { ...s.auth, status: { kind: "signedIn", userId: DEMO_ME_ID, keepSignedIn: true } },
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
      partner: {
        ...s.profiles.partner,
        name: "Noah",
        side: "sapphire",
        timeZone: "Europe/London",
      },
    },
  }));
  return store;
}

async function renderWith(ui: ReactElement, store: MockStore) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={client}>
        <RepositoryProvider store={store}>
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

describe("OPEN-01 · Open When Library", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders library with title, segmented controls, and capsule cards", async () => {
    const store = createTestStore();
    await renderWith(<MomentsScreen initial="letters" />, store);

    expect(await screen.findByText("Open When", {}, WAIT)).toBeTruthy();
    expect(screen.getByText("For me")).toBeTruthy();
    expect(screen.getByText("From me")).toBeTruthy();

    // In "For me" tab, displays letters sent to Selam
    expect(await screen.findByText("Open when you miss me", {}, WAIT)).toBeTruthy();
    expect(screen.getByText("Open on your first day at work")).toBeTruthy();

    // Floating action button
    expect(screen.getByLabelText("Write an Open When letter")).toBeTruthy();
  });

  it("strictly enforces privacy: sealed letter list never leaks body or preview text", async () => {
    const store = createTestStore();
    await renderWith(<MomentsScreen initial="letters" />, store);

    await screen.findByText("Open when you miss me", {}, WAIT);

    // Assert that the private letter body is NOT rendered on the library surface
    expect(screen.queryByText(/bench by the river/i)).toBeNull();
  });

  it("switches to 'From me' segment and displays author drafts", async () => {
    const store = createTestStore();
    await renderWith(<MomentsScreen initial="letters" />, store);

    const fromMeTab = screen.getByText("From me");
    await fireEvent.press(fromMeTab);

    // Displays Selam's unfinished draft
    expect(await screen.findByText("Open when you can't sleep", {}, WAIT)).toBeTruthy();
    expect(screen.getByText("Draft")).toBeTruthy();
  });
});

describe("OPEN-02, OPEN-03, OPEN-04 · Create Letter Wizard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("walks through prompt selection, body input, and unlock preview", async () => {
    const store = createTestStore();
    await renderWith(<OpenWhenCreateScreen />, store);

    // Step 1: Prompt selection
    expect(await screen.findByText("Open when…", {}, WAIT)).toBeTruthy();
    const sleepPromptChip = screen.getByText("you can't sleep");
    await fireEvent.press(sleepPromptChip);

    const nextBtn = screen.getByText("Continue to writing");
    await fireEvent.press(nextBtn);

    // Step 2: Body text input
    const textInput = await screen.findByPlaceholderText(/Write from the heart/i, {}, WAIT);
    await fireEvent.changeText(textInput, "Whenever the night feels too long, remember our stars.");

    const step2Next = screen.getByText("Next: Set unlock condition");
    await fireEvent.press(step2Next);

    // Step 3: Delivery & Unlock options
    expect(await screen.findByText("When can Noah open it?", {}, WAIT)).toBeTruthy();
    expect(screen.getByText("Anytime")).toBeTruthy();
    expect(screen.getByText("On a date and time")).toBeTruthy();
    expect(screen.getByText("What Noah will see before opening")).toBeTruthy();
    expect(screen.getByText("Seal letter")).toBeTruthy();
  });
  it("keeps the paper and hand with the letter, so it reads as it was written (P-71)", async () => {
    const store = createTestStore();
    await renderWith(<OpenWhenCreateScreen />, store);
    await fireEvent.press(await screen.findByText("Continue to writing", {}, WAIT));
    await fireEvent.changeText(
      await screen.findByLabelText("Your letter", {}, WAIT),
      "On rose paper, in italics.",
    );
    await fireEvent.press(screen.getByRole("radio", { name: "Rose paper" }));
    await fireEvent.press(screen.getByRole("radio", { name: "Italic" }));
    await fireEvent.press(screen.getByText("Next: Set unlock condition"));
    await fireEvent.press(await screen.findByText("Save as draft", {}, WAIT));
    await waitFor(() => {
      expect(
        store.read().letters.find((l) => l.body === "On rose paper, in italics.")?.paper,
      ).toEqual({
        tone: "rose",
        font: "italic",
      });
    }, WAIT);
  });
});

describe("OPEN-05, OPEN-06, OPEN-07 · Detail, Opening & Storyboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("displays sealed letter with status and open button for eligible letter", async () => {
    const store = createTestStore();
    await renderWith(<OpenWhenDetailScreen id="demo-letter-miss-me" />, store);

    expect(await screen.findByText(/"Open when you miss me"/, {}, WAIT)).toBeTruthy();
    expect(screen.getByText(/From Noah/)).toBeTruthy();
    expect(screen.getByText("Ready to open")).toBeTruthy();

    const openBtn = screen.getByText("Open letter");
    expect(openBtn).toBeTruthy();
  });

  it("opens letter, triggers opening flow, and renders opened letter with signature", async () => {
    const store = createTestStore();
    await renderWith(<OpenWhenDetailScreen id="demo-letter-miss-me" />, store);

    const openBtn = await screen.findByText("Open letter", {}, WAIT);
    await fireEvent.press(openBtn);

    // Confirmation dialog appears with confirm button
    const confirmButtons = await screen.findAllByRole("button", { name: "Open letter" }, WAIT);
    await fireEvent.press(confirmButtons[confirmButtons.length - 1]!);

    // Opens letter (immediate under reduced motion in tests) and reveals body text and signature line
    expect(await screen.findByText(/bench by the river/i, {}, WAIT)).toBeTruthy();
    expect(screen.getByText("— Noah")).toBeTruthy();
    expect(screen.getByText("Save as memory")).toBeTruthy();
    expect(screen.getByText("Reply with a thought")).toBeTruthy();
  });

  it("renders OPEN-08 unavailable state for unknown letter id", async () => {
    const store = createTestStore();
    await renderWith(<OpenWhenDetailScreen id="unknown-letter-id" />, store);

    expect(await screen.findByText("This item isn't available here.", {}, WAIT)).toBeTruthy();
    expect(screen.getByText("Back to letters")).toBeTruthy();
  });
});
