// App entry: Expo Router, plus the Android home-screen widget task (P-73; a no-op elsewhere).
import "expo-router/entry";
import { registerWidgets } from "./src/widgets/register";

registerWidgets();
