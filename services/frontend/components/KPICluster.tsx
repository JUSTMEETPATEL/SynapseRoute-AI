"use client";

import { motion } from "framer-motion";
import { Car, Zap, ShieldAlert, Loader2 } from "lucide-react";
import { useAnalytics } from "@/lib/hooks/use-analytics";

export function KPICluster() {
  const { data: analytics, isLoading } = useAnalytics();

  const totalOrders = analytics?.totals.orders ?? 0;
  const successRate = analytics?.rates.deliverySuccessRate ?? 0;
  const highRisk = analytics?.risk.high ?? 0;
  const totalRiskOrders = (analytics?.risk.low ?? 0) + (analytics?.risk.medium ?? 0) + highRisk;
  const highRiskPct = totalRiskOrders > 0 ? Math.round((highRisk / totalRiskOrders) * 100) : 0;

  const riskLevel = highRiskPct > 20 ? "CRITICAL" : highRiskPct > 10 ? "ELEVATED" : "NORMAL";
  const riskColor = highRiskPct > 20 ? "text-pulse-red" : highRiskPct > 10 ? "text-cyber-yellow" : "text-cyber-green";

  return (
    <div className="absolute top-6 right-6 z-40 flex flex-col gap-3">
      <div className="flex gap-3">
        {/* Active Orders */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-950/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 w-40 shadow-xl flex flex-col gap-2"
        >
          <div className="flex items-center text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <Car className="w-4 h-4 mr-2" /> Orders
          </div>
          <div className="text-3xl font-mono text-zinc-100 font-bold">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            ) : (
              totalOrders
            )}
          </div>
          <div className="text-[10px] font-mono text-zinc-500">
            {analytics?.totals.pending ?? 0} pending · {analytics?.totals.inTransit ?? 0} active
          </div>
        </motion.div>

        {/* Success Rate */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-950/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 w-40 shadow-xl flex flex-col gap-2"
        >
          <div className="flex items-center text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <Zap className="w-4 h-4 mr-2" /> Success
          </div>
          <div className="text-3xl font-mono text-cyber-green font-bold">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            ) : (
              `${successRate}%`
            )}
          </div>
          <div className="text-[10px] font-mono text-zinc-500">
            {analytics?.totals.delivered ?? 0} delivered · {analytics?.totals.failed ?? 0} failed
          </div>
        </motion.div>
      </div>

      {/* AI Risk Factor */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="relative bg-zinc-950/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4 shadow-xl overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-pulse-red/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />

        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center text-zinc-400 text-xs font-medium uppercase tracking-wider">
            <ShieldAlert className={`w-4 h-4 mr-2 ${riskColor}`} /> AI Risk Status
          </div>
          <span className={`text-xs font-mono ${riskColor} bg-pulse-red/10 px-2 py-0.5 rounded`}>
            {riskLevel}
          </span>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-mono text-zinc-100 font-bold">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            ) : (
              <>
                {highRisk}
                <span className="text-base text-zinc-500 font-sans ml-1">high-risk</span>
              </>
            )}
          </div>
          <div className="text-xs text-zinc-400 mb-1">
            {analytics?.risk.medium ?? 0} medium · {analytics?.risk.low ?? 0} low
          </div>
        </div>
      </motion.div>
    </div>
  );
}
