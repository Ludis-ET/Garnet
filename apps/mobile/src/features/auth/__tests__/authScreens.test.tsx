/**
 * AUTH-01 to AUTH-08 render and behave per docs/design/prompts/01 (Daylight Glass, P-48),
 * including the privacy rules:
 * no account confirmation, no hint which sign-in field was wrong, no private content behind an
 * expired session. Navigation is mocked; data comes from a MockStore with no latency.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import type * as ReactNative from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "@/components/ui/Toast";
import { DEMO_EMAIL, DEMO_RESET_TOKENS } from "@/data/fixtures/demoAuth";
import { DEMO_MAX_ATTEMPTS } from "@/data/mock/mockAuth";
import { MockStore } from "@/data/mock/MockStore";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { CreateAccountScreen } from "../screens/CreateAccountScreen";
import { ForgotPasswordScreen, RESET_SENT_MESSAGE } from "../screens/ForgotPasswordScreen";
import { LINK_COPY, LINK_TITLE, ResetPasswordScreen } from "../screens/ResetPasswordScreen";
import { SessionExpiredScreen } from "../screens/SessionExpiredScreen";
import { SignInScreen } from "../screens/SignInScreen";
import { VerifyEmailScreen } from "../screens/VerifyEmailScreen";
import { WelcomeScreen } from "../screens/WelcomeScreen";
import { SignOutDialog, signOutBody } from "../SignOutDialog";

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};
let mockParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
  Redirect: ({ href }: { href: string }) => {
    const { Text: RNText } = jest.requireActual<typeof ReactNative>("react-native");
    return <RNText>{`redirect:${href}`}</RNText>;
  },
}));

const metrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

async function renderWith(ui: ReactElement, store = new MockStore({ latencyMs: 0 })) {
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

const type = async (label: string, text: string) => {
  await fireEvent.changeText(await screen.findByLabelText(label, {}, WAIT), text);
};
const press = async (name: string | RegExp) => {
  await fireEvent.press(await screen.findByRole("button", { name }, WAIT));
};

jest.setTimeout(30_000);
const WAIT = { timeout: 8000 };

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
});

describe("AUTH-01 Welcome", () => {
  it("shows the wordmark, the promise, both actions and the privacy note", async () => {
    await renderWith(<WelcomeScreen />);
    expect(await screen.findByRole("header", { name: "Garnet" }, WAIT)).toBeTruthy();
    expect(await screen.findByText(/Two lives\./, {}, WAIT)).toBeTruthy();
    expect(await screen.findByText("One space.", {}, WAIT)).toBeTruthy();
    expect(
      await screen.findByText("A private space for just the two of you.", {}, WAIT),
    ).toBeTruthy();
    await press("Get started");
    expect(mockRouter.push).toHaveBeenCalledWith("/create-account");
    await press("I already have an account");
    expect(mockRouter.push).toHaveBeenCalledWith("/sign-in");
  });

  it("never shows a days-apart counter", async () => {
    await renderWith(<WelcomeScreen />);
    expect(screen.queryByText(/days? apart/i)).toBeNull();
  });
});

describe("AUTH-02 Create account (three steps, P-48)", () => {
  async function toPasswordStep(name = "Noah", email = "noah@example.test") {
    await type("Display name", name);
    await press("Continue");
    await type("Email", email);
    await press("Continue");
    await screen.findByLabelText("Password", {}, WAIT);
  }

  it("waits for an answer before Continue, and announces the step", async () => {
    await renderWith(<CreateAccountScreen />);
    expect(await screen.findByLabelText("Step 1 of 3", {}, WAIT)).toBeTruthy();
    expect(
      await screen.findByRole("button", { name: "Continue", disabled: true }, WAIT),
    ).toBeTruthy();
    await type("Display name", "   ");
    await press("Continue");
    expect(await screen.findByText("Please fill this in.", {}, WAIT)).toBeTruthy();
    expect(screen.getByLabelText("Step 1 of 3")).toBeTruthy();
  });

  it("explains a malformed email, short and mismatched passwords, and keeps what was typed", async () => {
    await renderWith(<CreateAccountScreen />);
    await type("Display name", "Noah");
    await press("Continue");
    expect(await screen.findByLabelText("Step 2 of 3", {}, WAIT)).toBeTruthy();
    await type("Email", "noah@");
    await press("Continue");
    expect(
      await screen.findByText("That doesn't look like an email address.", {}, WAIT),
    ).toBeTruthy();
    await type("Email", "noah@example.test");
    await press("Continue");
    await type("Password", "short");
    await type("Confirm password", "different");
    await press("Create account");
    expect(await screen.findByText("Use at least 12 characters.", {}, WAIT)).toBeTruthy();
    expect(await screen.findByText("These passwords don't match.", {}, WAIT)).toBeTruthy();
    expect(screen.getByLabelText("At least 12 characters, not met yet")).toBeTruthy();
    // Back keeps every answer.
    await press("Back");
    expect((await screen.findByLabelText("Email", {}, WAIT)).props.value).toBe("noah@example.test");
    await press("Back");
    expect((await screen.findByLabelText("Display name", {}, WAIT)).props.value).toBe("Noah");
  });

  it("ticks the live checklist and creates the account", async () => {
    await renderWith(<CreateAccountScreen />);
    await toPasswordStep();
    await type("Password", "a long passphrase");
    await type("Confirm password", "a long passphrase");
    expect(await screen.findByLabelText("At least 12 characters, met", {}, WAIT)).toBeTruthy();
    expect(screen.getByLabelText("Passwords match, met")).toBeTruthy();
    await press("Create account");
    expect(mockRouter.replace).toHaveBeenCalledWith("/verify-email");
  });

  it("answers an existing email with neutral copy only, back on the email step", async () => {
    await renderWith(<CreateAccountScreen />);
    await toPasswordStep("Someone", DEMO_EMAIL);
    await type("Password", "a long passphrase");
    await type("Confirm password", "a long passphrase");
    await press("Create account");
    expect(
      await screen.findByText(
        "An account may already exist for this email. Try signing in.",
        {},
        WAIT,
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText("Step 2 of 3")).toBeTruthy();
    expect((await screen.findByLabelText("Email", {}, WAIT)).props.value).toBe(DEMO_EMAIL);
    expect(screen.queryByText(/already registered|is taken|exists\./i)).toBeNull();
  });

  it("keeps input and shows a calm toast when the service fails", async () => {
    const store = new MockStore({ latencyMs: 0, failCalls: true });
    await renderWith(<CreateAccountScreen />, store);
    await toPasswordStep();
    await type("Password", "a long passphrase");
    await type("Confirm password", "a long passphrase");
    await press("Create account");
    expect(await screen.findByText("That didn't work. Try again.", {}, WAIT)).toBeTruthy();
    expect((await screen.findByLabelText("Password", {}, WAIT)).props.value).toBe(
      "a long passphrase",
    );
  });
});

describe("AUTH-03 Sign in", () => {
  it("signs the demo account in", async () => {
    await renderWith(<SignInScreen />);
    await press("Fill the demo account (prototype)");
    await press("Sign in");
    expect(mockRouter.replace).toHaveBeenCalledWith("/");
  });

  it("gives one generic error that never names the wrong field", async () => {
    await renderWith(<SignInScreen />);
    await type("Email", DEMO_EMAIL);
    await type("Password", "not it at all");
    await press("Sign in");
    expect(await screen.findByText("Those details don't match. Try again.", {}, WAIT)).toBeTruthy();
    expect(
      screen.queryByText(/password is (wrong|incorrect)|no account|unknown email/i),
    ).toBeNull();
  });

  it("asks the person to wait after repeated failures", async () => {
    await renderWith(<SignInScreen />);
    await type("Email", DEMO_EMAIL);
    await type("Password", "not it at all");
    for (let i = 0; i < DEMO_MAX_ATTEMPTS; i++) await press(/^Sign in$|^Try again in/);
    expect(
      await screen.findByText("Please wait a moment before trying again.", {}, WAIT),
    ).toBeTruthy();
    expect(await screen.findByRole("button", { name: /^Try again in 0:\d\d$/ }, WAIT)).toBeTruthy();
  });
});

describe("AUTH-04 Verify email", () => {
  async function verifying() {
    const store = new MockStore({ latencyMs: 0 });
    store.update((s) => ({
      ...s,
      auth: {
        ...s.auth,
        accounts: [
          ...s.auth.accounts,
          {
            userId: "u2",
            displayName: "Noah",
            email: "noah@example.test",
            password: "a long passphrase",
            verified: false,
          },
        ],
        status: { kind: "verifying", email: "noah@example.test", verified: false },
      },
    }));
    return renderWith(<VerifyEmailScreen />, store);
  }

  it("shows only the masked address and labels the email as simulated", async () => {
    await verifying();
    expect(await screen.findByText("n***@example.test", {}, WAIT)).toBeTruthy();
    expect(screen.queryByText(/noah@example\.test/)).toBeNull();
    expect(await screen.findByText("Simulated — no email is sent", {}, WAIT)).toBeTruthy();
  });

  it("verifies through the demo link and continues", async () => {
    await verifying();
    await press("Open email preview (demo)");
    expect(await screen.findByRole("header", { name: "Email verified" }, WAIT)).toBeTruthy();
    await press("Continue");
    expect(mockRouter.replace).toHaveBeenCalledWith("/");
  });

  it("explains an expired link, and resends with a cooldown", async () => {
    const store = await verifying();
    await act(() => {
      store.update((s) => ({ ...s, auth: { ...s.auth, nextVerificationLink: "expired" } }));
    });
    await press("Open email preview (demo)");
    expect(
      await screen.findByText("This link has expired. We can send a new one.", {}, WAIT),
    ).toBeTruthy();
    await press("Resend email");
    expect(await screen.findByText("Sent again.", {}, WAIT)).toBeTruthy();
    expect(await screen.findByRole("button", { name: /^Resend in 0:\d\d$/ }, WAIT)).toBeTruthy();
  });
});

describe("AUTH-05 Forgot password", () => {
  // Identical outcome for a known and an unknown email: same message, nothing else differs.
  it.each([
    ["an existing account", DEMO_EMAIL],
    ["no account", "nobody@example.test"],
  ])("shows the one neutral message for %s", async (_, email) => {
    await renderWith(<ForgotPasswordScreen />);
    await type("Email", email);
    await press("Send reset link");
    expect(await screen.findByText(RESET_SENT_MESSAGE, {}, WAIT)).toBeTruthy();
    expect(screen.getByText("Simulated — no email is sent")).toBeTruthy();
    expect(screen.queryByText(/no account|not found|we found/i)).toBeNull();
  });
});

describe("AUTH-06 Reset password", () => {
  it.each(["expired", "used", "invalid"] as const)(
    "explains the %s link calmly and offers a new one",
    async (kind) => {
      mockParams = { token: DEMO_RESET_TOKENS[kind] };
      await renderWith(<ResetPasswordScreen />);
      expect(await screen.findByRole("header", { name: LINK_TITLE[kind] }, WAIT)).toBeTruthy();
      expect(screen.getByText(LINK_COPY[kind])).toBeTruthy();
      await press("Request a new link");
      expect(mockRouter.replace).toHaveBeenCalledWith("/forgot-password");
    },
  );

  it("saves a valid new password and then asks to sign in", async () => {
    mockParams = { token: DEMO_RESET_TOKENS.valid };
    await renderWith(<ResetPasswordScreen />);
    await screen.findByLabelText("New password", {}, WAIT);
    expect(
      await screen.findByText("This signs you out on your other devices.", {}, WAIT),
    ).toBeTruthy();
    await type("New password", "a brand new passphrase");
    await type("Confirm new password", "a brand new passphrase");
    await press("Save new password");
    expect(await screen.findByRole("header", { name: "Password updated" }, WAIT)).toBeTruthy();
  });
});

describe("AUTH-07 Session expired", () => {
  it("explains calmly and shows nothing private", async () => {
    await renderWith(<SessionExpiredScreen />);
    expect(await screen.findByRole("header", { name: "Please sign in again" }, WAIT)).toBeTruthy();
    expect(
      await screen.findByText("For your privacy, you've been signed out on this device.", {}, WAIT),
    ).toBeTruthy();
    for (const privateText of [/Selam/, /Noah/, /letter/i, /draft body/i]) {
      expect(screen.queryByText(privateText)).toBeNull();
    }
  });
});

describe("AUTH-08 Sign out", () => {
  it("reassures that nothing is lost", () => {
    expect(signOutBody(0)).toBe("Drafts saved on this device stay here until you sign back in.");
    expect(signOutBody(1)).toBe("You have 1 moment waiting to send. They'll stay on this device.");
    expect(signOutBody(2)).toBe("You have 2 moments waiting to send. They'll stay on this device.");
  });

  it("asks in a sheet, and signs out to the welcome screen", async () => {
    const onClose = jest.fn();
    await renderWith(<SignOutDialog visible onClose={onClose} />);
    expect(await screen.findByRole("header", { name: "Sign out?" }, WAIT)).toBeTruthy();
    await press("Sign out");
    expect(mockRouter.replace).toHaveBeenCalledWith("/welcome");
    expect(onClose).toHaveBeenCalled();
  });
});
