import {
  accountMethodsSchema,
  devicesSchema,
  disconnectResultSchema,
  exportStatusSchema,
  settingsViewSchema,
  type SettingsPatchDto,
} from "@garnet/contracts";
import { DEMO_PHOTOS, type AvatarChoice } from "@/data/fixtures/demoProfile";
import type { SettingsRepository } from "@/data/repositories/types";
import { normaliseEmail } from "@/domain/auth";
import { withDefaults, type UserSettings } from "@/domain/settings";
import type { GarnetAuthClient } from "./authClient";
import { ApiError, type ApiClient } from "./client";
import { connectProvider } from "./social";

/** The app's deep link that the reset email opens. */
const RESET_LINK = "garnet://reset-password";

function toAvatar(a: { kind: "initials"; swatch: number } | { kind: "photo"; photo: string }) {
  if (a.kind === "initials") return a;
  const photo = DEMO_PHOTOS.find((p) => p === a.photo);
  const choice: AvatarChoice =
    photo === undefined ? { kind: "initials", swatch: 0 } : { kind: "photo", photo };
  return choice;
}

/** What the server stores: the export state is its own, never a setting (B9). */
function toPatch(patch: Partial<UserSettings>): SettingsPatchDto {
  const rest: Partial<UserSettings> = { ...patch };
  delete rest.export;
  return rest;
}

const needsRecentSignIn = (e: unknown) =>
  e instanceof ApiError && e.problem?.code === "recent_sign_in_required";

/**
 * SettingsRepository over the real API (B2, SET-01 to SET-17, B9). Settings are saved a piece at a
 * time, so two devices never undo each other. Export, ending the space and deleting the account
 * run against the real API with strict RLS and P-37 safeguards (`dataRights: true`).
 */
export function createHttpSettings(
  api: ApiClient,
  client: GarnetAuthClient,
  baseUrl: string,
): SettingsRepository {
  const email = async () => (await api.get("/v1/me/settings", settingsViewSchema)).account.email;

  return {
    get: async () => {
      const v = await api.get("/v1/me/settings", settingsViewSchema);
      return {
        settings: withDefaults(v.settings),
        me: { name: v.me.name, side: v.me.side, zone: v.me.zone, avatar: toAvatar(v.me.avatar) },
        partner:
          v.partner === null
            ? { name: "", side: null, zone: v.me.zone, avatar: { kind: "initials", swatch: 1 } }
            : { ...v.partner, avatar: { kind: "initials", swatch: 1 } },
        email: v.account.email,
        birthDate: v.account.birthDate,
        termsVersion: v.account.termsVersion,
        termsAcceptedAt: v.account.termsAcceptedAt,
        dataRights: true,
      };
    },

    update: async (patch) => {
      await api.patch("/v1/me/settings", toPatch(patch));
    },

    devices: async () => (await api.get("/v1/me/devices", devicesSchema)).devices,

    signOutDevice: (id) => api.delete(`/v1/me/devices/${encodeURIComponent(id)}`),

    signOutOtherDevices: () => api.postNoContent("/v1/me/devices/sign-out-others", {}),

    changePassword: async ({ current, next }) => {
      // Through Better Auth's client: it keeps the fresh session cookie this device gets.
      const { error } = await client.changePassword({
        currentPassword: current,
        newPassword: next,
        revokeOtherSessions: true,
      });
      if (error === null) return { ok: true };
      if (error.status === 429) return { ok: false, reason: "rate-limited" };
      return { ok: false, reason: error.status === 400 ? "wrong-password" : "failed" };
    },

    methods: () => api.get("/v1/me/sign-in-methods", accountMethodsSchema),

    connect: (provider) => connectProvider(client, baseUrl, provider),

    disconnect: async (provider) => {
      try {
        return await api.deleteWith(`/v1/me/sign-in-methods/${provider}`, disconnectResultSchema);
      } catch (e) {
        if (needsRecentSignIn(e)) return { ok: false, reason: "sign-in-again" };
        throw e;
      }
    },

    sendPasswordLink: async () => {
      await client.requestPasswordReset({ email: await email(), redirectTo: RESET_LINK });
    },

    changeEmail: async (newEmail) => {
      const next = normaliseEmail(newEmail);
      if (next === (await email())) return { ok: false, reason: "same" };
      const { error } = await client.changeEmail({ newEmail: next });
      if (error === null) return { ok: true };
      if (error.status === 429) return { ok: false, reason: "rate-limited" };
      return { ok: false, reason: error.status === 403 ? "sign-in-again" : "failed" };
    },

    changeBirthDate: async (birthDate) => {
      try {
        await api.patch("/v1/me/account", { birthDate });
        return { ok: true };
      } catch (e) {
        const tooYoung =
          e instanceof ApiError && e.problem?.issues?.some((i) => i.code === "too_young") === true;
        if (tooYoung) return { ok: false, reason: "too-young" };
        throw e;
      }
    },

    prepareExport: async () => {
      await api.post("/v1/me/export", exportStatusSchema, {});
    },
    expireExport: () => api.postNoContent("/v1/me/export/expire", {}),
    endSpace: () => api.postNoContent("/v1/me/end-space", { confirmWord: "END" }),
    deleteAccount: () => api.delete("/v1/me/account", { confirmWord: "DELETE" }),
  };
}
