/**
 * The notification catalogue (prompt 17, NOTIF-03; spec A5) and how each one reads on a lock
 * screen under the recipient's own preview setting (SET-07). Everything here is a preview in
 * Phase 2: nothing is sent. Generic is the default and reads the same for every category and
 * urgency (P-17, §5); no sealed letter or surprise contents, drafts or signal details ever appear.
 */

export type PreviewMode = "generic" | "sender" | "full";

export type NotifyGroup =
  "messages" | "signals" | "days" | "letters" | "events" | "account" | "reminders";

export type NotifyMode = "immediate" | "quiet" | "scheduled" | "off";

export interface NotifSpec {
  id: string;
  group: NotifyGroup;
  /** The category name ("Thought"), used by "Sender and category". */
  label: string;
  emoji: string;
  /** Catalogue copy; placeholders in braces. */
  title: string;
  body: string;
  /** The rule the copy must keep (shown in the preview lab). */
  rule: string;
}

export const NOTIFY_GROUPS: readonly { id: NotifyGroup; title: string; detail: string }[] = [
  { id: "messages", title: "Messages", detail: "New messages, replies and reactions" },
  { id: "signals", title: "Emotional signals", detail: "Thoughts, missing you and support" },
  { id: "days", title: "Days and memories", detail: "Your day ready to revisit, media ready" },
  { id: "letters", title: "Open When and surprises", detail: "A letter or surprise is ready" },
  { id: "events", title: "Events", detail: "Dates you both chose to remember" },
  { id: "account", title: "Account and security", detail: "Joining, invitations and changes" },
  { id: "reminders", title: "Optional reminders", detail: "Gentle, rare and easy to turn off" },
];

export const NOTIFICATION_CATALOGUE: readonly NotifSpec[] = [
  {
    id: "thought",
    group: "signals",
    label: "Thought",
    emoji: "💭",
    title: "A little thought from {sender}.",
    body: "A little thought from {sender}.",
    rule: "Note only if included and previews allow",
  },
  {
    id: "missing-you",
    group: "signals",
    label: "Missing you",
    emoji: "🫶",
    title: "A little closer, even from afar",
    body: "{sender} is missing you.",
    rule: "No urgency; can be muted",
  },
  {
    id: "need-you",
    group: "signals",
    label: "Support",
    emoji: "🫂",
    title: "A message from {sender}",
    body: "They sent you a support signal.",
    rule: "No escalation",
  },
  {
    id: "need-talk",
    group: "signals",
    label: "Talk",
    emoji: "📞",
    title: "When you have a moment",
    body: "{sender} would like to talk.",
    rule: "No emergency implication",
  },
  {
    id: "check-on-me",
    group: "signals",
    label: "Check-in",
    emoji: "🌙",
    title: "A gentle check-in request",
    body: "{sender} asked you to check in.",
    rule: "Quiet hours, never repeated",
  },
  {
    id: "cant-talk",
    group: "signals",
    label: "Note",
    emoji: "⏳",
    title: "A note from {sender}",
    body: "{sender} can't talk just now.",
    rule: "No rejection framing",
  },
  {
    id: "okay-now",
    group: "signals",
    label: "Reassurance",
    emoji: "🌤️",
    title: "A little reassurance",
    body: "{sender} let you know they're okay.",
    rule: "Details hidden on the lock screen",
  },
  {
    id: "chat-message",
    group: "messages",
    label: "Message",
    emoji: "💬",
    title: "Message from {sender}",
    body: "{message_preview}",
    rule: "The preview setting controls the body",
  },
  {
    id: "reply-reaction",
    group: "messages",
    label: "Reaction",
    emoji: "❤️",
    title: "A response to your message",
    body: "{sender} replied.",
    rule: "Can combine or mute",
  },
  {
    id: "day-reveal",
    group: "days",
    label: "Your day",
    emoji: "🌅",
    title: "Your day is ready to revisit",
    body: "Your shared day is ready.",
    rule: "No countdown or guilt",
  },
  {
    id: "media-ready",
    group: "days",
    label: "Media",
    emoji: "🖼️",
    title: "Your memory is ready",
    body: "A media item finished processing.",
    rule: "Avoid noise",
  },
  {
    id: "open-when",
    group: "letters",
    label: "Letter",
    emoji: "💌",
    title: "A letter is ready when you are",
    body: "{safe_prompt_or_generic}",
    rule: "Never the letter itself",
  },
  {
    id: "surprise",
    group: "letters",
    label: "Surprise",
    emoji: "🎁",
    title: "Something for you",
    body: "{safe_title_or_generic}",
    rule: "The sender's secrecy choice",
  },
  {
    id: "event-reminder",
    group: "events",
    label: "Event",
    emoji: "📅",
    title: "Coming up: {event_title}",
    body: "{date_time_context}",
    rule: "In each person's own time zone",
  },
  {
    id: "birthday",
    group: "events",
    label: "Special day",
    emoji: "🎂",
    title: "A day that matters to you both",
    body: "Your {event_type} is today.",
    rule: "Per-event preference",
  },
  {
    id: "partner-joined",
    group: "account",
    label: "Joined",
    emoji: "💜",
    title: "You're connected",
    body: "{partner} joined your space.",
    rule: "Only after they accept",
  },
  {
    id: "invitation",
    group: "account",
    label: "Invitation",
    emoji: "✉️",
    title: "You've been invited to a shared space",
    body: "Open Garnet to review the invitation.",
    rule: "Never the invitation code",
  },
  {
    id: "security",
    group: "account",
    label: "Account",
    emoji: "🔒",
    title: "A change to your account",
    body: "Review this activity in Garnet.",
    rule: "Details stay in the app",
  },
  {
    id: "service",
    group: "account",
    label: "Update",
    emoji: "📣",
    title: "A Garnet update",
    body: "Important service information.",
    rule: "Genuine notices only",
  },
  {
    id: "memory-reminder",
    group: "reminders",
    label: "Reminder",
    emoji: "📸",
    title: "Save this moment if you'd like",
    body: "Optional gentle reminder.",
    rule: "Off or rare; never repeated",
  },
];

/** P-17: the one generic line, identical for every category and urgency. */
export const GENERIC_NOTIFICATION = { title: "Garnet", body: "Something new for you 💜" } as const;

/** What a notification may fill in. Only safe text: never letter bodies, drafts or details. */
export interface NotifContext {
  sender: string;
  partner?: string;
  messagePreview?: string;
  safePrompt?: string;
  safeTitle?: string;
  eventTitle?: string;
  when?: string;
  eventType?: string;
}

function fill(text: string, c: NotifContext): string {
  return text
    .replace(/\{sender\}/g, c.sender)
    .replace(/\{partner\}/g, c.partner ?? c.sender)
    .replace(/\{message_preview\}/g, c.messagePreview ?? "New message")
    .replace(/\{safe_prompt_or_generic\}/g, c.safePrompt ?? "A letter is waiting for you.")
    .replace(/\{safe_title_or_generic\}/g, c.safeTitle ?? "A surprise is waiting for you.")
    .replace(/\{event_title\}/g, c.eventTitle ?? "your event")
    .replace(/\{date_time_context\}/g, c.when ?? "Soon")
    .replace(/\{event_type\}/g, c.eventType ?? "special day");
}

/** Account notices never name a person on the lock screen. */
const NO_SENDER: ReadonlySet<string> = new Set([
  "invitation",
  "security",
  "service",
  "media-ready",
]);

/** How it reads under a preview mode (the recipient's own setting, SET-07). */
export function renderNotification(
  spec: NotifSpec,
  mode: PreviewMode,
  c: NotifContext,
): { title: string; body: string } {
  switch (mode) {
    case "generic":
      return { ...GENERIC_NOTIFICATION };
    case "sender":
      return {
        title: "Garnet",
        body: NO_SENDER.has(spec.id) ? spec.label : `${c.sender} · ${spec.label}`,
      };
    case "full":
      return { title: fill(spec.title, c), body: fill(spec.body, c) };
  }
}

export function notifSpec(id: string): NotifSpec | undefined {
  return NOTIFICATION_CATALOGUE.find((n) => n.id === id);
}
