"use client";

import { useEffect, useState, useRef } from "react";
import { Terminal } from "lucide-react";

const INITIAL_LOGS = [
  "[10:41:00] SYS_INIT: Matrix online.",
  "[10:41:05] DATA_SYNC: Connected to telemetry firehose.",
  "[10:42:15] ML_PREDICT: Order XT-12 switched to HIGH risk (Traffic anomaly).",
  "[10:43:02] CH-990 re-routed. Prev ETA 14:00, New ETA 13:50",
];

export function SystemTelemetryLog() {
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const msgs = [
        `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] TELEMETRY_PING: 142 units responding.`,
        `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] WARN: Speed drop detected in Zone 4.`,
        `[${new Date().toLocaleTimeString('en-US', { hour12: false })}] A_STAR: Calculating new route for DRV-09.`,
      ];
      const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
      setLogs((prev) => [...prev.slice(-10), randomMsg]);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="absolute bottom-6 right-6 z-40 w-96 bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 rounded-lg shadow-2xl overflow-hidden flex flex-col">
      <div className="flex items-center bg-zinc-900/50 px-3 py-2 border-b border-zinc-800">
        <Terminal className="w-4 h-4 text-zinc-400 mr-2" />
        <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Sys_Log</span>
      </div>
      <div 
        ref={containerRef}
        className="p-3 h-40 overflow-y-auto space-y-1 font-mono text-[10px] sm:text-xs text-zinc-300 scroll-smooth"
      >
        {logs.map((log, i) => (
          <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {log.includes("HIGH") || log.includes("WARN") ? (
              <span className="text-cyber-yellow">{log}</span>
            ) : log.includes("re-routed") ? (
              <span className="text-cyber-green">{log}</span>
            ) : (
              log
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
