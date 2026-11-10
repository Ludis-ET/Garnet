/**
 * How email is going, for the public health page (P-96): whether the last contact with the mail
 * server worked, and if not, its error code (EAUTH 535, ECONNECTION…). No address, host or
 * password ever. One per process; the worker and the startup check keep it current.
 */
export interface MailStatus {
  state: "ok" | "failing";
  error: string | null;
}

let current: MailStatus | null = null;

export function setMailStatus(status: MailStatus): void {
  current = status;
}

/** Null until the mail server was tried at least once. */
export function mailStatus(): MailStatus | null {
  return current;
}

/** Tests only. */
export function resetMailStatusForTest(): void {
  current = null;
}
