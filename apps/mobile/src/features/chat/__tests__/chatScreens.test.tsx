/**
 * Chat (CHAT-01 to CHAT-09) per docs/design/prompts/08-chat.md (P-58): "Seen" only when both
 * said yes (U-35 open; asked once, nothing preselected); typing only when the partner shares it;
 * messages say "Sent", never "delivered" or "read"; nothing becomes a memory on its own.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ToastProvider } from "@/components/ui/Toast";
import { DEMO_ME_ID } from "@/data/fixtures/demo";
import { newProfile } from "@/data/fixtures/demoProfile";
import { MockStore } from "@/data/mock/MockStore";
import { createMockRepositories } from "@/data/mock/mockRepositories";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import type { ChatMessage } from "@/domain/chat";
import { MediaPlayerProvider } from "@/features/media/MediaPlayerContext";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { ConversationDetailsScreen } from "../ConversationDetailsScreen";
import { ConversationScreen } from "../ConversationScreen";
import { resetEmojiPreferences } from "@/features/emoji/emoji";

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
      partner: { ...s.profiles.partner, name: "Noah", side: "sapphire", timeZone: "Europe/London" },
    },
    // No simulated replies in tests; Noah has said yes to "Seen" and shares typing (demo).
    chat: {
      ...s.chat,
      autoReply: false,
      ...(customMessages === undefined ? {} : { messages: customMessages }),
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

const future = () => new Date(Date.now() + 60_000).toISOString();

describe("CHAT-01 conversation", () => {
  it("shows Noah, his local time, the pinned banner and the conversation", async () => {
    await renderWith(<ConversationScreen />, createTestStore());
    expect(await screen.findByText("Just the two of you 💜", {}, WAIT)).toBeTruthy();
    expect(screen.getAllByText("Noah").length).toBeGreaterThan(0);
    expect(screen.getByText(/in London$/)).toBeTruthy();
    expect(screen.getByText("1 pinned")).toBeTruthy();
    expect(screen.getByLabelText("Message")).toBeTruthy();
    expect(screen.queryByText(/delivered|read at|online|last seen/i)).toBeNull();
  });

  it("asks about Seen with nothing chosen, and shows no Seen until both said yes (U-35)", async () => {
    const store = createTestStore();
    store.update((s) => ({ ...s, chat: { ...s.chat, partnerSeenUpTo: future() } }));
    await renderWith(<ConversationScreen />, store);
    expect(await screen.findByText("👀 Show when you've seen messages?", {}, WAIT)).toBeTruthy();
    expect(store.read().chat.settings.readReceipts).toBeNull();
    expect(screen.queryByText("Seen")).toBeNull();
    expect(screen.getByText(/^Sent · /)).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Yes" }));
    expect(await screen.findByText("Seen", {}, WAIT)).toBeTruthy();
    expect(store.read().chat.settings.readReceipts).toBe(true);
  });

  it("never shows Seen when Noah said no, even after you said yes", async () => {
    const store = createTestStore();
    store.update((s) => ({
      ...s,
      chat: {
        ...s.chat,
        partnerSeenUpTo: future(),
        settings: { ...s.chat.settings, readReceipts: true },
        partner: { ...s.chat.partner, readReceipts: false },
      },
    }));
    await renderWith(<ConversationScreen />, store);
    expect(await screen.findByText(/^Sent · /, {}, WAIT)).toBeTruthy();
    expect(screen.queryByText("Seen")).toBeNull();
  });

  it("sends a message", async () => {
    const store = await renderWith(<ConversationScreen />, createTestStore());
    await fireEvent.changeText(
      await screen.findByLabelText("Message", {}, WAIT),
      "Hello from Addis",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Send" }));
    await waitFor(() => {
      expect(store.read().chat.messages.at(-1)?.text).toBe("Hello from Addis");
    }, WAIT);
    expect(await screen.findByText("Hello from Addis", {}, WAIT)).toBeTruthy();
  });

  it("shows typing only when Noah shares it", async () => {
    const store = createTestStore();
    store.update((s) => ({ ...s, chat: { ...s.chat, partnerTyping: true } }));
    await renderWith(<ConversationScreen />, store);
    expect(await screen.findByText("typing…", {}, WAIT)).toBeTruthy();
    store.update((s) => ({
      ...s,
      chat: { ...s.chat, partner: { ...s.chat.partner, typingIndicators: false } },
    }));
    await waitFor(() => {
      expect(screen.queryByText("typing…")).toBeNull();
    }, WAIT);
  });
});

describe("CHAT-08 uploads (P-61)", () => {
  it("shows a photo's upload progress, then says Sent", async () => {
    const store = createTestStore();
    await renderWith(<ConversationScreen />, store);
    await screen.findByText("Just the two of you 💜", {}, WAIT);
    await createMockRepositories(store).chat.sendMessage({
      text: "",
      media: { type: "photo", art: "sea" },
    });
    expect(await screen.findByText(/^Uploading \d+%$/, {}, WAIT)).toBeTruthy();
    await waitFor(
      () => {
        expect(store.read().chat.messages.at(-1)?.status).toBe("sent");
      },
      { timeout: 15_000 },
    );
    expect(await screen.findByText(/^Sent · /, {}, WAIT)).toBeTruthy();
    expect(store.read().chat.messages.at(-1)?.uploadProgress).toBeUndefined();
  });

  it("stops part-way when an upload fails, and starts again on retry", async () => {
    const store = createTestStore();
    store.update((s) => ({ ...s, chat: { ...s.chat, failNextUpload: true } }));
    await renderWith(<ConversationScreen />, store);
    await screen.findByText("Just the two of you 💜", {}, WAIT);
    await createMockRepositories(store).chat.sendMessage({
      text: "",
      media: { type: "photo", art: "sea" },
    });
    const notSent = await screen.findAllByRole(
      "button",
      { name: "Not sent. Try again" },
      { timeout: 15_000 },
    );
    await fireEvent.press(notSent[0]!);
    await waitFor(() => {
      expect(store.read().chat.messages.at(-1)?.status).not.toBe("failed");
    }, WAIT);
  });
});

describe("CHAT-02 to CHAT-04 message menu", () => {
  const mine = (id: string, text: string): ChatMessage => ({
    id,
    senderId: DEMO_ME_ID,
    text,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    editedAt: null,
    status: "sent",
    pinned: false,
    pinnedAt: null,
    replyTo: null,
    reactions: [],
  });

  it("offers reactions and actions, and deletes for everyone", async () => {
    const store = await renderWith(
      <ConversationScreen />,
      createTestStore([mine("m1", "Our song")]),
    );
    await fireEvent(await screen.findByLabelText(/^You: Our song/, {}, WAIT), "longPress");
    // Telegram-style (P-63): reactions above the held message, the actions in a menu below.
    expect(await screen.findByRole("button", { name: "React ❤️" }, WAIT)).toBeTruthy();
    expect(screen.getByRole("button", { name: "More reactions" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Reply" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Copy" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeTruthy();
    await fireEvent.press(screen.getByRole("menuitem", { name: "Delete" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Delete for everyone" }, WAIT));
    const confirm = await screen.findAllByRole("button", { name: "Delete for everyone" }, WAIT);
    // The last one is the confirm button in the dialog.
    await fireEvent.press(confirm[confirm.length - 1]!);
    expect(await screen.findByText("This message was removed.", {}, WAIT)).toBeTruthy();
    expect(store.read().chat.messages[0]?.deletedForEveryone).toBe(true);
  });
});

describe("Expressions (P-62)", () => {
  // Frequently Used lives in memory on the device; start each test from the defaults.
  beforeEach(resetEmojiPreferences);
  const theirs = (id: string, text: string): ChatMessage => ({
    id,
    senderId: "demo-user-sapphire",
    text,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    editedAt: null,
    status: "sent",
    pinned: false,
    pinnedAt: null,
    replyTo: null,
    reactions: [],
  });

  it("sends a character sticker from the panel", async () => {
    const store = await renderWith(<ConversationScreen />, createTestStore());
    await fireEvent.press(await screen.findByRole("button", { name: "Stickers and emoji" }, WAIT));
    // The panel opens on the emoji board, like the iPhone; stickers are the second tab.
    expect(await screen.findByLabelText("Search Emoji", {}, WAIT)).toBeTruthy();
    await fireEvent.press(screen.getByRole("radio", { name: "Stickers" }));
    const stickers = await screen.findAllByRole("button", { name: /^Send ruby .* sticker$/ }, WAIT);
    await fireEvent.press(stickers[0]!);
    await waitFor(() => {
      expect(store.read().chat.messages.at(-1)?.sticker?.character).toBe("ruby");
    }, WAIT);
  });

  it("loves a message on a double tap, once", async () => {
    const store = await renderWith(
      <ConversationScreen />,
      createTestStore([theirs("t1", "Look at the moon")]),
    );
    const bubble = await screen.findByLabelText(/^Them: Look at the moon/, {}, WAIT);
    await fireEvent.press(bubble);
    await fireEvent.press(bubble);
    await waitFor(() => {
      expect(store.read().chat.messages[0]?.reactions).toEqual([
        { emoji: "❤️", count: 1, reactedByMe: true },
      ]);
    }, WAIT);
  });

  it("adds a quick emoji to the message", async () => {
    await renderWith(<ConversationScreen />, createTestStore());
    const input = await screen.findByLabelText("Message", {}, WAIT);
    await fireEvent(input, "focus");
    await fireEvent.press(await screen.findByRole("button", { name: "Add 🥰" }, WAIT));
    expect(screen.getByLabelText("Message").props.value).toBe("🥰");
  });

  it("types from the full emoji board and deletes a whole emoji (P-63)", async () => {
    await renderWith(<ConversationScreen />, createTestStore());
    await fireEvent.press(await screen.findByRole("button", { name: "Stickers and emoji" }, WAIT));
    await fireEvent.press(await screen.findByRole("button", { name: "grinning face" }, WAIT));
    await fireEvent.press(screen.getByRole("button", { name: "grinning face" }));
    expect(screen.getByLabelText("Message").props.value).toBe("😀😀");
    await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByLabelText("Message").props.value).toBe("😀");
    // Search finds emoji by everyday words, not only Unicode names.
    await fireEvent.changeText(screen.getByLabelText("Search Emoji"), "coffee");
    await fireEvent.press(await screen.findByRole("button", { name: "hot beverage" }, WAIT));
    expect(screen.getByLabelText("Message").props.value).toBe("😀☕");
  });

  it("reacts with any emoji from the hold menu's full board (P-63)", async () => {
    const store = await renderWith(
      <ConversationScreen />,
      createTestStore([theirs("t2", "Goodnight")]),
    );
    await fireEvent(await screen.findByLabelText(/^Them: Goodnight/, {}, WAIT), "longPress");
    await fireEvent.press(await screen.findByRole("button", { name: "More reactions" }, WAIT));
    await fireEvent.press(await screen.findByRole("button", { name: "grinning face" }, WAIT));
    await waitFor(() => {
      expect(store.read().chat.messages[0]?.reactions).toEqual([
        { emoji: "😀", count: 1, reactedByMe: true },
      ]);
    }, WAIT);
  });
});

describe("CHAT-09 details", () => {
  it("shows each person's own settings; Seen works only when both turn it on", async () => {
    const store = await renderWith(<ConversationDetailsScreen />, createTestStore());
    expect(await screen.findByText("Just for you", {}, WAIT)).toBeTruthy();
    expect(screen.getByText(/Not chosen yet/)).toBeTruthy();
    await fireEvent(screen.getByLabelText('Show "Seen"'), "valueChange", true);
    await waitFor(() => {
      expect(store.read().chat.settings.readReceipts).toBe(true);
    }, WAIT);
    expect(screen.getByLabelText("Show when I'm typing")).toBeTruthy();
  });
});
