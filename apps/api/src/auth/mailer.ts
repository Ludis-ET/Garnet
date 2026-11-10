/**
 * Account emails (B1), as Better Auth asks for them. In the running API each one goes through
 * the outbox and its worker (../mail/, P-96), which send it over SMTP and retry until the link
 * inside it expires; tests use a recording Mailer. What each email says: ../mail/templates.ts.
 */
export interface Mailer {
  verifyEmail(to: string, name: string, token: string, hours: number): Promise<void>;
  resetPassword(to: string, token: string, minutes: number): Promise<void>;
  /** Someone tried to sign up with an address that already has an account. */
  existingAccount(to: string): Promise<void>;
  /** Step one of changing the email: the current address confirms the change (P-80). */
  confirmEmailChange(to: string, newEmail: string, token: string, hours: number): Promise<void>;
}

export { emailLink } from "../mail/templates";
