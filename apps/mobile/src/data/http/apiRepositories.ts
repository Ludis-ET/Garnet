import { batchMutationsResponseSchema, changeFeedResponseSchema } from "@garnet/contracts";
import type { MockStore } from "@/data/mock/MockStore";
import type { Repositories } from "@/data/repositories/types";
import { SqliteStore } from "../sqlite/sqliteStore";
import { SyncEngine } from "../sync/syncEngine";
import { createGarnetAuthClient } from "./authClient";
import { createApiClient } from "./client";
import { API_AREAS_ON, API_URL, type ApiArea } from "./config";
import { createHttpAuth } from "./httpAuth";
import { createHttpDays } from "./httpDays";
import { createHttpHome } from "./httpHome";
import { createHttpPairing } from "./httpPairing";
import { createHttpSettings } from "./httpSettings";
import { createHttpSetup } from "./httpSetup";
import { createHttpUs } from "./httpUs";
import { createHttpChat } from "./httpChat";
import { createHttpNotifications } from "./httpNotifications";
import { createHttpOpenWhen } from "./httpOpenWhen";
import { createHttpSurprises } from "./httpSurprises";
import { createHttpEvents } from "./httpEvents";
import { createHttpMemories } from "./httpMemories";
import { createHttpTogether } from "./httpTogether";
import { createHttpSearch } from "./httpSearch";
import { withMirror } from "./mirror";

/**
 * Moves the areas named in EXPO_PUBLIC_API_AREAS from mock data to the API (P-76; B1 auth,
 * pairing, setup; B2 settings; B3 days, home). Everything else keeps its mock repository, so the
 * app works the same while areas move one at a time, and is told who is really signed in (./mirror.ts).
 * With no API set, the repositories are returned unchanged.
 */
export function withApiAreas(
  repositories: Repositories,
  store: MockStore,
  url: string | null = API_URL,
  areas: ReadonlySet<ApiArea> = API_AREAS_ON,
  sqliteStore: SqliteStore = new SqliteStore(),
): Repositories {
  if (url === null || areas.size === 0) return repositories;
  const auth = createGarnetAuthClient(url);
  const api = createApiClient({
    baseUrl: url,
    headers: async () => {
      const cookie = await auth.getCookie();
      return cookie === "" ? {} : { cookie };
    },
  });

  const syncEngine = new SyncEngine(sqliteStore, {
    getUserId: () => {
      const s = store.read();
      return s.auth.status.kind === "signedIn" ? s.auth.status.userId : "";
    },
    getUserTimeZone: () => {
      const s = store.read();
      const uid = s.auth.status.kind === "signedIn" ? s.auth.status.userId : "";
      return s.profiles.byUser[uid]?.timeZone ?? "Europe/London";
    },
    postMutations: async (req) => api.post("/v1/mutations", batchMutationsResponseSchema, req),
    getChanges: async (since, limit) =>
      api.get(`/v1/changes?since=${since}&limit=${limit}`, changeFeedResponseSchema),
  });

  return {
    ...repositories,
    ...withMirror(
      {
        ...(areas.has("auth") ? { auth: createHttpAuth(auth, url, api) } : {}),
        ...(areas.has("pairing") ? { pairing: createHttpPairing(api) } : {}),
        ...(areas.has("setup") ? { setup: createHttpSetup(api) } : {}),
        ...(areas.has("settings") ? { settings: createHttpSettings(api, auth, url) } : {}),
      },
      store,
    ),
    ...(areas.has("days") ? { days: createHttpDays(api, syncEngine, store) } : {}),
    ...(areas.has("home") ? { home: createHttpHome(api, syncEngine, store) } : {}),
    ...(areas.has("us") ? { us: createHttpUs(api) } : {}),
    ...(areas.has("chat") ? { chat: createHttpChat(api, sqliteStore) } : {}),
    ...(areas.has("notifications") ? { inbox: createHttpNotifications(api) } : {}),
    ...(areas.has("openWhen")
      ? {
          openWhen: createHttpOpenWhen(
            api,
            () => {
              const s = store.read();
              return s.auth.status.kind === "signedIn" ? s.auth.status.userId : undefined;
            },
            sqliteStore,
          ),
        }
      : {}),
    ...(areas.has("surprises")
      ? {
          surprises: createHttpSurprises(
            api,
            () => {
              const s = store.read();
              return s.auth.status.kind === "signedIn" ? s.auth.status.userId : undefined;
            },
            sqliteStore,
          ),
        }
      : {}),
    ...(areas.has("events")
      ? {
          events: createHttpEvents(
            api,
            () => {
              const s = store.read();
              return s.auth.status.kind === "signedIn" ? s.auth.status.userId : undefined;
            },
            sqliteStore,
          ),
        }
      : {}),
    ...(areas.has("memories")
      ? {
          memories: createHttpMemories(
            api,
            () => {
              const s = store.read();
              return s.auth.status.kind === "signedIn" ? s.auth.status.userId : undefined;
            },
            sqliteStore,
          ),
        }
      : {}),
    ...(areas.has("together")
      ? {
          together: createHttpTogether(
            api,
            () => {
              const s = store.read();
              return s.auth.status.kind === "signedIn" ? s.auth.status.userId : undefined;
            },
            sqliteStore,
          ),
        }
      : {}),
    ...(areas.has("search") ? { search: createHttpSearch(api) } : {}),
  };
}
