# ADR-0006: Authentication and sessions

- **Status:** Proposed
- **Date:** 2026-10-18
- **Decision IDs:** D-09, §10 Authentication, §12, P-11, P-18, P-25

## Context

D-09 proposes email/password with verification and reset. §12 requires secure sessions with revocation, password-reset protections and rate limits. There are exactly two users, but the attack surface is the public internet.

## Decision

- **Passwords** (recorded as proposal **P-25**, not approved): argon2id (OWASP-recommended parameters, tuned on the production instance), minimum length 12 (or 8 if checked against a breached-password list), no composition rules, no maximum below 64 characters.
- **Sessions:** opaque random tokens (≥ 256 bits). Only their SHA-256 hash is stored (`session.token_hash`). A short-lived access token plus a rotating refresh token; reuse of a rotated refresh token revokes the whole session family. Tokens live in iOS Keychain / Android Keystore via `expo-secure-store`, never in AsyncStorage.
- **Revocation:** users can see and revoke sessions; password change revokes all others.
- **Email verification and reset:** single-use, hashed, short-lived tokens. Reset responses never reveal whether an email exists. A reset revokes all sessions.
- **Rate limits:** per IP and per account on login, reset and invitation acceptance; exponential back-off; no permanent lockout (it is a denial-of-service lever).
- **Invitations:** single-use, at most 24 h (database-enforced), hashed at rest, one generic error for every invalid case (P-18).

## Consequences

- An email provider is needed (verification, reset). Choose with U-07.
- Passkeys are a natural later addition and need no schema change beyond a credentials table.
- Account deletion depends on U-20 (direction P-37).
- Multiple devices per person are planned (P-36). Session device identity, push linkage and revocation are open (U-27).
- This ADR is **not** part of the planning baseline; it stays Proposed until separately reviewed. The authentication **method** itself (email/password with email verification and password reset) **is** in the Planning baseline via D-09 (owner direction, 2026-10-19). Everything else in this ADR (password rules, Argon2id parameters, session lifetimes, refresh rotation, rate limits, invitation security) stays Proposed.

## Implementation note (B1, 2026-11-04)

How the B1 code meets this ADR is recorded in **P-77** (Better Auth) and **P-78** (choices made at the owner's request): Argon2id with a 15-character minimum and a shared blocklist; signed session cookies instead of hashed tokens; server-side sessions that slide for 30 days and end 90 days after sign-in, instead of rotating refresh tokens; per-address limits plus per-account exponential back-off. This note changes nothing about the ADR's status: it stays **Proposed**.
