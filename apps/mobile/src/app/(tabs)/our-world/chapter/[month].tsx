/** EVT-07 · one chapter (a month of their story) */
import { useLocalSearchParams } from "expo-router";
import { ChapterScreen } from "@/features/memories/ChapterScreen";

export default function ChapterRoute() {
  const { month } = useLocalSearchParams<{ month: string }>();
  return <ChapterScreen key={month} month={month} />;
}
