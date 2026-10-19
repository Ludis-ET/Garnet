# API boundaries

Draft resource map for the NestJS API (Phase 2). Shapes follow the sync protocol shown in the [F-04](../feasibility/F-04-offline-sync.md) in-memory simulation (not yet tested over HTTP). All routes except auth require a session; the relationship is **always** derived from the session, never from the URL or body.

## Conventions

- JSON over HTTPS; versioned prefix `/v1`; RFC 9457 problem details for errors.
- Writes carry `Idempotency-Key: <mutationId>` (UUIDv7). Same key + same body → same outcome; different body → `422 idempotency-key-reuse`.
- Author writes carry `baseVersion`; mismatch → `409 conflict` with the current entity.
- Deleted target → `410 gone`. Another relationship's or another person's private resource → `404` (indistinguishable from missing).
- Responses return the entity's **current** state (P-16).
- Timestamps are ISO-8601 UTC (`2026-10-18T19:30:00Z`); zones are IANA ids.
- Rate limits on auth, invitations and writes; `429` with `Retry-After`.

## Modules and routes

| Module         | Route                                                                                                                                                                         | Notes                                                                                                            |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Auth           | `POST /v1/auth/signup` · `POST /v1/auth/verify` · `POST /v1/auth/login` · `POST /v1/auth/refresh` · `POST /v1/auth/logout` · `POST /v1/auth/password-reset/{request,confirm}` | ADR-0006; generic responses for enumeration safety                                                               |
| Sessions       | `GET /v1/sessions` · `DELETE /v1/sessions/{id}`                                                                                                                               | List and revoke devices                                                                                          |
| Pairing        | `POST /v1/invitations` · `DELETE /v1/invitations/{id}` · `POST /v1/invitations/accept`                                                                                        | Token in the body, never in logs; generic error                                                                  |
| Relationship   | `GET /v1/relationship` · `PATCH /v1/relationship`                                                                                                                             | Time zone and cutoff settings (U-02, U-13)                                                                       |
| Sync           | `POST /v1/mutations` · `GET /v1/changes?since={seq}`                                                                                                                          | Generic mutation endpoint (create/edit/share/delete/attach) plus feed                                            |
| Entries (read) | `GET /v1/entries?day=` · `GET /v1/entries/{id}`                                                                                                                               | Convenience reads; same RLS                                                                                      |
| Media          | `POST /v1/media` (→ presigned PUT) · `POST /v1/media/{id}/commit` · `GET /v1/media/{id}/url`                                                                                  | ADR-0005                                                                                                         |
| Signals        | `POST /v1/signals` · `POST /v1/signals/{id}/responses` · `GET /v1/signals?since=`                                                                                             | No read or seen endpoints, by design                                                                             |
| Recap          | `GET /v1/recaps/{day}` · `POST /v1/recaps/{day}/ready`                                                                                                                        | Reveal rules U-06                                                                                                |
| Spark          | `GET /v1/spark`                                                                                                                                                               | Derived state + milestones; honours the caller's hide preference                                                 |
| Letters        | `POST /v1/letters` · `PATCH /v1/letters/{id}` · `POST /v1/letters/{id}/seal` · `POST /v1/letters/{id}/open`                                                                   | Body returned to the recipient only on open (required; not implemented or verified, and RLS does not enforce it) |
| Preferences    | `GET /v1/me/preferences` · `PATCH /v1/me/preferences`                                                                                                                         | Own preferences only                                                                                             |
| Push           | `PUT /v1/me/push-devices/{deviceId}`                                                                                                                                          | Register or refresh the token                                                                                    |
| Data           | `POST /v1/me/export` · `GET /v1/me/export/{id}` · `POST /v1/me/delete-account` · `POST /v1/relationship/end`                                                                  | U-20 blocks the last two                                                                                         |

## Boundaries

- **Clients never compute authority.** Shared-day assignment, recap reveal, Spark finalization and grace are server-side jobs using `@garnet/domain`; clients only preview.
- **Push payloads carry no content**: an opaque id and a generic alert. The app fetches details after authentication.
- **The widget never calls the API directly** with privileged data; it renders neutral state written by the app into the shared container.
