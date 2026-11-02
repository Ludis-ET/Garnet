import { useLocalSearchParams } from "expo-router";
import { PlanFormScreen } from "@/features/together/PlanScreens";

/** FUT-02 · Add or edit a plan (edit when `id` is given) */
export default function PlanFormRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <PlanFormScreen id={id} />;
}
