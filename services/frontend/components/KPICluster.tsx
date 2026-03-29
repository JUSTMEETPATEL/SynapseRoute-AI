"use client";

import { motion } from "framer-motion";
import { Car, Zap, ShieldAlert } from "lucide-react";

export function KPICluster() {
  return (
    <div className="absolute top-6 right-6 z-40 flex flex-col gap-3">
      <div className="flex gap-3">
        {/* Active Vehicles */}
        <div className="bg-zinc-950/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 w-40 shadow-xl flex flex-col gap-2">
          <div className="flex items-center text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <Car className="w-4 h-4 mr-2" /> Live Units
          </div>
          <div className="text-3xl font-mono text-zinc-100 font-bold">142</div>
        </div>

        {/* Efficiency */}
        <div className="bg-zinc-950/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 w-40 shadow-xl flex flex-col gap-2">
          <div className="flex items-center text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <Zap className="w-4 h-4 mr-2" /> Efficiency
          </div>
          <div className="text-3xl font-mono text-cyber-green font-bold">+18%</div>
        </div>
      </div>

      {/* AI Risk Factor */}
      <div className="relative bg-zinc-950/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 shadow-xl overflow-hidden group">
        {/* Glowing border effect simulation */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pulse-red/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />
        
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 mr-2 text-pulse-red" /> AI Risk Status
          </div>
          <span className="text-xs font-mono text-pulse-red bg-pulse-red/10 px-2 py-0.5 rounded">CRITICAL</span>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-mono text-zinc-100 font-bold">12<span className="text-base text-zinc-500 font-sans">%</span></div>
          <div className="text-xs text-zinc-400 mb-1">High-Risk Orders</div>
        </div>
      </div>
    </div>
  );
}
