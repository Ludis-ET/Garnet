import { Stack } from "expo-router";

/** DAYS-01 to DAYS-11: the Days tab is its own stack (list → day → moment, and the form). */
export default function DaysLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "ios_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[date]" />
      <Stack.Screen name="entry/[id]" />
      <Stack.Screen name="new" options={{ animation: "slide_from_bottom" }} />
    </Stack>
  );
}
