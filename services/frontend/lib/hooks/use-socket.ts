"use client";

import { useEffect, useRef, useCallback } from "react";
import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import type { DriverMovedEvent, DeliveryEventWS, RiskAlertWS } from "@/lib/types";

// ─── WebSocket Event Store ───
interface SocketState {
  isConnected: boolean;
  telemetryLogs: string[];
  driverPositions: Map<string, DriverMovedEvent>;

  addLog: (log: string) => void;
  updateDriverPosition: (event: DriverMovedEvent) => void;
  setConnected: (status: boolean) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  isConnected: false,
  telemetryLogs: [],
  driverPositions: new Map(),

  addLog: (log) =>
    set((state) => ({
      telemetryLogs: [...state.telemetryLogs.slice(-50), log], // Keep last 50
    })),

  updateDriverPosition: (event) =>
    set((state) => {
      const positions = new Map(state.driverPositions);
      positions.set(event.driverId, event);
      return { driverPositions: positions };
    }),

  setConnected: (status) => set({ isConnected: status }),
}));

// ─── Socket Connection Hook ───
const GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function useSocket() {
  const trackingRef = useRef<Socket | null>(null);
  const notificationsRef = useRef<Socket | null>(null);
  const dashboardRef = useRef<Socket | null>(null);

  const { addLog, updateDriverPosition, setConnected } = useSocketStore();

  const formatTime = useCallback(() => {
    return new Date().toLocaleTimeString("en-US", { hour12: false });
  }, []);

  useEffect(() => {
    // ─── /tracking namespace ───
    const tracking = io(`${GATEWAY_URL}/tracking`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    trackingRef.current = tracking;

    tracking.on("connect", () => {
      setConnected(true);
      addLog(`[${formatTime()}] SYS_INIT: Connected to tracking feed.`);
    });

    tracking.on("driver:moved", (data: DriverMovedEvent) => {
      updateDriverPosition(data);
      addLog(`[${formatTime()}] TRACK: ${data.name ?? data.driverId} → (${data.lat.toFixed(4)}, ${data.lng.toFixed(4)})`);
    });

    tracking.on("disconnect", () => {
      setConnected(false);
      addLog(`[${formatTime()}] WARN: Tracking feed disconnected.`);
    });

    // ─── /notifications namespace ───
    const notifications = io(`${GATEWAY_URL}/notifications`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    notificationsRef.current = notifications;

    notifications.on("delivery:event", (data: DeliveryEventWS) => {
      const icon = data.eventType === "DELIVERED" ? "✓" : data.eventType === "FAILED" ? "✗" : "→";
      addLog(`[${formatTime()}] ${icon} DELIVERY: ${data.recipientName} — ${data.eventType}`);
    });

    notifications.on("risk:alert", (data: RiskAlertWS) => {
      addLog(`[${formatTime()}] ⚠ RISK_ALERT: ${data.recipientName} — ${(data.failureProbability * 100).toFixed(0)}% failure, tier ${data.riskTier}`);
    });

    // ─── /dashboard namespace ───
    const dashboard = io(`${GATEWAY_URL}/dashboard`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
    dashboardRef.current = dashboard;

    dashboard.on("analytics:update", () => {
      addLog(`[${formatTime()}] DATA_SYNC: Analytics refreshed.`);
    });

    // ─── Cleanup ───
    return () => {
      tracking.disconnect();
      notifications.disconnect();
      dashboard.disconnect();
    };
  }, [addLog, updateDriverPosition, setConnected, formatTime]);

  return {
    tracking: trackingRef.current,
    notifications: notificationsRef.current,
    dashboard: dashboardRef.current,
  };
}
