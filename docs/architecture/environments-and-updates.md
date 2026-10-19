# Environments, deployment and updates

Covers §10 Hosting / Operations / Updates. Provider choice is **U-07**.

## Environments

| Environment | Purpose                                  | Data                                             | Deploy                             |
| ----------- | ---------------------------------------- | ------------------------------------------------ | ---------------------------------- |
| Local       | Development; tests                       | Synthetic only; PGlite or local Postgres         | —                                  |
| Staging     | Pre-release verification, restore drills | Synthetic only, **never** real relationship data | Automatic on merge to `main`       |
| Production  | The two partners                         | Real                                             | Manual promotion of a tagged build |

Mobile: development builds (EAS) for daily work, `preview` builds against staging, `production` builds against production. Expo Go cannot run widgets or native modules.

## Hosting selection criteria (U-07)

| Criterion        | Requirement                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Region           | **UK data residency preferred** (P-35, owner direction); EU evaluated only as a fallback if UK is not feasible. Not a guarantee until verified per component. |
| Managed Postgres | Automated backups, point-in-time recovery, restore you can test                                                                                               |
| Object storage   | S3-compatible, private buckets, presigned URLs, lifecycle rules                                                                                               |
| Cost             | Low fixed monthly cost at two users; no surprise egress pricing                                                                                               |
| Operations       | Zero-downtime deploys, secrets management, logs with retention controls                                                                                       |

Compare **two providers** (B-02) with a one-page cost model. For each, check the residency of:

1. the database primary, replicas and backups (including point-in-time recovery);
2. object storage and any replication;
3. CDN or edge caching, if presigned GETs are cached;
4. application logs and the error-reporting service;
5. the transactional email provider.

APNs and FCM are global services and cannot be UK-resident; by design their payloads carry no content. If UK residency is not feasible for a component, record that and evaluate EU. **No provider or region is selected; U-07 stays open until the owner reviews the comparison.**

## Backups and restore

- Daily automated backups + point-in-time recovery; retention stated to users (U-07, §11).
- **Quarterly restore drill** into staging, with real data never leaving production. A backup that hasn't been restored isn't a backup (§12).
- Deletion and backups: access is revoked immediately; deleted data ages out of backups within the stated retention.

## App updates (§10 Updates)

| Change type                          | Channel                | Rule                                                                                         |
| ------------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------- |
| JS/asset only, compatible            | EAS Update (OTA)       | Apply at a **safe point**: on cold start or after the app is backgrounded, never mid-compose |
| Native change (SDK, modules, widget) | Store / internal build | Gate with `runtimeVersion`; prompt gently with a dismissible card                            |
| API change                           | Server deploy          | Backward compatible for at least one app version; additive schemas; outbox format versioned  |

Drafts and the outbox live in SQLite, not in memory, so an update or crash cannot lose them. The local schema is migrated forward only, and verified by F-03.

## Observability (privacy-safe)

- Structured logs with **allow-listed fields only**: route, status, latency, request id, error code. Never bodies, entry text, signal types, file names or tokens.
- Error reporting with PII scrubbing configured before the first production build.
- Metrics: availability, latency, sync failure rates, job lag. No per-partner engagement metrics.
