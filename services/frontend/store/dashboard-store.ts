import { create } from "zustand";
import type { Order, Driver } from "@/lib/types";

export type ActiveTab = "Live Map" | "Order Matrix" | "Analytics";

interface DashboardState {
  // Active view
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;

  // Entity drawer
  drawerOpen: boolean;
  selectedEntity: { type: "order" | "driver"; data: Order | Driver } | null;
  openDrawer: (type: "order" | "driver", data: Order | Driver) => void;
  closeDrawer: () => void;

  // Create order modal
  createOrderOpen: boolean;
  setCreateOrderOpen: (open: boolean) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeTab: "Live Map",
  setActiveTab: (tab) => set({ activeTab: tab }),

  drawerOpen: false,
  selectedEntity: null,
  openDrawer: (type, data) =>
    set({ drawerOpen: true, selectedEntity: { type, data } }),
  closeDrawer: () => set({ drawerOpen: false, selectedEntity: null }),

  createOrderOpen: false,
  setCreateOrderOpen: (open) => set({ createOrderOpen: open }),
}));
