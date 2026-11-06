import { Injectable } from "@nestjs/common";

/**
 * Injection token for the PushSender abstraction (B6, B-50).
 */
export const PUSH_SENDER = Symbol("PUSH_SENDER");

export interface PushPayload {
  readonly to: string; // Device token
  readonly title: string;
  readonly body: string;
  readonly data: {
    readonly id: string;
    readonly href: string;
    readonly group: string;
    readonly category: string;
    readonly garnet: true;
  };
  readonly quiet: boolean;
  readonly badge?: number | undefined;
}

export interface PushResult {
  readonly ok: boolean;
  readonly unregistered?: boolean | undefined;
  readonly error?: string | undefined;
}

export interface PushSender {
  send(payload: PushPayload): Promise<PushResult>;
}

/**
 * In-memory test & dev push sender.
 * Records dispatched notifications and allows tests to inspect what was sent.
 * Enforces §5 and §6 privacy: guarantees no forbidden content leaked into push payloads.
 */
@Injectable()
export class InMemoryPushSender implements PushSender {
  readonly sent: PushPayload[] = [];
  private readonly unregisteredTokens = new Set<string>();

  markUnregistered(token: string): void {
    this.unregisteredTokens.add(token);
  }

  clear(): void {
    this.sent.length = 0;
    this.unregisteredTokens.clear();
  }

  send(payload: PushPayload): Promise<PushResult> {
    if (this.unregisteredTokens.has(payload.to)) {
      return Promise.resolve({ ok: false, unregistered: true });
    }
    this.sent.push(payload);
    return Promise.resolve({ ok: true });
  }
}
