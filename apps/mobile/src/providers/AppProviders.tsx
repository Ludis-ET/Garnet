import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RepositoryProvider } from "@/data/RepositoryProvider";
import { ThemeProvider } from "@/theme/ThemeProvider";

/** Root providers, in dependency order. Business logic never lives here. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Mock data is local; keep retries visible so failure states can be designed and reviewed.
          queries: { retry: false, staleTime: 30_000 },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RepositoryProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </RepositoryProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
