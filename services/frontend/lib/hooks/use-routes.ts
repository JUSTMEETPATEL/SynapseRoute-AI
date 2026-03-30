"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Route, OptimizeRouteInput, OptimizeRouteResponse } from "@/lib/types";

// ─── Fetch all routes ───

export function useRoutes(params?: { driverId?: string; status?: string }) {
  return useQuery({
    queryKey: ["routes", params],
    queryFn: async () => {
      const res = await api.routes.list(params);
      return res.data;
    },
    refetchInterval: 15_000, // refresh every 15s
  });
}

// ─── Optimize routes mutation ───

export function useOptimizeRoutes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: OptimizeRouteInput) => {
      const res = await api.routes.optimize(input);
      return res.data;
    },
    onSuccess: () => {
      // Invalidate routes + orders (orders get assigned)
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

// ─── Reroute mutation ───

export function useReroute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      driverId,
      reason,
    }: {
      driverId: string;
      reason?: string;
    }) => {
      const res = await api.routes.reroute(driverId, reason);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routes"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
