"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Navigation2, MoreHorizontal, Package, MapPin, Clock, AlertTriangle } from "lucide-react";
import { useDashboardStore } from "@/store/dashboard-store";
import type { Driver, Order } from "@/lib/types";

export function EntityDrawer() {
  const { drawerOpen, selectedEntity, closeDrawer } = useDashboardStore();

  if (!selectedEntity) return null;

  const isDriver = selectedEntity.type === "driver";
  const entity = selectedEntity.data;

  return (
    <AnimatePresence>
      {drawerOpen && (
        <motion.div
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "-100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          className="absolute bottom-6 left-6 z-40 w-[380px] bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-800/50 bg-zinc-900/30">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isDriver ? "bg-zinc-800" : "bg-zinc-800"
              }`}>
                {isDriver ? (
                  <Navigation2 className="w-5 h-5 text-zinc-100" />
                ) : (
                  <Package className="w-5 h-5 text-zinc-100" />
                )}
              </div>
              <div>
                <h3 className="text-zinc-100 font-semibold">
                  {isDriver
                    ? (entity as Driver).name
                    : (entity as Order).recipientName}
                </h3>
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                  {isDriver ? (
                    <>
                      <span className={`${
                        (entity as Driver).status === "ON_ROUTE" ? "text-cyber-green" : "text-zinc-400"
                      }`}>
                        {(entity as Driver).status}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-zinc-600" />
                      <span>{(entity as Driver).successRate}% success</span>
                    </>
                  ) : (
                    <>
                      <StatusBadge status={(entity as Order).status} />
                      {(entity as Order).riskTier && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-zinc-600" />
                          <RiskBadge tier={(entity as Order).riskTier!} />
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            <button 
              onClick={closeDrawer}
              className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 flex flex-col gap-4">
            {isDriver ? (
              <DriverDetails driver={entity as Driver} />
            ) : (
              <OrderDetails order={entity as Order} />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DriverDetails({ driver }: { driver: Driver }) {
  return (
    <>
      <InfoRow
        icon={<MapPin className="w-4 h-4" />}
        label="Current Position"
        value={
          driver.currentLat && driver.currentLng
            ? `${driver.currentLat.toFixed(4)}, ${driver.currentLng.toFixed(4)}`
            : "Unknown"
        }
      />
      <InfoRow
        icon={<Package className="w-4 h-4" />}
        label="Active Orders"
        value={`${driver._count?.orders ?? 0} orders`}
      />
      <InfoRow
        icon={<Navigation2 className="w-4 h-4" />}
        label="Active Routes"
        value={`${driver._count?.routes ?? 0} routes`}
      />

      <div className="grid grid-cols-2 gap-2 mt-2">
        <button
          className="py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-semibold rounded-lg transition-colors flex justify-center items-center"
          onClick={() => {/* TODO: api.routes.reroute(driver.id) */}}
        >
          Trigger Re-route
        </button>
        <button className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm font-semibold rounded-lg transition-colors flex justify-center items-center">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}

function OrderDetails({ order }: { order: Order }) {
  return (
    <>
      <InfoRow
        icon={<MapPin className="w-4 h-4" />}
        label="Address"
        value={order.rawAddress}
      />
      <InfoRow
        icon={<Clock className="w-4 h-4" />}
        label="Created"
        value={new Date(order.createdAt).toLocaleString()}
      />
      {order.zone && (
        <InfoRow
          icon={<Navigation2 className="w-4 h-4" />}
          label="Zone"
          value={order.zone.name}
        />
      )}
      {order.assignedDriver && (
        <InfoRow
          icon={<Package className="w-4 h-4" />}
          label="Driver"
          value={order.assignedDriver.name}
        />
      )}

      {/* Risk card */}
      {order.failureProb !== null && order.failureProb > 0.3 && (
        <div className="bg-pulse-red/10 border border-pulse-red/20 rounded-lg p-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-pulse-red uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Prediction
            </span>
            <span className="text-xs font-mono text-pulse-red">
              {Math.round(order.failureProb * 100)}% RISK
            </span>
          </div>
          <p className="text-xs text-pulse-red/80">
            High risk of delivery failure based on zone history and current conditions.
          </p>
        </div>
      )}
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-zinc-500 mt-0.5">{icon}</div>
      <div>
        <div className="text-xs uppercase tracking-wider font-semibold text-zinc-500">{label}</div>
        <div className="text-sm text-zinc-200">{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "text-cyber-yellow bg-cyber-yellow/10",
    ASSIGNED: "text-blue-400 bg-blue-400/10",
    IN_TRANSIT: "text-cyber-green bg-cyber-green/10",
    DELIVERED: "text-cyber-green bg-cyber-green/10",
    FAILED: "text-pulse-red bg-pulse-red/10",
  };
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${colors[status] ?? "text-zinc-400"}`}>
      {status}
    </span>
  );
}

function RiskBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    LOW: "text-cyber-green",
    MEDIUM: "text-cyber-yellow",
    HIGH: "text-pulse-red",
  };
  return <span className={`text-[10px] font-mono ${colors[tier] ?? "text-zinc-400"}`}>{tier} RISK</span>;
}
