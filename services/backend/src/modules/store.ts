import { randomUUID } from "node:crypto";

export type Order = {
  id: string;
  recipientName: string;
  address: string;
  locationType: "home" | "apartment" | "office";
  timePreference: string;
  lat?: number;
  lng?: number;
  riskScore?: number;
  status: "pending" | "in_progress" | "failed" | "delivered";
  createdAt: string;
};

const orders = new Map<string, Order>();

export function createOrder(input: Omit<Order, "id" | "status" | "createdAt">): Order {
  const order: Order = {
    id: randomUUID(),
    status: "pending",
    createdAt: new Date().toISOString(),
    ...input
  };
  orders.set(order.id, order);
  return order;
}

export function listOrders(): Order[] {
  return [...orders.values()];
}

export function updateOrder(id: string, patch: Partial<Order>): Order | undefined {
  const current = orders.get(id);
  if (!current) {
    return undefined;
  }
  const next = { ...current, ...patch };
  orders.set(id, next);
  return next;
}
