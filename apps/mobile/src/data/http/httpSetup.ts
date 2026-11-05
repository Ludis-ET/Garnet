import {
  chooseSideResultSchema,
  completeSetupResultSchema,
  setupStateSchema,
  type ProfileDto,
} from "@garnet/contracts";
import {
  DEMO_PHOTOS,
  type AvatarChoice,
  type DemoPartnerProfile,
  type Profile,
} from "@/data/fixtures/demoProfile";
import type { SetupRepository } from "@/data/repositories/types";
import type { ApiClient } from "./client";

/** The app's picture choice from the API's; an unknown photo falls back to initials. */
function toAvatar(a: ProfileDto["avatar"]): AvatarChoice {
  if (a.kind === "initials") return a;
  const photo = DEMO_PHOTOS.find((p) => p === a.photo);
  return photo === undefined ? { kind: "initials", swatch: 0 } : { kind: "photo", photo };
}

function toProfile(p: ProfileDto): Profile {
  return { ...p, avatar: toAvatar(p.avatar) };
}

/**
 * SetupRepository over the real API (B1, SETUP-01 to SETUP-08). The server is the authority on
 * sides (P-51): a side the partner holds is refused. Before pairing there is no partner yet;
 * the screens then see an empty one, as they did on mock data.
 */
export function createHttpSetup(api: ApiClient): SetupRepository {
  return {
    get: async () => {
      const s = await api.get("/v1/me/setup", setupStateSchema);
      const partner: DemoPartnerProfile =
        s.partner === null
          ? {
              name: "",
              side: null,
              timeZone: s.profile.timeZone ?? "UTC",
              homeCity: null,
              birthDate: null,
              ready: false,
            }
          : {
              name: s.partner.name,
              side: s.partner.side,
              timeZone: s.partner.timeZone ?? "UTC",
              homeCity: s.partner.homeCity,
              birthDate: s.partner.birthDate,
              ready: s.partner.ready,
            };
      return { profile: toProfile(s.profile), partner, togetherSince: s.togetherSince };
    },

    save: async (patch) => {
      await api.patch("/v1/me/setup", patch);
    },

    chooseSide: (side) => api.post("/v1/me/setup/side", chooseSideResultSchema, { side }),

    complete: () => api.post("/v1/me/setup/complete", completeSetupResultSchema),

    setTogetherSince: (togetherSince) =>
      api.postNoContent("/v1/me/setup/together-since", { togetherSince }),
  };
}
