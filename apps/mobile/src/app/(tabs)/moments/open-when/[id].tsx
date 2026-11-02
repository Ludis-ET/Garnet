import { useLocalSearchParams } from "expo-router";
import { OpenWhenDetailScreen } from "@/features/openWhen/OpenWhenDetailScreen";

/** OPEN-05, OPEN-06, OPEN-07, OPEN-08: Open When detail and opening route */
export default function OpenWhenDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <OpenWhenDetailScreen id={id ?? ""} />;
}
