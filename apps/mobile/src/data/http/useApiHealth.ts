import { healthSchema } from "@garnet/contracts";
import { useQuery } from "@tanstack/react-query";
import { createApiClient } from "./client";
import { API_URL } from "./config";

export type ApiConnection = "off" | "checking" | "connected" | "unreachable";

/**
 * Whether this build talks to an API, and whether it answers (B0). "off" when no API is set:
 * the app then shows nothing about it.
 */
export function useApiConnection(baseUrl: string | null = API_URL): ApiConnection {
  const health = useQuery({
    queryKey: ["api-health", baseUrl],
    enabled: baseUrl !== null,
    queryFn: () => createApiClient({ baseUrl: baseUrl ?? "" }).get("/v1/health", healthSchema),
    retry: false,
    staleTime: 15_000,
  });
  if (baseUrl === null) return "off";
  if (health.isPending) return "checking";
  return health.data?.status === "ok" ? "connected" : "unreachable";
}
