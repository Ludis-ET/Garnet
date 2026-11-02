/** EVT-02, EVT-05, EVT-06 · one event (birthdays and anniversaries open as special pages). */
import { useLocalSearchParams } from "expo-router";
import { EventScreen } from "@/features/events/EventScreen";

export default function EventRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EventScreen key={id} id={id} />;
}
