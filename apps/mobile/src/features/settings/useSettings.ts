/** Data hooks for Settings (SET-01 to SET-17), through SettingsRepository only (rule 1). */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRepositories } from "@/data/RepositoryProvider";
import type { SettingsRepository, SocialProvider } from "@/data/repositories/types";
import type { UserSettings } from "@/domain/settings";

export const settingsKeys = {
  all: ["settings"] as const,
  devices: ["settings", "devices"] as const,
  methods: ["settings", "methods"] as const,
};

/** Only for signed-in people; pass `enabled: false` elsewhere. */
export function useSettings(enabled = true) {
  const { settings } = useRepositories();
  return useQuery({ queryKey: settingsKeys.all, queryFn: () => settings.get(), enabled });
}

/** SET-12: where this person is signed in. Fetched on the Devices page only. */
export function useDevices() {
  const { settings } = useRepositories();
  return useQuery({ queryKey: settingsKeys.devices, queryFn: () => settings.devices() });
}

/** The ways into this account (P-80). */
export function useAccountMethods() {
  const { settings } = useRepositories();
  return useQuery({ queryKey: settingsKeys.methods, queryFn: () => settings.methods() });
}

/** `everything`: the change reaches past settings (ending the space, deleting the account). */
function useSettingsMutation<T, R = void>(
  run: (r: SettingsRepository, input: T) => Promise<R>,
  everything = false,
) {
  const { settings } = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: T) => run(settings, input),
    onSettled: () =>
      everything
        ? client.invalidateQueries()
        : client.invalidateQueries({ queryKey: settingsKeys.all }),
  });
}

export const useUpdateSettings = () =>
  useSettingsMutation((r, patch: Partial<UserSettings>) => r.update(patch));
export const usePrepareExport = () => useSettingsMutation<undefined>((r) => r.prepareExport());
export const useExpireExport = () => useSettingsMutation<undefined>((r) => r.expireExport());
export const useSignOutDevice = () => useSettingsMutation((r, id: string) => r.signOutDevice(id));
export const useSignOutOthers = () =>
  useSettingsMutation<undefined>((r) => r.signOutOtherDevices());
export const useEndSpace = () => useSettingsMutation<undefined>((r) => r.endSpace(), true);
export const useDeleteAccount = () =>
  useSettingsMutation<undefined>((r) => r.deleteAccount(), true);
export const useChangePassword = () =>
  useSettingsMutation((r, input: { current: string; next: string }) => r.changePassword(input));
export const useConnectProvider = () =>
  useSettingsMutation((r, provider: SocialProvider) => r.connect(provider));
export const useDisconnectProvider = () =>
  useSettingsMutation((r, provider: SocialProvider) => r.disconnect(provider));
export const useSendPasswordLink = () =>
  useSettingsMutation<undefined>((r) => r.sendPasswordLink());
export const useChangeEmail = () => useSettingsMutation((r, email: string) => r.changeEmail(email));
export const useChangeBirthDate = () =>
  useSettingsMutation((r, birthDate: string) => r.changeBirthDate(birthDate));
