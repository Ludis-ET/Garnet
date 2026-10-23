/** DAYS-06 · new or edit a moment (`?id=` edits) */
import { useLocalSearchParams } from "expo-router";
import { ComposeScreen } from "@/features/days/ComposeScreen";

export default function NewMomentRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <ComposeScreen key={id ?? "new"} {...(id === undefined ? {} : { id })} />;
}
