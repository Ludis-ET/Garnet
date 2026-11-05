/**
 * The account pages in Settings (B2, P-79, P-80): devices, the real password change, the ways
 * in, the email and the birthday, and honest pages for what isn't available yet.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "@/components/ui/Toast";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/data/fixtures/demoAuth";
import { EMPTY_PAIRING } from "@/data/fixtures/demoPairing";
import { newProfile } from "@/data/fixtures/demoProfile";
import { MockStore } from "@/data/mock/MockStore";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import type { Repositories, SettingsView } from "@/data/repositories/types";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { SettingsPageScreen } from "../SettingsPageScreen";

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

let mockDataRights = true;
jest.mock("@/data/http/apiRepositories", () => ({
  withApiAreas: (r: Repositories) => ({
    ...r,
    settings: {
      ...r.settings,
      get: async (): Promise<SettingsView> => ({
        ...(await r.settings.get()),
        dataRights: mockDataRights,
      }),
    },
  }),
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

async function open(page: string, s: MockStore = store()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <QueryClientProvider client={client}>
        <RepositoryProvider store={s}>
          <ThemeProvider>
            <ToastProvider>
              <SettingsPageScreen page={page} />
            </ToastProvider>
          </ThemeProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  return s;
}

const type = async (label: string, text: string) => {
  await fireEvent.changeText(await screen.findByLabelText(label, {}, WAIT), text);
};
const press = async (name: string | RegExp) => {
  await fireEvent.press(await screen.findByRole("button", { name }, WAIT));
};
const account = (s: MockStore) => s.read().auth.accounts.find((a) => a.email === DEMO_EMAIL);

beforeEach(() => {
  jest.clearAllMocks();
  mockDataRights = true;
});

describe("SET-12 Devices and password", () => {
  it("lists devices with this phone first, and signs another out", async () => {
    const s = await open("devices");
    expect(await screen.findByText("This phone", {}, WAIT)).toBeTruthy();
    await press("Sign out");
    await fireEvent.press(
      (await screen.findAllByRole("button", { name: "Sign out" })).at(-1) as never,
    );
    await waitFor(() => {
      expect(s.read().settings.devices.filter((d) => !d.current)).toHaveLength(0);
    }, WAIT);
  });

  it("holds a new password to the real rules, not a short minimum (P-78)", async () => {
    const s = await open("devices");
    await type("Current password", DEMO_PASSWORD);
    await type("New password", "too short");
    await press("Change password");
    expect(await screen.findByText("Use at least 15 characters.", {}, WAIT)).toBeTruthy();
    await type("New password", "passwordpassword");
    await press("Change password");
    expect(
      await screen.findByText(
        "That one is easy to guess. A few words that mean something to you work well.",
        {},
        WAIT,
      ),
    ).toBeTruthy();
    expect(account(s)?.password).toBe(DEMO_PASSWORD);
  });

  it("really changes it, and says so only when it did", async () => {
    const s = await open("devices");
    await type("Current password", "not my password");
    await type("New password", "a brand new passphrase");
    await press("Change password");
    expect(
      await screen.findByText("That didn't match your current password.", {}, WAIT),
    ).toBeTruthy();
    expect(account(s)?.password).toBe(DEMO_PASSWORD);
    await type("Current password", DEMO_PASSWORD);
    await press("Change password");
    expect(await screen.findByText("Password changed.", {}, WAIT)).toBeTruthy();
    expect(account(s)?.password).toBe("a brand new passphrase");
  });

  it("offers to set a password when there is none", async () => {
    const s = store();
    s.update((d) => ({
      ...d,
      auth: {
        ...d.auth,
        accounts: d.auth.accounts.map((a) =>
          a.email === DEMO_EMAIL ? { ...a, password: "", providers: ["google"] } : a,
        ),
      },
    }));
    await open("devices", s);
    expect(await screen.findByText("No password yet", {}, WAIT)).toBeTruthy();
    expect(screen.queryByLabelText("Current password")).toBeNull();
    await press("Email me a link to set one");
    expect(
      await screen.findByText("We've emailed you a link to set a password.", {}, WAIT),
    ).toBeTruthy();
  });
});

describe("Sign-in methods (P-80)", () => {
  it("connects Google to the account and removes it again", async () => {
    const s = await open("sign-in-methods");
    expect(await screen.findByText("Email and password", {}, WAIT)).toBeTruthy();
    await fireEvent.press(
      (await screen.findAllByRole("button", { name: "Connect" }, WAIT))[0] as never,
    );
    await waitFor(() => {
      expect(account(s)?.providers).toEqual(["google"]);
    }, WAIT);
    await press("Remove");
    await waitFor(() => {
      expect(account(s)?.providers).toEqual([]);
    }, WAIT);
  });

  it("won't remove the only way in, and says why", async () => {
    const s = store();
    s.update((d) => ({
      ...d,
      auth: {
        ...d.auth,
        accounts: d.auth.accounts.map((a) =>
          a.email === DEMO_EMAIL ? { ...a, password: "", providers: ["google"] } : a,
        ),
      },
    }));
    await open("sign-in-methods", s);
    await press("Remove");
    expect(
      await screen.findByText(
        "This is your only way in. Add another before removing it.",
        {},
        WAIT,
      ),
    ).toBeTruthy();
    expect(account(s)?.providers).toEqual(["google"]);
  });
});

describe("SET-02 The email and the birthday", () => {
  it("explains the two-step email change, and nothing changes yet", async () => {
    const s = await open("email");
    await type("New email", "not-an-email");
    await press("Send confirmation");
    expect(
      await screen.findByText("That doesn't look like an email address.", {}, WAIT),
    ).toBeTruthy();
    await type("New email", DEMO_EMAIL);
    await press("Send confirmation");
    expect(await screen.findByText("That's already your email.", {}, WAIT)).toBeTruthy();
    await type("New email", "new.address@example.test");
    await press("Send confirmation");
    expect(await screen.findByText(/Check your current inbox first/, {}, WAIT)).toBeTruthy();
    expect(account(s)?.email).toBe(DEMO_EMAIL);
  });

  it("keeps a new birthday 16 and over", async () => {
    const s = await open("birthday");
    await type("Your birthday, year", "2020");
    await press("Save");
    expect(await screen.findByText("Garnet is for people 16 and over.", {}, WAIT)).toBeTruthy();
    expect(account(s)?.birthDate).toBe("1998-03-12");
    await type("Your birthday, year", "1997");
    await press("Save");
    await waitFor(() => {
      expect(account(s)?.birthDate).toBe("1997-03-12");
    }, WAIT);
  });

  it("saves a home town from the profile, and clears it when emptied", async () => {
    const s = await open("profile");
    await type("Home town", "  Bahir Dar ");
    await press("Save");
    await waitFor(() => {
      expect(s.read().profiles.byUser[DEMO_ME_ID]?.homeCity).toBe("Bahir Dar");
    }, WAIT);
    await type("Home town", "   ");
    await press("Save");
    await waitFor(() => {
      expect(s.read().profiles.byUser[DEMO_ME_ID]?.homeCity).toBeNull();
    }, WAIT);
  });
});

describe("what waits for U-20 and U-23 (phase B9)", () => {
  it.each([
    ["export", /Exporting your data isn't available yet/, "Prepare export"],
    ["end-space", /Ending your space isn't available yet/, "Continue"],
    ["delete-account", /Deleting your account from the app isn't available yet/, "Continue"],
  ])("%s says so on the real server, and offers nothing to press", async (page, text, button) => {
    mockDataRights = false;
    await open(page);
    expect(await screen.findByText(text, {}, WAIT)).toBeTruthy();
    expect(screen.queryByRole("button", { name: button })).toBeNull();
  });
});
