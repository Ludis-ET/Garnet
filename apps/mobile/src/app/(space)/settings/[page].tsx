import { useLocalSearchParams } from "expo-router";
import { SettingsPageScreen } from "@/features/settings/SettingsPageScreen";

/** SET-02 to SET-16, NOTIF-02 and EMAIL-01 */
export default function SettingsPageRoute() {
  const { page } = useLocalSearchParams<{ page: string }>();
  return <SettingsPageScreen page={page} />;
}
