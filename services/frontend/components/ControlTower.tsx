"use client";

import MapWrapper from "./MapWrapper";
import { CommandPillNav } from "./CommandPillNav";
import { KPICluster } from "./KPICluster";
import { SystemTelemetryLog } from "./SystemTelemetryLog";
import { EntityDrawer } from "./EntityDrawer";
import { OrderMatrix } from "./OrderMatrix";
import { AnalyticsDashboard } from "./AnalyticsDashboard";
import { CreateOrderModal } from "./CreateOrderModal";
import RoutePanel from "./RoutePanel";
import { useDashboardStore } from "@/store/dashboard-store";

export function ControlTower() {
  const { activeTab } = useDashboardStore();

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0A0A0A] text-zinc-100">
      {/* Navigation — always visible */}
      <CommandPillNav />

      {/* Main content — switches by tab */}
      {activeTab === "Live Map" && (
        <>
          <MapWrapper />
          <KPICluster />
          <EntityDrawer />
          <SystemTelemetryLog />
        </>
      )}

      {activeTab === "Order Matrix" && (
        <>
          <OrderMatrix />
          <EntityDrawer />
        </>
      )}

      {activeTab === "Routes" && (
        <div className="pt-24 px-6 h-full">
          <RoutePanel />
        </div>
      )}

      {activeTab === "Analytics" && (
        <AnalyticsDashboard />
      )}

      {/* Create order modal — global */}
      <CreateOrderModal />
    </main>
  );
}

