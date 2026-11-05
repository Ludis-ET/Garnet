import {
  acceptInviteResultSchema,
  checkInviteResultSchema,
  createInviteResultSchema,
  normaliseInviteCode,
  pairingStatusSchema,
} from "@garnet/contracts";
import type { PairingRepository, PairingStatus } from "@/data/repositories/types";
import type { ApiClient } from "./client";
import { clearLocal, readLocal, writeLocal } from "./localState";

/**
 * PairingRepository over the real API (B1, PAIR-01 to PAIR-07, P-18). The server keeps only a
 * hash of each code, so the code this person made is remembered on this phone, and so is a code
 * being reviewed: neither is ever needed by anyone else.
 */
export function createHttpPairing(api: ApiClient): PairingRepository {
  async function check(code: string) {
    return api.post("/v1/invitations/check", checkInviteResultSchema, { code });
  }

  return {
    status: async (): Promise<PairingStatus> => {
      const s = await api.get("/v1/pairing", pairingStatusSchema);
      if (s.partnerName !== null) {
        await clearLocal("inviteCode", "reviewingCode");
        return { me: s.me, kind: "paired", partnerName: s.partnerName };
      }
      const reviewing = readLocal("reviewingCode");
      if (reviewing !== null) {
        const r = await check(reviewing);
        if (r.ok) return { me: s.me, kind: "reviewing", inviterName: r.inviterName };
        await clearLocal("reviewingCode");
      }
      if (s.invite !== null)
        return {
          me: s.me,
          kind: "inviting",
          code: readLocal("inviteCode") ?? "",
          expiresAt: s.invite.expiresAt,
          expired: s.invite.expired,
        };
      return { me: s.me, kind: "unpaired" };
    },

    createInvite: async () => {
      const r = await api.post("/v1/invitations", createInviteResultSchema);
      writeLocal("inviteCode", r.code);
      await clearLocal("reviewingCode");
      return r;
    },

    revokeInvite: async () => {
      await api.delete("/v1/invitations");
      await clearLocal("inviteCode");
    },

    checkCode: async (code) => {
      const normal = normaliseInviteCode(code);
      const r = await check(normal);
      if (!r.ok) return { ok: false };
      writeLocal("reviewingCode", normal);
      return { ok: true, inviterName: r.inviterName };
    },

    accept: async () => {
      const code = readLocal("reviewingCode");
      if (code === null) return { ok: false };
      const r = await api.post("/v1/invitations/accept", acceptInviteResultSchema, { code });
      await clearLocal("reviewingCode");
      if (!r.ok) return { ok: false };
      await clearLocal("inviteCode");
      return { ok: true, partnerName: r.partnerName };
    },

    decline: async () => {
      await clearLocal("reviewingCode");
    },
  };
}
