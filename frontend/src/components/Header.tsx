"use client";

import React from "react";
import { BookOpen, RefreshCw, CheckCircle2 } from "lucide-react";

interface HeaderProps {
  onOpenKB: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  activeIncidentsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenKB,
  onRefresh,
  isLoading,
  activeIncidentsCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/[0.06] bg-white/80 backdrop-blur-xl transition-all">
      <div className="max-w-[1600px] mx-auto px-6 h-14 flex items-center justify-between">
        {/* Brand / Platform Identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-zinc-900">
              McKesson
            </span>
            <span className="text-zinc-300">/</span>
            <span className="text-xs font-medium text-zinc-600">
              Distribution Operations
            </span>
          </div>

          <div className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200/60">
            {activeIncidentsCount} {activeIncidentsCount === 1 ? "Incident" : "Incidents"} In Queue
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-3 text-xs">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-50 border border-zinc-200/60 text-zinc-600 text-[11px]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Telemetric Diagnostics Active</span>
          </div>

          <button
            onClick={onOpenKB}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-zinc-700 bg-zinc-100/80 hover:bg-zinc-200/70 border border-zinc-200/60 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
            <span>Standard Operating Procedures</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 transition-colors disabled:opacity-40"
            title="Refresh Incident Queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
