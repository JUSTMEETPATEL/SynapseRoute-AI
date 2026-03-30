import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDrivers() {
  return useQuery({
    queryKey: ["drivers"],
    queryFn: () => api.drivers.list(),
    select: (res) => res.data,
  });
}

export function useDriver(id: string) {
  return useQuery({
    queryKey: ["drivers", id],
    queryFn: () => api.drivers.get(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useDriverPositions() {
  return useQuery({
    queryKey: ["drivers", "positions"],
    queryFn: () => api.drivers.positions(),
    select: (res) => res.data,
    refetchInterval: 5_000, // Live tracking refresh
  });
}
