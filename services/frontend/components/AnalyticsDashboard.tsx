"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  Package,
  AlertTriangle,
  MapPin,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Truck,
} from "lucide-react";
import { useAnalytics } from "@/lib/hooks/use-analytics";

export function AnalyticsDashboard() {
  const { data: analytics, isLoading } = useAnalytics();

  if (isLoading) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center pt-20">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!analytics) return null;

  const { totals, rates, risk, zones, recentEvents } = analytics;

  return (
    <div className="absolute inset-0 z-10 pt-24 px-6 pb-6 overflow-auto">
      {/* Section title */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-zinc-100">Analytics</h2>
        <p className="text-sm text-zinc-500">Real-time operational intelligence</p>
      </div>

      {/* ─── Top KPI Row ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Package className="w-5 h-5" />}
          label="Total Orders"
          value={totals.orders}
          color="text-zinc-100"
          delay={0}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Delivered"
          value={totals.delivered}
          color="text-cyber-green"
          delay={0.05}
        />
        <StatCard
          icon={<XCircle className="w-5 h-5" />}
          label="Failed"
          value={totals.failed}
          color="text-pulse-red"
          delay={0.1}
        />
        <StatCard
          icon={<Truck className="w-5 h-5" />}
          label="In Transit"
          value={totals.inTransit}
          color="text-cyan-400"
          delay={0.15}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Success Rate ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-950/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center"
        >
          <div className="relative w-32 h-32 mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke="#27272a"
                strokeWidth="8"
              />
              <circle
                cx="50" cy="50" r="42"
                fill="none"
                stroke="#00E599"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${rates.deliverySuccessRate * 2.64} 264`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-mono font-bold text-zinc-100">
                {rates.deliverySuccessRate}
              </span>
              <span className="text-xs text-zinc-500">%</span>
            </div>
          </div>
          <div className="text-xs uppercase tracking-wider font-semibold text-zinc-500">
            Delivery Success Rate
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            Avg Driver: {rates.avgDriverSuccessRate}%
          </div>
        </motion.div>

        {/* ─── Risk Distribution ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-zinc-950/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6"
        >
          <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Risk Distribution
          </h3>

          <div className="space-y-4">
            <RiskBar label="Low Risk" count={risk.low} total={totals.orders} color="bg-cyber-green" />
            <RiskBar label="Medium Risk" count={risk.medium} total={totals.orders} color="bg-cyber-yellow" />
            <RiskBar label="High Risk" count={risk.high} total={totals.orders} color="bg-pulse-red" />
          </div>

          {/* Status breakdown */}
          <div className="mt-6 pt-4 border-t border-zinc-800 grid grid-cols-3 gap-3">
            <MiniStat label="Pending" value={totals.pending} color="text-cyber-yellow" />
            <MiniStat label="Assigned" value={totals.assigned} color="text-blue-400" />
            <MiniStat label="Active" value={totals.inTransit} color="text-cyan-400" />
          </div>
        </motion.div>

        {/* ─── Zone Performance ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-950/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6"
        >
          <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Zone Performance
          </h3>
          <div className="space-y-3">
            {zones.map((zone) => (
              <div key={zone.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                <div>
                  <div className="text-sm text-zinc-200">{zone.name}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {zone.orderCount} orders
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      zone.failureRate > 0.08
                        ? "bg-pulse-red"
                        : zone.failureRate > 0.05
                        ? "bg-cyber-yellow"
                        : "bg-cyber-green"
                    }`}
                  />
                  <span className={`text-xs font-mono ${
                    zone.failureRate > 0.08
                      ? "text-pulse-red"
                      : zone.failureRate > 0.05
                      ? "text-cyber-yellow"
                      : "text-cyber-green"
                  }`}>
                    {(zone.failureRate * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── Recent Events ─── */}
      {recentEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-6 bg-zinc-950/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6"
        >
          <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Recent Events
          </h3>
          <div className="space-y-2">
            {recentEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    event.eventType === "DELIVERED" ? "bg-cyber-green" :
                    event.eventType === "FAILED" ? "bg-pulse-red" :
                    "bg-cyber-yellow"
                  }`} />
                  <div>
                    <span className="text-sm text-zinc-200">{event.recipientName}</span>
                    <span className="text-xs text-zinc-500 ml-2">{event.eventType}</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Sub-components ───

function StatCard({ icon, label, value, color, delay }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-zinc-950/60 backdrop-blur-xl border border-zinc-800 rounded-2xl p-4"
    >
      <div className="flex items-center text-zinc-400 text-xs font-medium uppercase tracking-wider mb-2">
        {icon}
        <span className="ml-2">{label}</span>
      </div>
      <div className={`text-3xl font-mono font-bold ${color}`}>{value}</div>
    </motion.div>
  );
}

function RiskBar({ label, count, total, color }: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-zinc-400">{label}</span>
        <span className="text-zinc-300 font-mono">{count}</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-mono font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
