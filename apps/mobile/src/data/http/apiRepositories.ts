import type { MockStore } from "@/data/mock/MockStore";
import type { Repositories } from "@/data/repositories/types";
import { createGarnetAuthClient } from "./authClient";
import { createApiClient } from "./client";
import { API_AREAS_ON, API_URL, type ApiArea } from "./config";
import { createHttpAuth } from "./httpAuth";
import { createHttpPairing } from "./httpPairing";
import { createHttpSettings } from "./httpSettings";
import { createHttpSetup } from "./httpSetup";
import { withMirror } from "./mirror";

/**
 * Moves the areas named in EXPO_PUBLIC_API_AREAS from mock data to the API (P-76; B1 auth,
 * pairing, setup; B2 settings). Everything else keeps its mock repository, so the app works the
 * same while areas move one at a time, and is told who is really signed in (./mirror.ts). With
 * no API set, the repositories are returned unchanged.
 */
export function withApiAreas(
  repositories: Repositories,
  store: MockStore,
  url: string | null = API_URL,
  areas: ReadonlySet<ApiArea> = API_AREAS_ON,
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
  };
}
