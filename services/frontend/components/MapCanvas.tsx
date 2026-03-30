"use client";

import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useDriverPositions } from "@/lib/hooks/use-drivers";
import { useOrders } from "@/lib/hooks/use-orders";
import { useDashboardStore } from "@/store/dashboard-store";
import type { DriverPosition, Order } from "@/lib/types";

// ─── Chennai Center ───
const CHENNAI_CENTER: [number, number] = [13.0827, 80.2707];
const DEFAULT_ZOOM = 12;

// ─── Custom Icons ───
const DriverIcon = (status: string) =>
  L.divIcon({
    className: "bg-transparent border-none",
    html: `<div class="relative flex items-center justify-center">
      <div class="w-8 h-8 rounded-full ${
        status === "ON_ROUTE"
          ? "bg-cyber-green/20 border-2 border-cyber-green shadow-[0_0_12px_#00E599]"
          : "bg-zinc-700/50 border-2 border-zinc-500"
      } flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${
          status === "ON_ROUTE" ? "#00E599" : "#a1a1aa"
        }" stroke-width="2"><path d="M12 2L19 21l-7-4-7 4 7-19z"/></svg>
      </div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const HighRiskIcon = L.divIcon({
  className: "bg-transparent border-none",
  html: `<div class="relative flex items-center justify-center">
    <div class="w-4 h-4 rounded-full bg-pulse-red/80 animate-ping absolute"></div>
    <div class="w-4 h-4 rounded-full bg-pulse-red shadow-[0_0_15px_#FF2A55]"></div>
  </div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const OrderIcon = (riskTier: string | null) =>
  L.divIcon({
    className: "bg-transparent border-none",
    html: `<div class="w-3 h-3 rounded-full ${
      riskTier === "HIGH"
        ? "bg-pulse-red shadow-[0_0_8px_#FF2A55]"
        : riskTier === "MEDIUM"
        ? "bg-cyber-yellow shadow-[0_0_8px_#FFD600]"
        : "bg-cyber-green/60"
    } border border-white/20"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

export default function MapCanvas() {
  const [mounted, setMounted] = useState(false);
  const { data: positions } = useDriverPositions();
  const { data: ordersData } = useOrders({ limit: 100 });
  const { openDrawer } = useDashboardStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const orders = ordersData?.data ?? [];
  const drivers = positions ?? [];

  // Filter to only orders with coordinates
  const mappableOrders = useMemo(
    () => orders.filter((o) => o.lat !== null && o.lng !== null),
    [orders]
  );

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-0">
      <MapContainer
        center={CHENNAI_CENTER}
        zoom={DEFAULT_ZOOM}
        zoomControl={false}
        className="w-full h-full bg-[#0A0A0A]"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* ─── Driver Markers ─── */}
        {drivers.map((driver: DriverPosition) => {
          if (!driver.currentLat || !driver.currentLng) return null;
          return (
            <Marker
              key={`driver-${driver.id}`}
              position={[driver.currentLat, driver.currentLng]}
              icon={DriverIcon(driver.status)}
              eventHandlers={{
                click: () => {
                  openDrawer("driver", driver as any);
                },
              }}
            >
              <Tooltip
                direction="top"
                offset={[0, -20]}
                className="!bg-zinc-900 !border-zinc-700 !text-zinc-100 !rounded-lg !px-3 !py-1.5 !text-xs !font-mono !shadow-xl"
              >
                <span className="font-semibold">{driver.name}</span>
                <span className="text-zinc-400 ml-2">{driver.status}</span>
              </Tooltip>
            </Marker>
          );
        })}

        {/* ─── Order Markers ─── */}
        {mappableOrders.map((order: Order) => (
          <Marker
            key={`order-${order.id}`}
            position={[order.lat!, order.lng!]}
            icon={order.riskTier === "HIGH" ? HighRiskIcon : OrderIcon(order.riskTier)}
            eventHandlers={{
              click: () => {
                openDrawer("order", order);
              },
            }}
          >
            <Tooltip
              direction="top"
              offset={[0, -10]}
              className="!bg-zinc-900 !border-zinc-700 !text-zinc-100 !rounded-lg !px-3 !py-1.5 !text-xs !font-mono !shadow-xl"
            >
              <span className="font-semibold">{order.recipientName}</span>
              <span className="text-zinc-400 ml-2">{order.status}</span>
              {order.riskTier && (
                <span className={`ml-2 ${
                  order.riskTier === "HIGH" ? "text-pulse-red" :
                  order.riskTier === "MEDIUM" ? "text-cyber-yellow" : "text-cyber-green"
                }`}>
                  {order.riskTier}
                </span>
              )}
            </Tooltip>
          </Marker>
        ))}

        {/* ─── Zone Circles ─── */}
        {ordersData?.data && (
          <ZoneOverlays />
        )}
      </MapContainer>
    </div>
  );
}

function ZoneOverlays() {
  // Chennai zone centers (from seed data)
  const zones = [
    { name: "Chennai Central", lat: 13.0827, lng: 80.2707, color: "#00E599" },
    { name: "T. Nagar", lat: 13.0418, lng: 80.2341, color: "#FFD600" },
    { name: "Adyar", lat: 13.0012, lng: 80.2565, color: "#00E599" },
    { name: "Anna Nagar", lat: 13.0850, lng: 80.2101, color: "#FFD600" },
    { name: "Velachery", lat: 12.9815, lng: 80.2180, color: "#FF2A55" },
    { name: "Mylapore", lat: 13.0368, lng: 80.2676, color: "#00E599" },
  ];

  return (
    <>
      {zones.map((zone) => (
        <CircleMarker
          key={zone.name}
          center={[zone.lat, zone.lng]}
          radius={25}
          pathOptions={{
            color: zone.color,
            fillColor: zone.color,
            fillOpacity: 0.05,
            weight: 1,
            opacity: 0.3,
          }}
        >
          <Tooltip
            permanent
            direction="center"
            className="!bg-transparent !border-none !text-zinc-500 !text-[10px] !font-mono !shadow-none"
          >
            {zone.name}
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}
