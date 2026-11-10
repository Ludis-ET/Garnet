import { appLink, type OpenPage } from "../auth/open-link.controller";

/**
 * The account emails (B1, P-96): what each says, as HTML and plain text. Calm, short copy that
 * never says whether an address has an account (voice-and-copy.md, ADR-0006). Nothing but the
 * person's own display name and their own new address comes from outside, and both are escaped.
 * No images, trackers or remote fonts: an email from Garnet loads nothing (§5, no analytics).
 */
export type MailJob =
  | { kind: "verify"; name: string; token: string; hours: number }
  | { kind: "reset"; token: string; minutes: number }
  | { kind: "exists" }
  | { kind: "change"; newEmail: string; token: string; hours: number };

export type MailKind = MailJob["kind"];

export interface RenderedMail {
  subject: string;
  text: string;
  html: string;
}

/**
 * The link an email carries (production-fix-plan A7). Gmail and other mail apps drop links that
 * aren't http(s), so with the API's public address the link is its /v1/open page, which opens
 * the app; without one (tests) it is the garnet:// link itself.
 */
export function emailLink(publicUrl: string | null, page: OpenPage, token: string): string {
  if (publicUrl === null) return appLink(page, token);
  return `${publicUrl.replace(/\/+$/, "")}/v1/open/${page}?token=${encodeURIComponent(token)}`;
}

const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/** One line, no control characters: a display name can't add lines or headers. */
const oneLine = (s: string) =>
  Array.from(s, (ch) => {
    const code = ch.charCodeAt(0);
    return code < 0x20 || code === 0x7f ? " " : ch;
  })
    .join("")
    .replace(/ {2,}/g, " ")
    .trim();

interface Content {
  subject: string;
  /** The grey line mail apps show next to the subject. */
  preheader: string;
  heading: string;
  paragraphs: string[];
  action?: { label: string; href: string };
  /** Small print under the button: how long the link lasts, what to do if it wasn't you. */
  note: string;
}

function contentOf(job: MailJob, publicUrl: string | null): Content {
  switch (job.kind) {
    case "verify": {
      const name = oneLine(job.name);
      return {
        subject: "Confirm your email for Garnet",
        preheader: "One tap and your space is ready.",
        heading: name === "" ? "Welcome to Garnet" : `Welcome to Garnet, ${name}`,
        paragraphs: [
          "Tap the button on your phone to confirm this email and finish setting up your space.",
        ],
        action: {
          label: "Confirm my email",
          href: emailLink(publicUrl, "verify-email", job.token),
        },
        note: `The link works once and lasts ${String(job.hours)} hours. If you didn't sign up for Garnet, you can ignore this email.`,
      };
    }
    case "reset":
      return {
        subject: "Reset your Garnet password",
        preheader: "Choose a new password for your account.",
        heading: "Reset your password",
        paragraphs: [
          "Someone asked to reset the password for this email. If it was you, tap the button on your phone.",
        ],
        action: {
          label: "Choose a new password",
          href: emailLink(publicUrl, "reset-password", job.token),
        },
        note: `The link works once and lasts ${String(job.minutes)} minutes. If it wasn't you, ignore this email. Nothing changes.`,
      };
    case "change": {
      const next = oneLine(job.newEmail);
      return {
        subject: "Change your Garnet email?",
        preheader: "Confirm the new address for your account.",
        heading: "Change your email?",
        paragraphs: [
          `Someone asked to change the email on your Garnet account to ${next}.`,
          "If it was you, tap the button on your phone, then confirm from the new address too.",
        ],
        action: {
          label: "Yes, change my email",
          href: emailLink(publicUrl, "confirm-email-change", job.token),
        },
        note: `The link lasts ${String(job.hours)} hours. If it wasn't you, ignore this email and change your password. Nothing changes without this step.`,
      };
    }
    case "exists":
      return {
        subject: "Someone tried to create a Garnet account",
        preheader: "This email already has a Garnet account.",
        heading: "You already have an account",
        paragraphs: [
          "Someone tried to create a Garnet account with this email, which already has one.",
          "If it was you, sign in instead, or reset your password from the sign-in screen.",
        ],
        note: "If it wasn't you, you can ignore this email. Nothing has changed.",
      };
  }
}

const INK = "#15131C";
const MUTED = "#5B5670";
const ACCENT = "#7B55F0"; // White on it: 4.8:1 (WCAG AA).
const CANVAS = "#F4F1FA";

function htmlOf(c: Content): string {
  const p = (text: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${INK}">${escape(text)}</p>`;
  const button =
    c.action === undefined
      ? ""
      : `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 24px"><tr><td style="border-radius:999px;background:${ACCENT}"><a href="${escape(c.action.href)}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:600;line-height:20px;color:#FFFFFF;text-decoration:none;border-radius:999px">${escape(c.action.label)}</a></td></tr></table>
<p style="margin:0 0 16px;font-size:13px;line-height:20px;color:${MUTED}">If the button doesn't work, open this link on your phone:<br><a href="${escape(c.action.href)}" style="color:${ACCENT};word-break:break-all">${escape(c.action.href)}</a></p>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<title>${escape(c.subject)}</title></head>
<body style="margin:0;padding:0;background:${CANVAS}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(c.preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${CANVAS}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<tr><td style="padding:0 8px 20px;font-size:20px;font-weight:700;letter-spacing:0.2px;color:${INK}"><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${ACCENT};transform:rotate(45deg);margin-right:10px;vertical-align:middle"></span>Garnet</td></tr>
<tr><td style="background:#FFFFFF;border-radius:20px;padding:32px 28px;box-shadow:0 1px 3px rgba(21,19,28,0.08)">
<h1 style="margin:0 0 16px;font-size:24px;line-height:32px;font-weight:700;color:${INK}">${escape(c.heading)}</h1>
${c.paragraphs.map(p).join("\n")}
${button}
<p style="margin:0;font-size:13px;line-height:20px;color:${MUTED}">${escape(c.note)}</p>
</td></tr>
<tr><td style="padding:20px 8px 0;font-size:12px;line-height:18px;color:${MUTED}">You're getting this because this address was used with Garnet, a private space for two. We only email about your account.</td></tr>
</table></td></tr></table></body></html>`;
}

function textOf(c: Content): string {
  return [
    c.heading,
    ...c.paragraphs,
    ...(c.action === undefined ? [] : [`${c.action.label}: ${c.action.href}`]),
    c.note,
    "— Garnet",
  ].join("\n\n");
}

export function renderMail(job: MailJob, publicUrl: string | null): RenderedMail {
  const c = contentOf(job, publicUrl);
  return { subject: c.subject, text: textOf(c), html: htmlOf(c) };
}

/** How long each kind may wait to go out: as long as the link inside it works. */
export function mailLifetimeMs(job: MailJob): number {
  switch (job.kind) {
    case "verify":
    case "change":
      return Math.max(job.hours, 1) * 3_600_000;
    case "reset":
      return Math.max(job.minutes, 1) * 60_000;
    case "exists":
      return 24 * 3_600_000;
  }
}
