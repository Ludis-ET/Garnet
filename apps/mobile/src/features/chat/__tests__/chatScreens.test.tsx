/**
 * Tests for Chat screens and states (CHAT-00 to CHAT-09).
 * Specs: docs/design/prompts/08-chat.md.
 * Rules: U-35 read receipts off by default; private drafts stay private (§5); Daylight Glass.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "@/components/ui/Toast";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { newProfile } from "@/data/fixtures/demoProfile";
import { MockStore } from "@/data/mock/MockStore";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import type { ChatMessage } from "@/domain/chat";
import { MediaPlayerProvider } from "@/features/media/MediaPlayerContext";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { ConversationDetailsScreen } from "../ConversationDetailsScreen";
import { ConversationListScreen } from "../ConversationListScreen";
import { ConversationScreen } from "../ConversationScreen";

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock("expo-router", () => ({
  get router() {
    return mockRouter;
  },
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
  usePathname: () => "/us/chat",
}));

const metrics = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 59, left: 0, right: 0, bottom: 34 },
};

const WAIT = { timeout: 8000 };
jest.setTimeout(30_000);

function createTestStore(customMessages?: ChatMessage[]) {
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
    ...(customMessages !== undefined
      ? {
          chat: {
            ...s.chat,
            messages: customMessages,
          },
        }
      : {}),
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
            <ToastProvider>
              <MediaPlayerProvider>{ui}</MediaPlayerProvider>
            </ToastProvider>
          </ThemeProvider>
        </RepositoryProvider>
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  return store;
}

describe("CHAT-00 · Conversation list", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders single conversation row for Noah and shortcuts", async () => {
    const store = createTestStore();
    await renderWith(<ConversationListScreen />, store);

    // Noah row
    expect(await screen.findByText("Noah", {}, WAIT)).toBeTruthy();
    expect(screen.getByText("Messages")).toBeTruthy();

    // Shortcuts beneath
    expect(screen.getByText("Pinned")).toBeTruthy();
    expect(screen.getByText("Shared media")).toBeTruthy();
    expect(screen.getByText("Search messages")).toBeTruthy();
  });

  it("renders empty state when there are no messages", async () => {
    const store = createTestStore([]);
    await renderWith(<ConversationListScreen />, store);

    expect(await screen.findByText("Say hello 💜", {}, WAIT)).toBeTruthy();
    expect(screen.getByText("Open chat")).toBeTruthy();
  });
});

describe("CHAT-01 · Conversation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders header, pinned banner, message bubbles and composer", async () => {
    const store = createTestStore();
    await renderWith(<ConversationScreen />, store);

    // Header info
    expect(await screen.findByText("18:42 in London", {}, WAIT)).toBeTruthy();

    // Pinned banner
    expect(screen.getByText("1 pinned")).toBeTruthy();

    // Messages in list
    expect(screen.getByText("Good morning Selam! Hope you slept well in Addis ✨")).toBeTruthy();
    expect(
      screen.getByText("Good morning my love! Just finished traditional coffee here ☕"),
    ).toBeTruthy();

    // Composer controls
    expect(screen.getByLabelText("Message input field")).toBeTruthy();
    expect(screen.getByLabelText("Share media")).toBeTruthy();
    expect(screen.getByLabelText("Record voice note")).toBeTruthy();
  });

  it("sends a new text message", async () => {
    const store = createTestStore();
    await renderWith(<ConversationScreen />, store);

    const input = await screen.findByLabelText("Message input field", {}, WAIT);
    await fireEvent.changeText(input, "Can't wait to see you soon!");

    const sendBtn = await screen.findByLabelText("Send message", {}, WAIT);
    await fireEvent.press(sendBtn);

    expect(await screen.findByText("Can't wait to see you soon!", {}, WAIT)).toBeTruthy();
  });

  it("renders empty state when conversation is empty", async () => {
    const store = createTestStore([]);
    await renderWith(<ConversationScreen />, store);

    expect(await screen.findByText("Say hello 💜", {}, WAIT)).toBeTruthy();
  });
});

describe("CHAT-02, CHAT-03, CHAT-04 · Message Menu, Edit, and Delete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens context menu with reaction palette on long press", async () => {
    const store = createTestStore();
    await renderWith(<ConversationScreen />, store);

    const bubble = await screen.findByRole("button", { name: /Good morning my love/i }, WAIT);
    await fireEvent(bubble, "onLongPress");

    // Reaction palette contains soft emoji
    expect(await screen.findByLabelText("React with ❤️", {}, WAIT)).toBeTruthy();
    expect(screen.getByLabelText("React with 💜")).toBeTruthy();

    // Menu options
    expect(screen.getByText("Reply")).toBeTruthy();
    expect(screen.getByText("Pin message")).toBeTruthy();
    expect(screen.getByText("Details")).toBeTruthy();
    expect(screen.getByText("Delete")).toBeTruthy();
  });

  it("handles delete for everyone resulting in removed notice", async () => {
    const store = createTestStore();
    await renderWith(<ConversationScreen />, store);

    const bubble = await screen.findByRole("button", { name: /Good morning my love/i }, WAIT);
    await fireEvent(bubble, "onLongPress");

    const deleteBtn = await screen.findByText("Delete", {}, WAIT);
    await fireEvent.press(deleteBtn);

    // Delete dialog appears - choose Delete for everyone (choice step)
    const delEveryoneChoice = await screen.findByRole(
      "button",
      { name: "Delete for everyone" },
      WAIT,
    );
    await fireEvent.press(delEveryoneChoice);

    // Confirmation dialog step ("Delete for everyone?" header with confirmation button)
    expect(await screen.findByRole("header", { name: "Delete for everyone?" }, WAIT)).toBeTruthy();
    const confirmBtn = await screen.findByRole("button", { name: "Delete for everyone" }, WAIT);
    await fireEvent.press(confirmBtn);

    expect(await screen.findByText("This message was removed.", {}, WAIT)).toBeTruthy();
  });
});

describe("CHAT-07 · Message Details", () => {
  it("displays sent time in Addis Ababa and London with U-35 read status", async () => {
    const store = createTestStore();
    await renderWith(<ConversationScreen />, store);

    const bubble = await screen.findByRole(
      "button",
      { name: /Hearing your voice makes my whole day brighter/i },
      WAIT,
    );
    await fireEvent(bubble, "onLongPress");

    const detailsBtn = await screen.findByText("Details", {}, WAIT);
    await fireEvent.press(detailsBtn);

    // Sheet titles & content
    expect(await screen.findByText("Message details", {}, WAIT)).toBeTruthy();
    expect(screen.getByText(/Addis Ababa/)).toBeTruthy();
    expect(screen.getAllByText(/London/).length).toBeGreaterThan(0);
    // U-35 read receipts off by default
    expect(screen.getByText("Read receipts are off (U-35)")).toBeTruthy();
  });
});

describe("CHAT-09 · Conversation details and shared media", () => {
  it("renders details screen with Noah profile, preferences and media grid", async () => {
    const store = createTestStore();
    await renderWith(<ConversationDetailsScreen />, store);

    expect(await screen.findByText("Noah", {}, WAIT)).toBeTruthy();
    expect(screen.getByText("Shared media")).toBeTruthy();
    expect(screen.getByText("Pinned messages")).toBeTruthy();
    expect(screen.getByText("Search in conversation")).toBeTruthy();
    expect(screen.getByText("Preferences")).toBeTruthy();
    expect(screen.getByText("Read receipts")).toBeTruthy();
  });
});

describe("Privacy Regression (§5)", () => {
  it("never displays private letter drafts in chat", async () => {
    const store = createTestStore();
    await renderWith(<ConversationScreen />, store);

    // The draft letter from demo state: "My unfinished draft."
    expect(screen.queryByText("My unfinished draft.")).toBeNull();
  });
});
