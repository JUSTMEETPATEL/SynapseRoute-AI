"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Package, Loader2 } from "lucide-react";
import { useDashboardStore } from "@/store/dashboard-store";
import { useCreateOrder } from "@/lib/hooks/use-orders";
import type { LocationType, TimePreference } from "@/lib/types";

export function CreateOrderModal() {
  const { createOrderOpen, setCreateOrderOpen } = useDashboardStore();
  const createOrder = useCreateOrder();

  const [recipientName, setRecipientName] = useState("");
  const [address, setAddress] = useState("");
  const [locationType, setLocationType] = useState<LocationType>("RESIDENTIAL");
  const [timePreference, setTimePreference] = useState<TimePreference>("ASAP");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createOrder.mutateAsync({
      recipientName,
      address,
      locationType,
      timePreference,
    });
    // Reset and close
    setRecipientName("");
    setAddress("");
    setLocationType("RESIDENTIAL");
    setTimePreference("ASAP");
    setCreateOrderOpen(false);
  };

  return (
    <AnimatePresence>
      {createOrderOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCreateOrderOpen(false)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                  <Package className="w-5 h-5 text-zinc-100" />
                </div>
                <div>
                  <h3 className="text-zinc-100 font-semibold">New Order</h3>
                  <p className="text-xs text-zinc-500">Create a delivery order</p>
                </div>
              </div>
              <button
                onClick={() => setCreateOrderOpen(false)}
                className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Recipient */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-2">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Arjun Mehta"
                  required
                  minLength={2}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyber-green/50 focus:ring-1 focus:ring-cyber-green/20 transition-all text-sm"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-2">
                  Delivery Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 14 Anna Salai, Chennai, TN"
                  required
                  minLength={5}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyber-green/50 focus:ring-1 focus:ring-cyber-green/20 transition-all text-sm"
                />
              </div>

              {/* Location Type */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-2">
                  Location Type
                </label>
                <div className="flex gap-2">
                  {(["RESIDENTIAL", "COMMERCIAL"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setLocationType(type)}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
                        locationType === type
                          ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                          : "bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300"
                      }`}
                    >
                      {type.charAt(0) + type.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Preference */}
              <div>
                <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-2">
                  Time Preference
                </label>
                <div className="flex gap-2">
                  {(["ASAP", "SCHEDULED"] as const).map((pref) => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => setTimePreference(pref)}
                      className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
                        timePreference === pref
                          ? "bg-zinc-800 text-zinc-100 border border-zinc-700"
                          : "bg-zinc-900 text-zinc-500 border border-zinc-800 hover:text-zinc-300"
                      }`}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {createOrder.isError && (
                <div className="bg-pulse-red/10 border border-pulse-red/20 rounded-lg p-3 text-xs text-pulse-red">
                  Failed to create order. Please try again.
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={createOrder.isPending}
                className="w-full bg-zinc-100 hover:bg-white text-zinc-900 font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {createOrder.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Package className="w-4 h-4" />
                    Create Order
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
