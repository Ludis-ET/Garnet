# Signals and notifications

Spec for §5. Catalog and preview rules: [`packages/domain/src/signals/signals.ts`](../../packages/domain/src/signals/signals.ts).

## Signals

| Signal             | Level (P-07) | Intent                                 |
| ------------------ | ------------ | -------------------------------------- |
| I Thought of You   | gentle       | Affection, no response expected        |
| Missing You        | gentle       | Affection, no response expected        |
| I Need You         | support      | Wants contact soon                     |
| I Need to Talk     | support      | Wants a conversation                   |
| Just Listen        | support      | Wants to be heard, not fixed           |
| Please Check On Me | support      | Wants a check-in                       |
| I Can't Talk Yet   | gentle       | Status: received, will respond later   |
| I'm Okay Now       | gentle       | De-escalation: closes a support moment |

Preset responses (§5): "I'm here ❤️", "Can I call you?", "Give me a little time", "Tell me what's going on". Free-text replies are allowed. Final wording is a copy decision.

## Delivery

| Level   | iOS (P-23, verify)                                                      | Android (P-23, verify)                     |
| ------- | ----------------------------------------------------------------------- | ------------------------------------------ |
| gentle  | Normal alert, `interruption-level: active`                              | Default-importance channel "Affection"     |
| support | `time-sensitive` **only if** the recipient enabled it; otherwise active | High-importance channel "Support requests" |

Rules:

1. **Quiet hours are on by default** (window: U-21) and apply to both levels. Garnet never promises a sound or a Do Not Disturb bypass (§5). Time-sensitive delivery on iOS is the recipient's opt-in, not the sender's lever.
2. **Lock-screen previews are generic by default** and identical for both levels (P-17), so urgency isn't revealed to bystanders. Each recipient can opt into detailed previews.
3. **No read receipts, "seen" claims, escalation or reminders** for non-response (§5). The sender sees "Sent". "Delivered" may be shown only if the platform genuinely confirms delivery; wording is U-09.
4. Signals are delivered immediately, never batched into the recap (§4).
5. Each partner controls only their own preferences.

## Data and retention

`signal`, `signal_response`. No tables for reads, views or escalations, by design. `signal.expires_at` supports a retention purge; the period is **U-09**. Push provider delivery metadata must not be stored beyond operational logs, which must not contain signal types or content.

Open: how signals queued offline and delivered late are presented (**U-30**).

## Copy

Generic preview placeholder: **"Garnet — Something new for you 💜"**. Voice rules: [../ux/voice-and-copy.md](../ux/voice-and-copy.md).
