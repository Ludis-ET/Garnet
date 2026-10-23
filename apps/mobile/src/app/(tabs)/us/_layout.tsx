import { Stack } from "expo-router";

/** US-01 to US-10: the Us tab is its own stack (signals → history). */
export default function UsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "ios_from_right" }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="history" />
    </Stack>
  );
}
