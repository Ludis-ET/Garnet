import { useLocalSearchParams } from "expo-router";
import { SurpriseDetailScreen } from "@/features/surprises/SurpriseDetailScreen";

/** SUR-05 to SUR-07 · One surprise */
export default function SurpriseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SurpriseDetailScreen id={id} />;
}
