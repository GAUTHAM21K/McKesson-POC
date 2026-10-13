"use client";

import React from "react";
import { ShieldCheck, BookOpen, Server, RefreshCw } from "lucide-react";

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
    <header className="bg-[#005086] text-white border-b border-[#003b64] shadow-sm sticky top-0 z-40">
      <div className="max-w-[1720px] mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand / Platform Identity */}
        <div className="flex items-center space-x-3">
          <div className="bg-white text-[#005086] font-bold px-2 py-0.5 rounded text-xs tracking-wider border border-white/20">
            DIST-OPS
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
              Distribution Operations AI Root Cause Analysis (RCA) Copilot
              <span className="bg-[#003b64] text-xs px-2 py-0.2 rounded text-slate-200 font-mono font-normal">
                v1.0-PoC
              </span>
            </span>
            <span className="text-[11px] text-slate-300">
              Warehouse Pipeline: SAP ERP &rarr; EAI &rarr; Acumax WMS &rarr; Pick/Pack/Ship/Truck Close
            </span>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="hidden md:flex items-center space-x-2 bg-[#003b64] px-3 py-1 rounded border border-[#002e4f]">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300">LangGraph Supervisor:</span>
            <span className="text-emerald-400 font-medium">ONLINE</span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-300">Vector Store:</span>
            <span className="text-emerald-400 font-medium">INDEXED</span>
          </div>

          <button
            onClick={onOpenKB}
            className="flex items-center space-x-1.5 bg-[#003b64] hover:bg-[#002e4f] text-slate-200 hover:text-white px-2.5 py-1 rounded border border-[#002e4f] transition-colors"
            title="Browse Knowledge Base Articles & Problem Records"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-300" />
            <span>KB & SOP Repository</span>
          </button>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded border border-white/20 transition-colors disabled:opacity-50"
            title="Refresh Incident Feeds"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <div className="border-l border-white/20 pl-4 flex items-center space-x-2 text-right">
            <div>
              <div className="font-semibold text-white">HITL Mode: ACTIVE</div>
              <div className="text-[10px] text-slate-300">Operator: Ops Commander</div>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          </div>
        </div>
      </div>
    </header>
  );
};
