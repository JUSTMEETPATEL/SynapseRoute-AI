"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Activity } from "lucide-react";
import { useDashboardStore, type ActiveTab } from "@/store/dashboard-store";

export function CommandPillNav() {
  const { activeTab, setActiveTab } = useDashboardStore();
  const tabs: ActiveTab[] = ["Live Map", "Order Matrix", "Analytics"];

  return (
    <div className="absolute top-6 left-6 z-40 flex items-center gap-4 bg-zinc-950/60 backdrop-blur-xl border border-zinc-800 rounded-full p-2 pr-6 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 ml-1">
        <Activity className="w-5 h-5 text-cyber-green animate-pulse" />
      </div>
      <div className="text-zinc-100 font-semibold tracking-wide flex items-center gap-2">
        <span>SynapseRoute</span>
        <span className="text-zinc-500 font-mono text-xs">v1.0</span>
      </div>
      
      <div className="w-px h-6 bg-zinc-800 mx-2" />

      <div className="flex items-center gap-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab ? "text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 bg-zinc-800/80 rounded-full -z-10"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
