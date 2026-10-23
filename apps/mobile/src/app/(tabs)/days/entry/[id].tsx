/** DAYS-05 · one moment */
import { useLocalSearchParams } from "expo-router";
import { EntryScreen } from "@/features/days/EntryScreen";

export default function EntryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EntryScreen key={id} id={id} />;
}
