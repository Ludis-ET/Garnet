# Authorization model

Decision: [ADR-0004](../decisions/adr/0004-authorization.md). Database policies: the RLS section of [schema.sql](../../spikes/data-model/schema.sql). Evidence: [F-05](../feasibility/F-05-data-model.md).

## Subjects and scope

Every request has exactly one subject (the session's user) and at most one relationship (their active membership). There are no admin roles in the product. Operator access to production data is an operations procedure, logged and break-glass only.

## Policy matrix

| Resource                 | Read                                                                                 | Create                      | Update                     | Delete                  |
| ------------------------ | ------------------------------------------------------------------------------------ | --------------------------- | -------------------------- | ----------------------- |
| Entry — private draft    | Author                                                                               | Author (member)             | Author                     | Author                  |
| Entry — shared           | Both partners                                                                        | —                           | Author until reveal (U-18) | Either partner (D-11)   |
| Media                    | Whoever can read the entry                                                           | Entry author                | —                          | Cascades from the entry |
| Signal / response        | Both partners                                                                        | Sender / responder (member) | —                          | Retention job (U-09)    |
| Letter — draft           | Author                                                                               | Author                      | Author                     | Author                  |
| Letter — sealed / opened | Author and recipient (body only after opening — **not enforced by RLS; unverified**) | —                           | Recipient marks it opened  | Shared deletion policy  |
| Shared day, milestones   | Both partners                                                                        | Server job                  | Server job                 | —                       |
| Preferences              | Self                                                                                 | Self                        | Self                       | Self                    |
| Sessions, push devices   | Self (via API)                                                                       | Self                        | Self                       | Self                    |
| Credentials, invitations | Never via the app role                                                               | API (privileged path)       | API                        | API                     |

## Rules

1. Resolve the relationship from the session; reject any client-supplied relationship id that differs.
2. Every query is relationship-scoped. RLS enforces this again underneath.
3. Not-yours and not-found are indistinguishable (404 / `not-found`).
4. Server jobs (finalization, reveal, purge) run as a separate privileged role and are the only writers of derived tables.
5. Export runs under the requester's RLS context, so it physically cannot include the partner's drafts.

## Test requirements (Phase 2)

- For **every** endpoint: an automated probe as a member of another relationship, and as the partner against private resources. Expect 404 and no side effects.
- Session-fixation, token-reuse (refresh rotation) and invitation replay tests.
- RLS tests stay in CI (F-05 suite moves to `packages/db` or `apps/api`).
