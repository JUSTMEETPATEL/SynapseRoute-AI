import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => api.analytics.summary(),
    select: (res) => res.data,
    refetchInterval: 15_000, // Auto-refresh every 15s
  });
}
