/**
 * PAIR-01 to PAIR-07 render and behave per docs/design/prompts/02 (Daylight Glass, P-49),
 * including the privacy rules: one identical message for any code that can't be used (P-18,
 * proposed), no inviter email, sharing stays a local preview. Navigation and the clipboard are
 * mocked; data comes from a MockStore with no latency. Assumes delivery by code (U-33 open).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import type { ReactElement } from "react";
import type * as ReactNative from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Temporal } from "temporal-polyfill";
import { ToastProvider } from "@/components/ui/Toast";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { DEMO_EMAIL } from "@/data/fixtures/demoAuth";
import {
  DEMO_INVITE_CODES,
  EMPTY_PAIRING,
  type DemoPairingOfUser,
} from "@/data/fixtures/demoPairing";
import { MockStore } from "@/data/mock/MockStore";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import { INVITE_NOT_VALID_MESSAGE } from "@/domain/pairing";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { AlreadyPairedScreen } from "../screens/AlreadyPairedScreen";
import { ConnectedScreen } from "../screens/ConnectedScreen";
import { InviteScreen } from "../screens/InviteScreen";
import { JoinScreen } from "../screens/JoinScreen";
import { PairStartScreen } from "../screens/PairStartScreen";
import { ReviewScreen } from "../screens/ReviewScreen";

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};

jest.mock("expo-router", () => ({
  // goBack() uses the module router (a getter: the factory runs before mockRouter exists).
  get router() {
    return mockRouter;
  },
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  Redirect: ({ href }: { href: string }) => {
    const { Text: RNText } = jest.requireActual<typeof ReactNative>("react-native");
    return <RNText>{`redirect:${href}`}</RNText>;
  },
}));

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(() => Promise.resolve(true)),
  getStringAsync: jest.fn(() => Promise.resolve(" k7qm-4xpv ")),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};
const WAIT = { timeout: 8000 };
jest.setTimeout(30_000);

/** A store with Selam signed in and the given pairing state. */
function signedInStore(pairing: Partial<DemoPairingOfUser> = {}) {
  const store = new MockStore({ latencyMs: 0 });
  store.update((s) => ({
    ...s,
    auth: { ...s.auth, status: { kind: "signedIn", userId: DEMO_ME_ID, keepSignedIn: true } },
    pairing: {
      ...s.pairing,
      byUser: { [DEMO_ME_ID]: { ...EMPTY_PAIRING, ...pairing } },
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
const type = async (label: string, text: string) => {
  await fireEvent.changeText(await screen.findByLabelText(label, {}, WAIT), text);
};
const myPairing = (store: MockStore) => store.read().pairing.byUser[DEMO_ME_ID];

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PAIR-01 Create our space", () => {
  it("offers both paths and the account button", async () => {
    await renderWith(<PairStartScreen />, signedInStore());
    expect(await screen.findByRole("header", { name: "Create our space" }, WAIT)).toBeTruthy();
    expect(screen.getByText("Just the two of you.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Account: sign out" })).toBeTruthy();
    await press("I have an invitation");
    expect(mockRouter.push).toHaveBeenCalledWith("/pair/join");
  });

  it("creates an invitation and opens it", async () => {
    const store = await renderWith(<PairStartScreen />, signedInStore());
    await press("Invite my person");
    await screen.findByRole("button", { name: "Invite my person", busy: false }, WAIT);
    expect(mockRouter.push).toHaveBeenCalledWith("/pair/invite");
    expect(myPairing(store)?.invite).not.toBeNull();
  });
});

describe("PAIR-02 and PAIR-06 Your invitation", () => {
  const fresh = () =>
    signedInStore({ invite: { code: "ABCD2345", createdAt: Temporal.Now.instant().toString() } });

  it("shows the code to be read one character at a time, marked as simulated", async () => {
    await renderWith(<InviteScreen />, fresh());
    expect(
      await screen.findByRole(
        "button",
        { name: "Invitation code A B C D, 2 3 4 5. Copy code" },
        WAIT,
      ),
    ).toBeTruthy();
    expect(screen.getByText("Simulated invitation")).toBeTruthy();
    expect(screen.getByText(/^Expires in 2[34] h \d+ m · works once$/)).toBeTruthy();
    expect(screen.getByText("Waiting for your person to join…")).toBeTruthy();
  });

  it("copies the code", async () => {
    await renderWith(<InviteScreen />, fresh());
    await press("Copy code");
    expect(await screen.findByText("Code copied", {}, WAIT)).toBeTruthy();
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith("ABCD-2345");
  });

  it("previews the share message locally, sending nothing", async () => {
    await renderWith(<InviteScreen />, fresh());
    await press("Share invitation");
    expect(await screen.findByRole("header", { name: "Share preview" }, WAIT)).toBeTruthy();
    // The matcher collapses the message's line breaks into spaces.
    expect(screen.getByText(/Your invitation code: ABCD-2345 /)).toBeTruthy();
    expect(screen.getByText(/It works once and expires in 24 hours\./)).toBeTruthy();
    expect(screen.getByText("Simulated — nothing is sent")).toBeTruthy();
  });

  it("explains an expired invitation and offers a new one (never a dead end)", async () => {
    const created = Temporal.Now.instant().subtract({ hours: 25 }).toString();
    await renderWith(
      <InviteScreen />,
      signedInStore({ invite: { code: "ABCD2345", createdAt: created } }),
    );
    expect(await screen.findByText("This invitation has expired.", {}, WAIT)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create a new one" })).toBeTruthy();
    expect(screen.queryByText("Waiting for your person to join…")).toBeNull();
  });

  it("walks the person receiving the code through joining", async () => {
    await renderWith(<InviteScreen />, fresh());
    expect(await screen.findByRole("header", { name: "How your person joins" }, WAIT)).toBeTruthy();
    expect(screen.getByText("Enter the code to open your space together")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy message" })).toBeTruthy();
  });

  it("offers a fresh code instead of empty tiles when this phone has no code (P-97)", async () => {
    await renderWith(
      <InviteScreen />,
      signedInStore({ invite: { code: "", createdAt: Temporal.Now.instant().toString() } }),
    );
    expect(await screen.findByRole("button", { name: "Make a fresh code" }, WAIT)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Share invitation" })).toBeNull();
  });

  it("revokes after confirming", async () => {
    const store = await renderWith(<InviteScreen />, fresh());
    await press("Revoke invitation");
    expect(
      await screen.findByRole("header", { name: "Revoke this invitation?" }, WAIT),
    ).toBeTruthy();
    await press("Revoke");
    await screen.findByText("Invitation revoked.", {}, WAIT);
    expect(mockRouter.replace).toHaveBeenCalledWith("/pair");
    expect(myPairing(store)?.invite).toBeNull();
  });

  it("turns into the joined moment when the person accepts (PAIR-06)", async () => {
    await renderWith(<InviteScreen />, fresh());
    await press("Simulate your person joining (demo)");
    expect(
      await screen.findByRole("header", { name: "Noah joined your space." }, WAIT),
    ).toBeTruthy();
    await press("Continue");
    expect(mockRouter.replace).toHaveBeenCalledWith("/pair/connected");
  });
});

describe("PAIR-03 Enter your code", () => {
  it("waits for all eight characters", async () => {
    await renderWith(<JoinScreen />, signedInStore());
    await type("Invitation code", "K7QM");
    expect(
      await screen.findByRole("button", { name: "Continue", disabled: true }, WAIT),
    ).toBeTruthy();
  });

  // P-18: unknown, used and expired codes are indistinguishable; the input is kept.
  it.each([
    ["expired", DEMO_INVITE_CODES.expired],
    ["used", DEMO_INVITE_CODES.used],
    ["unknown", "ZZZZ9999"],
  ])("answers an %s code with the one calm message", async (_, code) => {
    await renderWith(<JoinScreen />, signedInStore());
    await type("Invitation code", code.toLowerCase());
    await press("Continue");
    expect(await screen.findByText(INVITE_NOT_VALID_MESSAGE, {}, WAIT)).toBeTruthy();
    expect(screen.getByLabelText("Invitation code").props.value).toBe(code);
    expect(screen.queryByText(/expired|used|unknown|not found/i)).toBeNull();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("pastes a code in any format and continues to review", async () => {
    await renderWith(<JoinScreen />, signedInStore());
    await press("Paste code");
    await screen.findByDisplayValue("K7QM4XPV", {}, WAIT);
    await press("Continue");
    await screen.findByRole("button", { name: "Continue", busy: false }, WAIT);
    expect(mockRouter.push).toHaveBeenCalledWith("/pair/review");
  });
});

describe("PAIR-04 Review the invitation", () => {
  const reviewing = () => signedInStore({ reviewing: DEMO_INVITE_CODES.valid });

  it("shows only the inviter's display name and what joining means", async () => {
    await renderWith(<ReviewScreen />, reviewing());
    expect(await screen.findByRole("header", { name: "Noah invited you" }, WAIT)).toBeTruthy();
    expect(screen.getByLabelText("Only the two of you can see what's inside")).toBeTruthy();
    expect(screen.getByText("Only accept if you know this person.")).toBeTruthy();
    expect(screen.queryByText(/@/)).toBeNull();
    expect(screen.queryByText(new RegExp(DEMO_EMAIL))).toBeNull();
  });

  it("accepts and connects", async () => {
    const store = await renderWith(<ReviewScreen />, reviewing());
    await press("Accept and connect");
    await screen.findByRole("button", { name: "Accept and connect", busy: false }, WAIT);
    expect(mockRouter.replace).toHaveBeenCalledWith("/pair/connected");
    expect(myPairing(store)?.partnerName).toBe("Noah");
  });

  it("declines after confirming, without pairing", async () => {
    const store = await renderWith(<ReviewScreen />, reviewing());
    await press("Decline");
    expect(
      await screen.findByRole("header", { name: "Decline this invitation?" }, WAIT),
    ).toBeTruthy();
    expect(screen.getByText("You can always ask Noah for a new one.")).toBeTruthy();
    // The screen's Decline and the sheet's confirm share a name; pressing both is harmless
    // (the screen's only reopens the sheet), whichever order they render in.
    for (const button of await screen.findAllByRole("button", { name: "Decline" }, WAIT))
      await fireEvent.press(button);
    await screen.findByText("redirect:/pair", {}, WAIT);
    expect(mockRouter.replace).toHaveBeenCalledWith("/pair");
    expect(myPairing(store)?.partnerName).toBeNull();
  });
});

describe("PAIR-05 and PAIR-07", () => {
  const paired = () => signedInStore({ partnerName: "Noah" });

  it("celebrates the connection and continues to setup", async () => {
    await renderWith(<ConnectedScreen />, paired());
    expect(await screen.findByRole("header", { name: "You're connected." }, WAIT)).toBeTruthy();
    expect(screen.getByText("Let's set up your space.")).toBeTruthy();
    await press("Continue");
    expect(mockRouter.replace).toHaveBeenCalledWith("/setup");
  });

  it("tells an already-paired person they are connected (PAIR-07)", async () => {
    await renderWith(<AlreadyPairedScreen />, paired());
    expect(
      await screen.findByRole("header", { name: "You're already connected" }, WAIT),
    ).toBeTruthy();
    await press("Go to my space");
    expect(mockRouter.replace).toHaveBeenCalledWith("/");
  });

  it("sends a paired person away from the join screen", async () => {
    await renderWith(<JoinScreen />, paired());
    expect(await screen.findByText("redirect:/pair/already", {}, WAIT)).toBeTruthy();
  });
});
