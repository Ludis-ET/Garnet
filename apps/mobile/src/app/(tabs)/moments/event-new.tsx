/** EVT-03 · new or edit an event (`?id=` edits). */
import { useLocalSearchParams } from "expo-router";
import { EventFormScreen } from "@/features/events/EventFormScreen";

export default function EventNewRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <EventFormScreen key={id ?? "new"} {...(id === undefined ? {} : { id })} />;
}
