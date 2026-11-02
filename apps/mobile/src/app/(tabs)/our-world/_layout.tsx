import { Stack } from "expo-router";
import { PAGE } from "@/theme/transitions";

/**
 * MEM-01 to MEM-10, EVT-07/08 and prompt 13 (FUT, PLACE, SONG): the Our World tab stack.
 */
export default function OurWorldLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...PAGE }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="chapters" />
      <Stack.Screen name="memory/[id]" />
      <Stack.Screen name="memory-new" />
      <Stack.Screen name="collection/[id]" />
      <Stack.Screen name="chapter/[month]" />
      <Stack.Screen name="plans" />
      <Stack.Screen name="plan-new" />
      <Stack.Screen name="plan/[id]" />
      <Stack.Screen name="places" />
      <Stack.Screen name="soundtrack" />
    </Stack>
  );
}
