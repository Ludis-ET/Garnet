import {
  EMAIL_TEMPLATES,
  linkLanding,
  plainTextEmail,
  renderEmail,
  type LinkState,
} from "./emails";
import {
  GENERIC_NOTIFICATION,
  NOTIFICATION_CATALOGUE,
  NOTIFY_GROUPS,
  renderNotification,
  type NotifContext,
} from "./notifications";

const ctx: NotifContext = {
  sender: "Noah",
  partner: "Noah",
  messagePreview: "Can't wait to see you",
  safePrompt: "Open when you miss me",
  safeTitle: "A little something",
  eventTitle: "Our anniversary",
  when: "Tomorrow, 18:00 for you",
  eventType: "anniversary",
};

// docs/ux/voice-and-copy.md: banned in notification copy.
const BANNED = /\b(broken|lost|failed|missed|ignored|seen|read|last chance)\b|let .* down/i;

describe("notification catalogue (NOTIF-03)", () => {
  it("covers every catalogue category, each in a settings group", () => {
    expect(NOTIFICATION_CATALOGUE).toHaveLength(20);
    const groups = new Set(NOTIFY_GROUPS.map((g) => g.id));
    for (const n of NOTIFICATION_CATALOGUE) expect(groups.has(n.group)).toBe(true);
  });

  it("reads exactly the same in generic mode for every category and urgency (P-17, §5)", () => {
    for (const n of NOTIFICATION_CATALOGUE) {
      expect(renderNotification(n, "generic", ctx)).toEqual(GENERIC_NOTIFICATION);
    }
  });

  it("shows only sender and category in that mode: never message text or a letter prompt", () => {
    for (const n of NOTIFICATION_CATALOGUE) {
      const r = renderNotification(n, "sender", ctx);
      const all = `${r.title} ${r.body}`;
      expect(all).not.toContain("Can't wait");
      expect(all).not.toContain("miss me");
      expect(all).not.toContain("A little something");
    }
    const thought = NOTIFICATION_CATALOGUE.find((n) => n.id === "thought");
    if (thought === undefined) throw new Error("missing");
    expect(renderNotification(thought, "sender", ctx)).toEqual({
      title: "Garnet",
      body: "Noah · Thought",
    });
  });

  it("never uses banned words in any mode", () => {
    for (const n of NOTIFICATION_CATALOGUE) {
      for (const mode of ["generic", "sender", "full"] as const) {
        const r = renderNotification(n, mode, ctx);
        expect(`${r.title} ${r.body}`).not.toMatch(BANNED);
      }
    }
  });

  it("keeps account details in the app even with full previews", () => {
    const security = NOTIFICATION_CATALOGUE.find((n) => n.id === "security");
    if (security === undefined) throw new Error("missing");
    expect(renderNotification(security, "full", ctx)).toEqual({
      title: "A change to your account",
      body: "Review this activity in Garnet.",
    });
  });
});

describe("email templates (EMAIL-03 to EMAIL-13)", () => {
  it("has the eleven templates with one call to action each", () => {
    expect(EMAIL_TEMPLATES.map((t) => t.code)).toEqual(
      Array.from({ length: 11 }, (_, i) => `EMAIL-${String(i + 3).padStart(2, "0")}`),
    );
  });

  it("never carries a password, a letter's words or signal details", () => {
    for (const t of EMAIL_TEMPLATES) {
      const text = plainTextEmail(renderEmail(t));
      expect(text).not.toMatch(
        /your password is|temporary password|dear noah|missing you|support signal/i,
      );
      expect(text).toContain(t.cta);
      expect(text).toContain("https://garnet.example/l/");
    }
  });

  it("explains every link state", () => {
    const states: LinkState[] = ["valid", "expired", "used", "invalid", "signedOut"];
    const titles = states.map((s) => linkLanding(s).title);
    expect(new Set(titles).size).toBe(states.length);
  });
});
