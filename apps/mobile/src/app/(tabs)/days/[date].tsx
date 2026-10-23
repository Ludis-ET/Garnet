/** DAYS-02 to DAYS-04 · one shared day */
import { useLocalSearchParams } from "expo-router";
import { DayScreen } from "@/features/days/DayScreen";

export default function DayRoute() {
  const { date } = useLocalSearchParams<{ date: string }>();
  return <DayScreen key={date} date={date} />;
}
