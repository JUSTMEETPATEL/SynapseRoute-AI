"use client";

import { useEffect, useRef } from "react";
import { Terminal, Wifi, WifiOff } from "lucide-react";
import { useSocketStore, useSocket } from "@/lib/hooks/use-socket";

export function SystemTelemetryLog() {
  const { telemetryLogs, isConnected } = useSocketStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize WebSocket connections
  useSocket();

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [telemetryLogs]);

  // Show initial placeholder if no events yet
  const logs = telemetryLogs.length > 0
    ? telemetryLogs
    : [
        `[${new Date().toLocaleTimeString("en-US", { hour12: false })}] SYS_INIT: Waiting for events...`,
      ];

  return (
    <div className="absolute bottom-6 right-6 z-40 w-96 bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 rounded-lg shadow-2xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between bg-zinc-900/50 px-3 py-2 border-b border-zinc-800">
        <div className="flex items-center">
          <Terminal className="w-4 h-4 text-zinc-400 mr-2" />
          <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Sys_Log</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            <Wifi className="w-3 h-3 text-cyber-green" />
          ) : (
            <WifiOff className="w-3 h-3 text-pulse-red" />
          )}
          <span className={`text-[10px] font-mono ${isConnected ? "text-cyber-green" : "text-pulse-red"}`}>
            {isConnected ? "LIVE" : "OFFLINE"}
          </span>
        </div>
      </div>
      <div 
        ref={containerRef}
        className="p-3 h-40 overflow-y-auto space-y-1 font-mono text-[10px] sm:text-xs text-zinc-300 scroll-smooth"
      >
        {logs.map((log, i) => (
          <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {log.includes("RISK_ALERT") || log.includes("WARN") || log.includes("✗") ? (
              <span className="text-pulse-red">{log}</span>
            ) : log.includes("DELIVERED") || log.includes("✓") || log.includes("TRACK:") ? (
              <span className="text-cyber-green">{log}</span>
            ) : log.includes("DATA_SYNC") || log.includes("SYS_INIT") ? (
              <span className="text-cyber-yellow">{log}</span>
            ) : (
              log
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
