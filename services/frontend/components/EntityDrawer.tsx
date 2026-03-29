"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Navigation2, MoreHorizontal } from "lucide-react";

export function EntityDrawer({ 
  isOpen, 
  onClose,
  entity = null
}: { 
  isOpen: boolean;
  onClose: () => void;
  entity?: any;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
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
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                <Navigation2 className="w-5 h-5 text-zinc-100" />
              </div>
              <div>
                <h3 className="text-zinc-100 font-semibold">{entity?.name || "Driver CH-990"}</h3>
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                  <span>ETA 14:02</span>
                  <span className="w-1 h-1 rounded-full bg-zinc-600" />
                  <span className="text-cyber-green">ON TIME</span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 flex flex-col gap-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wider font-semibold text-zinc-500">Next Destination</div>
              <div className="text-sm text-zinc-200">944 Market St, San Francisco, CA 94102</div>
            </div>

            <div className="bg-pulse-red/10 border border-pulse-red/20 rounded-lg p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-pulse-red uppercase tracking-wider">Prediction</span>
                <span className="text-xs font-mono text-pulse-red">78% RISK</span>
              </div>
              <p className="text-xs text-pulse-red/80">High risk of failure due to historic traffic anomalies and current congestion patterns.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button className="py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-900 text-sm font-semibold rounded-lg transition-colors flex justify-center items-center">
                Trigger Re-route
              </button>
              <button className="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 text-sm font-semibold rounded-lg transition-colors flex justify-center items-center">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
