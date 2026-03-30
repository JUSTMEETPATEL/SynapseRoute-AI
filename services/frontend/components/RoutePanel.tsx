"use client";

import { useState } from "react";
import { useRoutes, useOptimizeRoutes, useReroute } from "@/lib/hooks/use-routes";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Route, Driver, Order } from "@/lib/types";

// ─── Status Colors ───
const statusColors: Record<string, string> = {
  PLANNED: "var(--color-info, #3b82f6)",
  ACTIVE: "var(--color-success, #22c55e)",
  COMPLETED: "var(--color-muted, #6b7280)",
  PENDING: "var(--color-warning, #f59e0b)",
  FAILED: "var(--color-error, #ef4444)",
  SKIPPED: "var(--color-muted, #6b7280)",
};

export default function RoutePanel() {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);

  const { data: routes, isLoading, error } = useRoutes();
  const optimizeMutation = useOptimizeRoutes();
  const rerouteMutation = useReroute();

  // Fetch orders + drivers for the optimize modal
  const { data: pendingOrders } = useQuery({
    queryKey: ["orders", "pending"],
    queryFn: async () => {
      const res = await api.orders.list({ status: "PENDING", limit: 50 });
      return res.data;
    },
    enabled: showOptimizeModal,
  });

  const { data: drivers } = useQuery({
    queryKey: ["drivers"],
    queryFn: async () => {
      const res = await api.drivers.list();
      return res.data;
    },
    enabled: showOptimizeModal,
  });

  const selectedRoute = routes?.find((r: Route) => r.id === selectedRouteId);

  return (
    <div style={panelStyles.container}>
      {/* ─── Header ─── */}
      <div style={panelStyles.header}>
        <div>
          <h2 style={panelStyles.title}>Route Management</h2>
          <p style={panelStyles.subtitle}>
            {routes?.length ?? 0} active routes
          </p>
        </div>
        <button
          style={panelStyles.optimizeBtn}
          onClick={() => setShowOptimizeModal(true)}
        >
          <span style={{ fontSize: 16 }}>⚡</span> Optimize Routes
        </button>
      </div>

      {/* ─── Route List ─── */}
      <div style={panelStyles.routeList}>
        {isLoading && (
          <div style={panelStyles.emptyState}>
            <div style={panelStyles.spinner} />
            Loading routes...
          </div>
        )}

        {error && (
          <div style={{ ...panelStyles.emptyState, color: "var(--color-error, #ef4444)" }}>
            Failed to load routes
          </div>
        )}

        {!isLoading && routes?.length === 0 && (
          <div style={panelStyles.emptyState}>
            <span style={{ fontSize: 40, marginBottom: 8 }}>🗺️</span>
            <span>No routes yet</span>
            <span style={{ fontSize: 12, opacity: 0.6 }}>
              Click &quot;Optimize Routes&quot; to generate optimized delivery routes
            </span>
          </div>
        )}

        {routes?.map((route: Route) => (
          <RouteCard
            key={route.id}
            route={route}
            isSelected={selectedRouteId === route.id}
            onClick={() => setSelectedRouteId(selectedRouteId === route.id ? null : route.id)}
            onReroute={() => {
              rerouteMutation.mutate({ driverId: route.driverId, reason: "manual" });
            }}
            isRerouting={rerouteMutation.isPending}
          />
        ))}
      </div>

      {/* ─── Selected Route Detail ─── */}
      {selectedRoute && (
        <div style={panelStyles.detailPane}>
          <div style={panelStyles.detailHeader}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Stop Sequence</h3>
            <span style={{
              ...panelStyles.badge,
              background: statusColors[selectedRoute.status] ?? "#6b7280",
            }}>
              {selectedRoute.status}
            </span>
          </div>

          <div style={panelStyles.metaRow}>
            {selectedRoute.totalDistanceKm && (
              <span style={panelStyles.metaItem}>
                📍 {selectedRoute.totalDistanceKm.toFixed(1)} km
              </span>
            )}
            {selectedRoute.totalDurationMin && (
              <span style={panelStyles.metaItem}>
                ⏱️ {selectedRoute.totalDurationMin} min
              </span>
            )}
            {selectedRoute.confidenceScore && (
              <span style={{
                ...panelStyles.metaItem,
                color: selectedRoute.confidenceScore > 0.85
                  ? "var(--color-success, #22c55e)"
                  : "var(--color-warning, #f59e0b)",
              }}>
                🎯 {(selectedRoute.confidenceScore * 100).toFixed(0)}% confidence
              </span>
            )}
          </div>

          <div style={panelStyles.stopList}>
            {/* Depot */}
            <div style={panelStyles.stopItem}>
              <div style={panelStyles.stopDot("#3b82f6")} />
              <div style={panelStyles.stopLine} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>🏢 Depot</div>
                <div style={{ fontSize: 11, opacity: 0.5 }}>
                  {selectedRoute.depotLat?.toFixed(4)}, {selectedRoute.depotLng?.toFixed(4)}
                </div>
              </div>
            </div>

            {selectedRoute.stops.map((stop, idx) => (
              <div key={stop.id} style={panelStyles.stopItem}>
                <div style={panelStyles.stopDot(statusColors[stop.status] ?? "#6b7280")} />
                {idx < selectedRoute.stops.length - 1 && <div style={panelStyles.stopLine} />}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>
                    #{stop.sequence + 1} — {stop.order?.recipientName ?? stop.orderId.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.5 }}>
                    {stop.order?.rawAddress?.slice(0, 40) ?? "—"}
                    {stop.eta && ` • ETA ${new Date(stop.eta).toLocaleTimeString()}`}
                  </div>
                </div>
                <span style={{
                  ...panelStyles.statusDot,
                  background: statusColors[stop.status] ?? "#6b7280",
                }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Optimize Modal ─── */}
      {showOptimizeModal && (
        <OptimizeModal
          orders={pendingOrders ?? []}
          drivers={drivers ?? []}
          isLoading={optimizeMutation.isPending}
          onOptimize={(input) => {
            optimizeMutation.mutate(input, {
              onSuccess: () => setShowOptimizeModal(false),
            });
          }}
          onClose={() => setShowOptimizeModal(false)}
          result={optimizeMutation.data ?? null}
        />
      )}
    </div>
  );
}

// ─── Route Card Sub-component ───

function RouteCard({
  route,
  isSelected,
  onClick,
  onReroute,
  isRerouting,
}: {
  route: Route;
  isSelected: boolean;
  onClick: () => void;
  onReroute: () => void;
  isRerouting: boolean;
}) {
  const completedStops = route.stops.filter((s) => s.status === "COMPLETED").length;
  const totalStops = route.stops.length;
  const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

  return (
    <div
      style={{
        ...panelStyles.routeCard,
        borderColor: isSelected ? "var(--color-primary, #6366f1)" : "transparent",
        background: isSelected
          ? "rgba(99, 102, 241, 0.08)"
          : "rgba(255, 255, 255, 0.03)",
      }}
      onClick={onClick}
    >
      <div style={panelStyles.cardHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            ...panelStyles.badge,
            background: statusColors[route.status] ?? "#6b7280",
          }}>
            {route.status}
          </span>
          <span style={{ fontSize: 12, opacity: 0.6 }}>
            {route.driver?.name ?? route.driverId.slice(0, 8)}
          </span>
        </div>

        {route.confidenceScore && (
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: route.confidenceScore > 0.85
              ? "var(--color-success, #22c55e)"
              : "var(--color-warning, #f59e0b)",
          }}>
            {(route.confidenceScore * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div style={panelStyles.progressTrack}>
        <div style={{ ...panelStyles.progressFill, width: `${progress}%` }} />
      </div>

      <div style={panelStyles.cardFooter}>
        <span style={{ fontSize: 11, opacity: 0.5 }}>
          {completedStops}/{totalStops} stops
          {route.totalDistanceKm && ` • ${route.totalDistanceKm.toFixed(1)} km`}
        </span>
        {route.status === "ACTIVE" && (
          <button
            style={panelStyles.rerouteBtn}
            onClick={(e) => {
              e.stopPropagation();
              onReroute();
            }}
            disabled={isRerouting}
          >
            {isRerouting ? "..." : "🔄 Reroute"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Optimize Modal ───

function OptimizeModal({
  orders,
  drivers,
  isLoading,
  onOptimize,
  onClose,
  result,
}: {
  orders: Order[];
  drivers: Driver[];
  isLoading: boolean;
  onOptimize: (input: { orderIds: string[]; driverIds: string[]; depotLat: number; depotLng: number }) => void;
  onClose: () => void;
  result: { routes: Route[]; modelUsed: string; computationTimeMs: number } | null;
}) {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);

  // Chennai depot default
  const depotLat = 13.0827;
  const depotLng = 80.2707;

  const toggleOrder = (id: string) => {
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleDriver = (id: string) => {
    setSelectedDrivers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div style={panelStyles.modalOverlay} onClick={onClose}>
      <div style={panelStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>⚡ Optimize Routes</h3>
          <button style={panelStyles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {result ? (
          <div style={{ marginTop: 16 }}>
            <div style={{
              padding: 12, borderRadius: 8,
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
              marginBottom: 12,
            }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#22c55e" }}>
                ✅ Routes Optimized
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
                {result.routes.length} routes created using {result.modelUsed} in {result.computationTimeMs.toFixed(0)}ms
              </div>
            </div>
            <button style={panelStyles.optimizeBtn} onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Orders selection */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Pending Orders ({orders.length})
                <button
                  style={{ ...panelStyles.linkBtn, marginLeft: 8 }}
                  onClick={() =>
                    setSelectedOrders(
                      selectedOrders.length === orders.length
                        ? []
                        : orders.map((o) => o.id)
                    )
                  }
                >
                  {selectedOrders.length === orders.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div style={panelStyles.selectionList}>
                {orders.length === 0 && (
                  <div style={{ fontSize: 12, opacity: 0.5, padding: 12 }}>
                    No pending orders available
                  </div>
                )}
                {orders.map((order) => (
                  <label key={order.id} style={panelStyles.checkItem}>
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => toggleOrder(order.id)}
                    />
                    <span>{order.recipientName}</span>
                    <span style={{ fontSize: 11, opacity: 0.5, marginLeft: "auto" }}>
                      {order.zone?.name ?? "—"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Drivers selection */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Available Drivers ({drivers.length})
                <button
                  style={{ ...panelStyles.linkBtn, marginLeft: 8 }}
                  onClick={() =>
                    setSelectedDrivers(
                      selectedDrivers.length === drivers.length
                        ? []
                        : drivers.map((d) => d.id)
                    )
                  }
                >
                  {selectedDrivers.length === drivers.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div style={panelStyles.selectionList}>
                {drivers.map((driver) => (
                  <label key={driver.id} style={panelStyles.checkItem}>
                    <input
                      type="checkbox"
                      checked={selectedDrivers.includes(driver.id)}
                      onChange={() => toggleDriver(driver.id)}
                    />
                    <span>{driver.name}</span>
                    <span style={{
                      fontSize: 11, marginLeft: "auto",
                      color: driver.status === "IDLE" ? "#22c55e" : "#f59e0b",
                    }}>
                      {driver.status}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              style={{
                ...panelStyles.optimizeBtn,
                marginTop: 16,
                width: "100%",
                opacity: selectedOrders.length === 0 || selectedDrivers.length === 0 || isLoading ? 0.5 : 1,
              }}
              disabled={selectedOrders.length === 0 || selectedDrivers.length === 0 || isLoading}
              onClick={() =>
                onOptimize({
                  orderIds: selectedOrders,
                  driverIds: selectedDrivers,
                  depotLat,
                  depotLng,
                })
              }
            >
              {isLoading ? (
                <span>⏳ Optimizing...</span>
              ) : (
                <span>
                  ⚡ Optimize {selectedOrders.length} orders across {selectedDrivers.length} drivers
                </span>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Styles ───

const panelStyles = {
  container: {
    display: "flex",
    flexDirection: "column" as const,
    height: "100%",
    gap: 0,
  },
  header: {
    display: "flex",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    padding: "16px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: 0,
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  optimizeBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center" as const,
    gap: 6,
    transition: "all 0.2s",
  },
  routeList: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "12px 16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  emptyState: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 40,
    fontSize: 13,
    opacity: 0.6,
    gap: 4,
    textAlign: "center" as const,
  },
  spinner: {
    width: 24,
    height: 24,
    border: "2px solid rgba(255,255,255,0.1)",
    borderTopColor: "#6366f1",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  routeCard: {
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid transparent",
    cursor: "pointer",
    transition: "all 0.15s",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  badge: {
    fontSize: 10,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 4,
    color: "#fff",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    background: "rgba(255,255,255,0.06)",
    overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    background: "linear-gradient(90deg, #6366f1, #22c55e)",
    transition: "width 0.5s ease",
  },
  cardFooter: {
    display: "flex",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  rerouteBtn: {
    fontSize: 11,
    padding: "4px 10px",
    borderRadius: 6,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  detailPane: {
    borderTop: "1px solid rgba(255,255,255,0.06)",
    padding: "16px 20px",
    maxHeight: 300,
    overflowY: "auto" as const,
  },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 12,
  },
  metaRow: {
    display: "flex",
    gap: 16,
    marginBottom: 12,
    flexWrap: "wrap" as const,
  },
  metaItem: {
    fontSize: 12,
    fontWeight: 500,
  },
  stopList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 0,
  },
  stopItem: {
    display: "flex",
    alignItems: "flex-start" as const,
    gap: 10,
    padding: "8px 0",
    position: "relative" as const,
  },
  stopDot: (color: string) => ({
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: color,
    marginTop: 3,
    flexShrink: 0,
    zIndex: 1,
  }),
  stopLine: {
    position: "absolute" as const,
    left: 4,
    top: 15,
    bottom: -8,
    width: 2,
    background: "rgba(255,255,255,0.08)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: 4,
  },
  // Modal
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    zIndex: 1000,
  },
  modal: {
    background: "var(--color-surface, #1a1a2e)",
    borderRadius: 16,
    padding: 24,
    width: 480,
    maxHeight: "80vh",
    overflowY: "auto" as const,
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "inherit",
    fontSize: 18,
    cursor: "pointer",
    opacity: 0.5,
    padding: 4,
  },
  selectionList: {
    maxHeight: 160,
    overflowY: "auto" as const,
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.06)",
  },
  checkItem: {
    display: "flex",
    alignItems: "center" as const,
    gap: 8,
    padding: "8px 12px",
    fontSize: 13,
    cursor: "pointer",
    borderBottom: "1px solid rgba(255,255,255,0.03)",
    transition: "background 0.1s",
  },
  linkBtn: {
    background: "none",
    border: "none",
    color: "#6366f1",
    fontSize: 12,
    cursor: "pointer",
    padding: 0,
    textDecoration: "underline" as const,
  },
};
