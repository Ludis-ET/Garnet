import {
  acceptInviteResultSchema,
  checkInviteResultSchema,
  createInviteResultSchema,
  normaliseInviteCode,
  pairingStatusSchema,
} from "@garnet/contracts";
import type { PairingRepository, PairingStatus } from "@/data/repositories/types";
import { ApiError, type ApiClient } from "./client";
import { clearLocal, readLocal, writeLocal } from "./localState";

/**
 * PairingRepository over the real API (B1, PAIR-01 to PAIR-07, P-18). The server checks codes by
 * hash and gives the inviter their own code back, sealed for them alone (P-97), so it survives
 * signing out and in. A code being reviewed is remembered on this phone only.
 */
export function createHttpPairing(api: ApiClient): PairingRepository {
  async function check(code: string) {
    return api.post("/v1/invitations/check", checkInviteResultSchema, { code });
  }

  return {
    status: async (): Promise<PairingStatus> => {
      try {
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
            // The server gives the inviter their own code back on any phone (P-97); this
            // phone's copy covers an invitation made before the server kept it.
            code: s.invite.code ?? readLocal("inviteCode") ?? "",
            expiresAt: s.invite.expiresAt,
            expired: s.invite.expired,
          };
        return { me: s.me, kind: "unpaired" };
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          return { me: "", kind: "unpaired" };
        }
        throw e;
      }
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
