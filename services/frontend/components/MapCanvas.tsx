"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icons in Leaflet
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom animated pulsing marker for High Risk
const PulsingIcon = L.divIcon({
  className: "bg-transparent border-none",
  html: `<div class="w-4 h-4 rounded-full bg-pulse-red/80 animate-ping absolute"></div><div class="w-4 h-4 rounded-full bg-pulse-red absolute shadow-[0_0_15px_#FF2A55]"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default function MapCanvas() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-0">
      <MapContainer
        center={[37.7749, -122.4194]} // San Francisco default
        zoom={13}
        zoomControl={false}
        className="w-full h-full bg-[#0A0A0A]"
      >
        {/* CartoDB Dark Matter */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <Marker position={[37.7749, -122.4194]}>
          <Popup className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-zinc-100 rounded-lg">
            Delivery HQ
          </Popup>
        </Marker>

        {/* Example High Risk Marker */}
        <Marker position={[37.7649, -122.4294]} icon={PulsingIcon} />
      </MapContainer>
    </div>
  );
}
