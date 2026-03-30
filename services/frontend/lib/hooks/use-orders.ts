import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateOrderInput } from "@/lib/types";

export function useOrders(params?: {
  status?: string;
  riskTier?: string;
  zoneId?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["orders", params],
    queryFn: () => api.orders.list(params),
    refetchInterval: 30_000,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => api.orders.get(id),
    select: (res) => res.data,
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateOrderInput) => api.orders.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.orders.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });
}
