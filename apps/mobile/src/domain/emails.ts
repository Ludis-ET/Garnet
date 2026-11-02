/**
 * Transactional email templates (prompt 17, EMAIL-02 to EMAIL-13; spec A6), previewed in the
 * email lab. Nothing is sent in Phase 2. Never in any email: passwords, private drafts, signal
 * details, Open When bodies or surprise contents. One column, one call to action, a text link.
 */

export type EmailId =
  | "verify"
  | "reset"
  | "invitation"
  | "joined"
  | "security"
  | "event"
  | "open-when"
  | "surprise"
  | "export"
  | "deletion"
  | "service";

export type LinkState = "valid" | "expired" | "used" | "invalid" | "signedOut";

export interface EmailTemplate {
  id: EmailId;
  code: string;
  type: string;
  subject: string;
  body: string;
  cta: string;
  footer: string;
}

export const EMAIL_TEMPLATES: readonly EmailTemplate[] = [
  {
    id: "verify",
    code: "EMAIL-03",
    type: "Verify email",
    subject: "Verify your email for Garnet",
    body: "You're one step away from setting up your private space.",
    cta: "Verify email",
    footer: "If you didn't create this account, you can ignore this message.",
  },
  {
    id: "reset",
    code: "EMAIL-04",
    type: "Password reset",
    subject: "Reset your Garnet password",
    body: "We received a request to reset the password for this account. If it was you, use the secure button below.",
    cta: "Reset password",
    footer: "If you didn't request this, no action is needed. The link expires.",
  },
  {
    id: "invitation",
    code: "EMAIL-05",
    type: "Invitation",
    subject: "You've been invited to Garnet",
    body: "Someone invited you to join a private two-person space. Review who invited you before accepting.",
    cta: "Review invitation",
    footer: "Only accept if you recognize the person. Invitation links expire.",
  },
  {
    id: "joined",
    code: "EMAIL-06",
    type: "Partner joined",
    subject: "You're connected on Garnet",
    body: "Your partner has joined your shared space. Open Garnet to continue setup.",
    cta: "Open Garnet",
    footer: "If this wasn't expected, review account and relationship settings.",
  },
  {
    id: "security",
    code: "EMAIL-07",
    type: "Security alert",
    subject: "Review a change to your Garnet account",
    body: "A security-related change occurred on your account. Open Garnet to review details.",
    cta: "Review activity",
    footer: "If you don't recognize this activity, secure your account.",
  },
  {
    id: "event",
    code: "EMAIL-08",
    type: "Event reminder (opt-in)",
    subject: "Coming up: {event_title}",
    body: "A date you chose to remember is coming up on {date}.",
    cta: "View event",
    footer: "You control event reminders in Garnet settings.",
  },
  {
    id: "open-when",
    code: "EMAIL-09",
    type: "Open When ready",
    subject: "A letter is ready when you are",
    body: "A letter has reached its opening condition. Open Garnet to read it.",
    cta: "Open Garnet",
    footer: "The letter's contents are kept inside Garnet.",
  },
  {
    id: "surprise",
    code: "EMAIL-10",
    type: "Surprise ready",
    subject: "Something is waiting for you",
    body: "A surprise is ready to open in Garnet.",
    cta: "Open surprise",
    footer: "The sender's privacy choice controls what appears in previews.",
  },
  {
    id: "export",
    code: "EMAIL-11",
    type: "Export ready",
    subject: "Your Garnet export is ready",
    body: "The export you requested is ready to download securely.",
    cta: "Download export",
    footer: "This link expires. Keep the file private.",
  },
  {
    id: "deletion",
    code: "EMAIL-12",
    type: "Account deletion",
    subject: "Confirm your Garnet account deletion",
    body: "You requested account deletion. Review the consequences before confirming.",
    cta: "Review deletion",
    footer: "If you did not request this, do not confirm it.",
  },
  {
    id: "service",
    code: "EMAIL-13",
    type: "Service notice",
    subject: "An update about Garnet",
    body: "There is an important update about the service or your account.",
    cta: "View update",
    footer: "Only use for genuinely important service messages.",
  },
];

export interface EmailContext {
  eventTitle?: string;
  date?: string;
}

export interface RenderedEmail {
  subject: string;
  headline: string;
  body: string;
  cta: string;
  /** The fallback link, shown as text under the button (illustrative; nothing resolves). */
  link: string;
  footer: string;
  /** Why the person got it, with help and privacy links (the shared footer). */
  why: string;
}

const fill = (text: string, c: EmailContext) =>
  text
    .replace(/\{event_title\}/g, c.eventTitle ?? "Our anniversary")
    .replace(/\{date\}/g, c.date ?? "5 January");

export function renderEmail(t: EmailTemplate, c: EmailContext = {}): RenderedEmail {
  return {
    subject: fill(t.subject, c),
    headline: fill(t.subject, c),
    body: fill(t.body, c),
    cta: t.cta,
    link: `https://garnet.example/l/${t.id}`,
    footer: t.footer,
    why: "You got this email because you have a Garnet account. Help · Privacy",
  };
}

/** The plain-text version: same words, the link written out, no images. */
export function plainTextEmail(e: RenderedEmail): string {
  return [
    "GARNET",
    "",
    e.headline,
    "",
    e.body,
    "",
    `${e.cta}: ${e.link}`,
    "",
    e.footer,
    "",
    e.why,
  ].join("\n");
}

/** What tapping the button leads to, for each link state the lab can show. */
export function linkLanding(state: LinkState): { title: string; body: string } {
  switch (state) {
    case "valid":
      return { title: "Opens Garnet", body: "The link opens the app and carries on from here." };
    case "expired":
      return {
        title: "This link has expired",
        body: "For your security, links stop working after a while. Ask for a new one in Garnet.",
      };
    case "used":
      return { title: "This link was already used", body: "Open Garnet to continue." };
    case "invalid":
      return { title: "This link isn't valid", body: "Check that you opened the whole link." };
    case "signedOut":
      return { title: "Sign in to continue", body: "Sign in to Garnet, then try the link again." };
  }
}
