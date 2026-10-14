"use client";

import React from "react";
import { Check, AlertCircle } from "lucide-react";

interface ProcessPipelineProps {
  currentStage: string;
  stageAnalysis?: Record<string, string>;
}

const STAGES = [
  { id: "SAP", name: "SAP ERP", subtitle: "IDoc Dispatch" },
  { id: "EAI", name: "EAI Broker", subtitle: "Sequence & Queue" },
  { id: "Acumax", name: "Acumax WMS", subtitle: "Wave Allocation" },
  { id: "Pick", name: "Pick Face", subtitle: "RF Picking" },
  { id: "Pack", name: "Packing", subtitle: "Cartonization" },
  { id: "Ship", name: "Sortation", subtitle: "Optical Divert" },
  { id: "Truck Close", name: "Truck Close", subtitle: "ASN & BOL" },
];

export const ProcessPipeline: React.FC<ProcessPipelineProps> = ({
  currentStage,
  stageAnalysis,
}) => {
  return (
    <div className="w-full bg-white/70 backdrop-blur-sm border border-black/[0.06] rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="font-medium text-zinc-500 tracking-tight">
          Warehouse Execution Pipeline
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-400">Impact Origin:</span>
          <span className="font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 text-[11px]">
            {currentStage} Stage
          </span>
        </div>
      </div>

      {/* Stepper Flow */}
      <div className="relative flex items-center justify-between">
        {/* Continuous Connecting Track */}
        <div className="absolute left-6 right-6 top-3 h-[2px] bg-zinc-200/80 -z-0" />

        {STAGES.map((s, idx) => {
          const status = stageAnalysis ? stageAnalysis[s.id] : undefined;
          const isFailure =
            s.id.toLowerCase() === currentStage.toLowerCase() ||
            status === "BLOCKED_FAILURE_POINT";

          const isHealthy = status === "COMPLETED_HEALTHY";
          const isStarved = status === "STARVED_PENDING_UPSTREAM";

          return (
            <div
              key={s.id}
              className="relative z-10 flex flex-col items-center text-center group cursor-default"
              style={{ width: `${100 / STAGES.length}%` }}
            >
              {/* Node Indicator */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
                  isFailure
                    ? "bg-rose-500 text-white ring-4 ring-rose-100 shadow-sm"
                    : isHealthy
                    ? "bg-emerald-500 text-white shadow-xs"
                    : isStarved
                    ? "bg-zinc-100 border border-zinc-300 text-zinc-400"
                    : "bg-zinc-100 border border-zinc-200 text-zinc-400"
                }`}
              >
                {isFailure ? (
                  <AlertCircle className="w-3.5 h-3.5" />
                ) : isHealthy ? (
                  <Check className="w-3 h-3 stroke-[2.5]" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                )}
              </div>

              {/* Labels */}
              <div className="mt-2 flex flex-col items-center">
                <span
                  className={`text-[12px] font-medium leading-none ${
                    isFailure
                      ? "text-rose-600 font-semibold"
                      : isHealthy
                      ? "text-zinc-900"
                      : "text-zinc-500"
                  }`}
                >
                  {s.name}
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5 hidden sm:block">
                  {s.subtitle}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
