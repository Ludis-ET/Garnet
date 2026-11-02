/** MEM-04 · new or edit a memory (`?id=` edits) */
import { useLocalSearchParams } from "expo-router";
import { MemoryFormScreen } from "@/features/memories/MemoryFormScreen";

export default function MemoryNewRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <MemoryFormScreen key={id ?? "new"} {...(id === undefined ? {} : { id })} />;
}
