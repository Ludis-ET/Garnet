/** MEM-05 · one memory */
import { useLocalSearchParams } from "expo-router";
import { MemoryScreen } from "@/features/memories/MemoryScreen";

export default function MemoryRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <MemoryScreen key={id} id={id} />;
}
