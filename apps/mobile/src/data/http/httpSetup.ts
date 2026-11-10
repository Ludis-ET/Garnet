import {
  chooseSideResultSchema,
  completeSetupResultSchema,
  setupStateSchema,
  uploadAvatarResultSchema,
  type ProfileDto,
} from "@garnet/contracts";
import type { DemoPartnerProfile, Profile } from "@/data/fixtures/demoProfile";
import type { SetupRepository } from "@/data/repositories/types";
import { avatarFromDto } from "./avatar";
import type { ApiClient } from "./client";

function toProfile(p: ProfileDto): Profile {
  return { ...p, avatar: avatarFromDto(p.avatar, "me") };
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
              avatar: avatarFromDto(s.partner.avatar, "partner"),
            };
      return { profile: toProfile(s.profile), partner, togetherSince: s.togetherSince };
    },

    save: async (patch) => {
      // A real picture is only ever set by uploading it (setPicture); never echoed back here.
      const { avatar, ...rest } = patch;
      const body = avatar === undefined || avatar.kind === "image" ? rest : { ...rest, avatar };
      if (Object.keys(body).length > 0) await api.patch("/v1/me/setup", body);
    },

    setPicture: async ({ base64 }) => {
      const r = await api.putWith("/v1/me/avatar", uploadAvatarResultSchema, {
        contentType: "image/jpeg",
        data: base64,
      });
      return avatarFromDto(r.avatar, "me");
    },

    clearPicture: async () => {
      await api.delete("/v1/me/avatar");
    },

    chooseSide: (side) => api.post("/v1/me/setup/side", chooseSideResultSchema, { side }),

    complete: () => api.post("/v1/me/setup/complete", completeSetupResultSchema),

    setTogetherSince: (togetherSince) =>
      api.postNoContent("/v1/me/setup/together-since", { togetherSince }),
  };
}
