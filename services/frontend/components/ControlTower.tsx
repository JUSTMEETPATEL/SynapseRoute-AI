"use client";

import { useState } from "react";
import MapWrapper from "./MapWrapper";
import { CommandPillNav } from "./CommandPillNav";
import { KPICluster } from "./KPICluster";
import { SystemTelemetryLog } from "./SystemTelemetryLog";
import { EntityDrawer } from "./EntityDrawer";

export function ControlTower() {
  // For demonstration, we'll open the drawer after a short delay
  // In a real app, this would be triggered by clicking a map marker Event
  const [drawerOpen, setDrawerOpen] = useState(true);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#0A0A0A] text-zinc-100">
      {/* Z-0: The interactive map */}
      <MapWrapper />

      {/* Z-40 overlays */}
      <CommandPillNav />
      <KPICluster />
      
      <EntityDrawer 
        isOpen={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
      />
      
      <SystemTelemetryLog />
    </main>
  );
}
