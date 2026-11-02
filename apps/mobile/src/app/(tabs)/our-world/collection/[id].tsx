/** MEM-03 · one collection */
import { useLocalSearchParams } from "expo-router";
import { CollectionScreen } from "@/features/memories/CollectionScreen";

export default function CollectionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CollectionScreen key={id} id={id} />;
}
