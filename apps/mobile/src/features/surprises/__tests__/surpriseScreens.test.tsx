/**
 * SUR-01 to SUR-07 on screen (prompt 12): the library shows titles and status, never what's
 * inside; a ready surprise opens with a reveal you can skip; creating locks a hidden surprise.
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
import { RepositoryProvider } from "@/data/RepositoryProvider";
import { MediaPlayerProvider } from "@/features/media/MediaPlayerContext";
import { MomentsScreen } from "@/features/moments/MomentsScreen";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { SurpriseCreateScreen } from "../SurpriseCreateScreen";
import { SurpriseDetailScreen } from "../SurpriseDetailScreen";

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
  usePathname: () => "/moments/surprises",
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

describe("SUR-01 library", () => {
  it("shows titles and status, never what's inside", async () => {
    const s = await renderWith(<MomentsScreen initial="surprises" />);
    expect(
      await screen.findByRole("button", { name: "Something for you. From Noah. Ready" }, WAIT),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /^For our anniversary\. From Noah\. Scheduled/ }),
    ).toBeTruthy();
    const hidden = s.read().surprises.find((x) => x.id === "sur-anniversary")?.content.text ?? "?";
    expect(screen.queryByText(hidden)).toBeNull();
    await fireEvent.press(screen.getByRole("radio", { name: "From me" }));
    expect(await screen.findByRole("button", { name: /Not scheduled yet$/ }, WAIT)).toBeTruthy();
  });
});

describe("SUR-06 open", () => {
  it("asks first, unwraps (skippable), then shows what's inside", async () => {
    const s = await renderWith(<SurpriseDetailScreen id="sur-ready" />);
    await fireEvent.press(await screen.findByRole("button", { name: "Open your surprise" }, WAIT));
    await fireEvent.press(await screen.findByRole("button", { name: "Open" }, WAIT));
    const skip = await screen.findByRole("button", { name: "Skip" }, WAIT);
    await fireEvent.press(skip);
    expect(await screen.findByText(/The sky over the river/, {}, WAIT)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send a thought back" })).toBeTruthy();
    expect(s.read().surprises.find((x) => x.id === "sur-ready")?.state).toBe("opened");
  });

  it("shows a locked surprise for the recipient with no hints", async () => {
    const s = await renderWith(<SurpriseDetailScreen id="sur-anniversary" />);
    expect(await screen.findByText(/^Opens on Our anniversary/, {}, WAIT)).toBeTruthy();
    const hidden = s.read().surprises.find((x) => x.id === "sur-anniversary")?.content.text ?? "?";
    expect(screen.queryByText(hidden)).toBeNull();
    expect(screen.queryByRole("button", { name: "Open your surprise" })).toBeNull();
  });
});

describe("SUR-02 to SUR-04 create", () => {
  it("locks a hidden message with the generic title", async () => {
    const s = await renderWith(<SurpriseCreateScreen />);
    await fireEvent.changeText(
      await screen.findByLabelText("Your message", {}, WAIT),
      "Look under the pillow",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Next: when it opens" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Next: preview" }, WAIT));
    expect(await screen.findByText("What Noah will see", {}, WAIT)).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Lock surprise" }));
    await waitFor(() => {
      expect(s.read().surprises[0]).toMatchObject({
        safeTitle: null,
        state: "scheduled",
        content: { kind: "message", text: "Look under the pillow" },
      });
    }, WAIT);
    expect(mockRouter.replace).toHaveBeenCalledWith("/moments/surprises");
  });
});
