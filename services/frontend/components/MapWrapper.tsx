"use client";

import dynamic from "next/dynamic";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 z-0 bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-zinc-500 font-mono text-sm animate-pulse">
        INITIALIZING SPATIAL MATRIX...
      </div>
    </div>
  ),
});

export default function MapWrapper() {
  return <MapCanvas />;
}
