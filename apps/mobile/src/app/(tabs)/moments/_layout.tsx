import { Stack } from "expo-router";
import { PAGE } from "@/theme/transitions";

/** EVT-01 to EVT-09, OPEN-01 to OPEN-08 and SUR-01 to SUR-07: the Moments tab stack. */
export default function MomentsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...PAGE }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="event/[id]" />
      <Stack.Screen name="event-new" />
      <Stack.Screen name="open-when/index" />
      <Stack.Screen name="open-when/new" />
      <Stack.Screen name="open-when/[id]" />
      <Stack.Screen name="surprises/index" />
      <Stack.Screen name="surprises/new" />
      <Stack.Screen name="surprises/[id]" />
    </Stack>
  );
}
