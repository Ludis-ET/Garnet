import { createTransport, type Transporter } from "nodemailer";

/**
 * Account emails (B1). Locally they all land in Mailpit; the real provider waits on U-07. Links
 * open the app (garnet://…), which finishes the step itself. Calm, short copy that never says
 * whether an address has an account (voice-and-copy.md, ADR-0006).
 */
export interface Mailer {
  verifyEmail(to: string, name: string, token: string, hours: number): Promise<void>;
  resetPassword(to: string, token: string, minutes: number): Promise<void>;
  /** Someone tried to sign up with an address that already has an account. */
  existingAccount(to: string): Promise<void>;
  /** Step one of changing the email: the current address confirms the change (P-80). */
  confirmEmailChange(to: string, newEmail: string, token: string, hours: number): Promise<void>;
}

const APP_LINK = "garnet://";

function link(path: string, token: string): string {
  return `${APP_LINK}${path}?token=${encodeURIComponent(token)}`;
}

function html(lines: readonly string[], action?: { label: string; href: string }): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const body = lines.map((l) => `<p>${escape(l)}</p>`).join("");
  const button =
    action === undefined
      ? ""
      : `<p><a href="${escape(action.href)}" style="background:#7B55F0;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">${escape(action.label)}</a></p>`;
  return `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#15131C">${body}${button}</div>`;
}

export function createMailer(smtpUrl: string, from: string): Mailer {
  const transport: Transporter = createTransport(smtpUrl);
  const send = async (
    to: string,
    subject: string,
    lines: string[],
    action?: { label: string; href: string },
  ) => {
    const text = [...lines, ...(action === undefined ? [] : [action.href])].join("\n\n");
    await transport.sendMail({ from, to, subject, text, html: html(lines, action) });
  };
  return {
    verifyEmail: (to, name, token, hours) =>
      send(
        to,
        "Confirm your email for Garnet",
        [
          `Hi ${name},`,
          "Tap below on your phone to confirm this email and finish setting up Garnet.",
          `The link works once and lasts ${String(hours)} hours. If this wasn't you, you can ignore this email.`,
        ],
        { label: "Confirm my email", href: link("verify-email", token) },
      ),
    resetPassword: (to, token, minutes) =>
      send(
        to,
        "Reset your Garnet password",
        [
          "Someone asked to reset the password for this email.",
          `If it was you, tap below on your phone. The link works once and lasts ${String(minutes)} minutes.`,
          "If it wasn't you, ignore this email. Nothing changes.",
        ],
        { label: "Choose a new password", href: link("reset-password", token) },
      ),
    confirmEmailChange: (to, newEmail, token, hours) =>
      send(
        to,
        "Change your Garnet email?",
        [
          `Someone asked to change the email on your Garnet account to ${newEmail}.`,
          `If it was you, tap below on your phone, then confirm from the new address. The link lasts ${String(hours)} hours.`,
          "If it wasn't you, ignore this email and change your password. Nothing changes without this step.",
        ],
        { label: "Yes, change my email", href: link("confirm-email-change", token) },
      ),
    existingAccount: (to) =>
      send(to, "Someone tried to create a Garnet account", [
        "Someone tried to create a Garnet account with this email, which already has one.",
        "If it was you, sign in instead, or reset your password from the sign-in screen.",
        "If it wasn't you, you can ignore this email.",
      ]),
  };
}
