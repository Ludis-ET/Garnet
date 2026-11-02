import { Stack } from "expo-router";
import { PAGE } from "@/theme/transitions";

/** US-01 to US-10 and CHAT-01 to CHAT-09: the Us tab stack (signals, history, chat). */
export default function UsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, ...PAGE }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="history" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="chat-details" />
    </Stack>
  );
}
