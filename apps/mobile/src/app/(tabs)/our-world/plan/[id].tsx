import { useLocalSearchParams } from "expo-router";
import { PlanDetailScreen } from "@/features/together/PlanScreens";

/** FUT-03 · A plan, and marking it done together */
export default function PlanRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PlanDetailScreen id={id} />;
}
