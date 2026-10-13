"use client";

import React from "react";
import { CheckCircle2, AlertOctagon, Clock, ArrowRight } from "lucide-react";

interface ProcessPipelineProps {
  currentStage: string;
  stageAnalysis?: Record<string, string>;
}

const STAGES = [
  { id: "SAP", name: "SAP ERP", desc: "Order Release / IDoc Dispatch" },
  { id: "EAI", name: "EAI Broker", desc: "Message Queue & Sequence" },
  { id: "Acumax", name: "Acumax WMS", desc: "Wave Allocation & DB Tables" },
  { id: "Pick", name: "Pick Face", desc: "RF Confirmation / Carousels" },
  { id: "Pack", name: "Packing", desc: "Cartonizing & Weight Scale" },
  { id: "Ship", name: "Sortation", desc: "Overhead Optical Divert" },
  { id: "Truck Close", name: "Truck Close", desc: "EDI 856 ASN & BOL Print" },
];

export const ProcessPipeline: React.FC<ProcessPipelineProps> = ({
  currentStage,
  stageAnalysis,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-3 mb-4 shadow-xs">
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Distribution Operations Pipeline Trace (End-to-End Flow)
        </span>
        <span className="text-[11px] text-slate-500 font-mono">
          Incident Impact Point: <span className="font-bold text-red-700">{currentStage}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
        {STAGES.map((s, idx) => {
          const status = stageAnalysis ? stageAnalysis[s.id] : undefined;
          const isFailure = s.id.toLowerCase() === currentStage.toLowerCase() || status === "BLOCKED_FAILURE_POINT";
          
          let statusBadge = "bg-slate-100 text-slate-700 border-slate-200";
          let icon = <Clock className="w-3.5 h-3.5 text-slate-400" />;
          let label = "Pending";

          if (isFailure) {
            statusBadge = "bg-red-50 text-red-800 border-red-300 ring-1 ring-red-400";
            icon = <AlertOctagon className="w-3.5 h-3.5 text-red-600" />;
            label = "BLOCKED (Root Cause)";
          } else if (status === "COMPLETED_HEALTHY") {
            statusBadge = "bg-emerald-50 text-emerald-800 border-emerald-200";
            icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
            label = "Healthy";
          } else if (status === "STARVED_PENDING_UPSTREAM") {
            statusBadge = "bg-amber-50/70 text-amber-800 border-amber-200";
            icon = <Clock className="w-3.5 h-3.5 text-amber-600" />;
            label = "Starved";
          }

          return (
            <div
              key={s.id}
              className={`p-2 rounded border text-left flex flex-col justify-between transition-all ${statusBadge}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{s.name}</span>
                  {icon}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5" title={s.desc}>
                  {s.desc}
                </div>
              </div>
              <div className="mt-1 pt-1 border-t border-black/5 text-[10px] font-mono font-medium">
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
