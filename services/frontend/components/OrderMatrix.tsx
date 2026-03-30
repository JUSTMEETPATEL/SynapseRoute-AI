"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Package, Filter, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useOrders } from "@/lib/hooks/use-orders";
import { useDashboardStore } from "@/store/dashboard-store";
import type { OrderStatus, RiskTier } from "@/lib/types";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-cyber-yellow bg-cyber-yellow/10 border-cyber-yellow/20",
  ASSIGNED: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  IN_TRANSIT: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  DELIVERED: "text-cyber-green bg-cyber-green/10 border-cyber-green/20",
  FAILED: "text-pulse-red bg-pulse-red/10 border-pulse-red/20",
};

const RISK_COLORS: Record<string, string> = {
  LOW: "text-cyber-green bg-cyber-green/10",
  MEDIUM: "text-cyber-yellow bg-cyber-yellow/10",
  HIGH: "text-pulse-red bg-pulse-red/10",
};

export function OrderMatrix() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [riskFilter, setRiskFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const { openDrawer, setCreateOrderOpen } = useDashboardStore();

  const { data, isLoading } = useOrders({
    status: statusFilter || undefined,
    riskTier: riskFilter || undefined,
    page,
    limit: 15,
  });

  const orders = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="absolute inset-0 z-10 flex flex-col pt-24 px-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100">Order Matrix</h2>
          <p className="text-sm text-zinc-500">
            {pagination?.total ?? 0} orders · Page {pagination?.page ?? 1} of {pagination?.totalPages ?? 1}
          </p>
        </div>
        <button
          onClick={() => setCreateOrderOpen(true)}
          className="flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold py-2.5 px-5 rounded-xl transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          New Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-zinc-500" />

        {/* Status filter */}
        <div className="flex gap-1">
          {["", "PENDING", "ASSIGNED", "IN_TRANSIT", "DELIVERED", "FAILED"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1 text-xs font-mono rounded-lg transition-all ${
                statusFilter === s
                  ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-zinc-800 mx-2" />

        {/* Risk filter */}
        {["", "LOW", "MEDIUM", "HIGH"].map((r) => (
          <button
            key={r}
            onClick={() => { setRiskFilter(r); setPage(1); }}
            className={`px-3 py-1 text-xs font-mono rounded-lg transition-all ${
              riskFilter === r
                ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            {r || "Any Risk"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-zinc-950/60 backdrop-blur-xl border border-zinc-800 rounded-2xl">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <Package className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">No orders found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800">
              <tr className="text-left text-xs font-mono text-zinc-500 uppercase tracking-wider">
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Zone</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, i) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => openDrawer("order", order)}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-zinc-100 font-medium">{order.recipientName}</td>
                  <td className="px-4 py-3 text-zinc-400 max-w-[200px] truncate">{order.rawAddress}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono border ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {order.riskTier && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono ${RISK_COLORS[order.riskTier]}`}>
                        {order.riskTier}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{order.zone?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{order.assignedDriver?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs font-mono">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-zinc-400">
            {page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
            disabled={page === pagination.totalPages}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
