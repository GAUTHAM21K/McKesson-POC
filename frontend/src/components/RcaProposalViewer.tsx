"use client";

import React, { useState } from "react";
import { FinalRCAResult } from "../lib/types";
import {
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";

interface RcaProposalViewerProps {
  rca: FinalRCAResult | null;
  isLoading: boolean;
  onRunRCA: () => void;
  onApprove: () => void;
  onEdit: () => void;
  onReject: () => void;
  lastDecisionMessage?: string | null;
}

export const RcaProposalViewer: React.FC<RcaProposalViewerProps> = ({
  rca,
  isLoading,
  onRunRCA,
  onApprove,
  onEdit,
  onReject,
  lastDecisionMessage,
}) => {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  const handleCopy = (text: string, stepNum: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepNum);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="relative flex h-8 w-8 mb-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0071e3] opacity-30"></span>
          <span className="relative inline-flex rounded-full h-8 w-8 bg-[#0071e3]/10 text-[#0071e3] items-center justify-center">
            <span className="w-4 h-4 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          </span>
        </div>
        <h3 className="text-sm font-semibold text-zinc-900">
          Analyzing Telemetry & Correlating Runbooks
        </h3>
        <p className="text-xs text-zinc-500 max-w-md mt-1 leading-relaxed">
          Evaluating system logs, cross-referencing standard operating procedures, and ruling out false leads...
        </p>
      </div>
    );
  }

  // 2. Empty / Unanalyzed State
  if (!rca) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mb-3 border border-black/[0.04]">
          <Layers className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-900">
          No Diagnostic Report Generated
        </h3>
        <p className="text-xs text-zinc-500 max-w-md mt-1 leading-relaxed">
          Run automated diagnosis to evaluate system error logs, identify the root cause, and formulate the approved recovery procedure.
        </p>
        <button
          onClick={onRunRCA}
          className="mt-4 px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-medium shadow-xs transition-colors"
        >
          Run Diagnostic Analysis
        </button>
      </div>
    );
  }

  // 3. Render Diagnostic Report
  return (
    <div className="space-y-6">
      {/* Confirmation Banner if operator committed decision */}
      {lastDecisionMessage && (
        <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/60 rounded-2xl flex items-center justify-between text-xs text-emerald-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{lastDecisionMessage}</span>
          </div>
          <span className="font-mono text-[11px] text-emerald-700 font-semibold uppercase">
            ServiceNow Synchronized
          </span>
        </div>
      )}

      {/* Root Cause Card */}
      <div className="bg-white border border-black/[0.06] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Diagnostic Finding
          </span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{rca.confidence_score}% Diagnostic Confidence</span>
          </div>
        </div>

        {/* Primary Root Cause */}
        <div>
          <h3 className="text-base font-semibold text-zinc-900 leading-snug">
            {rca.root_cause_summary}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
            {rca.confidence_rationale}
          </p>
        </div>

        {/* Technical Detail Box */}
        <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/60">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
            Technical Evidence & Mechanism
          </span>
          <p className="font-mono text-[11px] text-zinc-800 leading-relaxed break-words select-text">
            {rca.technical_root_cause}
          </p>
        </div>
      </div>

      {/* Routing & Governing SOP Pill Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-black/[0.06] rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Target Assignment Group
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs font-semibold text-zinc-900">
              {rca.predicted_assignment_group}
            </span>
            <span className="text-[11px] text-zinc-500 font-medium">
              {rca.assignment_group_confidence}% Match
            </span>
          </div>
        </div>

        <div className="bg-white border border-black/[0.06] rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
            Approved SOP Runbook
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs font-semibold text-[#0071e3]">
              {rca.sop_reference || "Standard Distribution SOP"}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">
              {rca.sla_risk_level.split(" ")[0]} SLA Risk
            </span>
          </div>
        </div>
      </div>

      {/* Recommended Recovery Procedure */}
      <div className="bg-white border border-black/[0.06] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            Approved Recovery Plan ({rca.remediation_plan.length} Steps)
          </span>
          {rca.sop_reference && (
            <span className="text-[11px] font-medium text-zinc-500">
              Governed by {rca.sop_reference.split(" ")[0]}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {rca.remediation_plan.map((step) => {
            const isCopied = copiedStep === step.step_number;
            return (
              <div
                key={step.step_number}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/50 hover:bg-zinc-50 transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center font-medium text-[11px] shrink-0 mt-0.5">
                  {step.step_number}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-zinc-900 leading-snug">
                      {step.action}
                    </p>
                    <span className="text-[10px] font-medium text-zinc-500 bg-zinc-200/60 px-2 py-0.5 rounded-md shrink-0">
                      {step.target_system}
                    </span>
                  </div>

                  {step.command_or_tool && (
                    <div className="mt-2 flex items-center justify-between bg-zinc-900 text-zinc-100 font-mono text-[11px] px-3 py-2 rounded-lg select-text group">
                      <span className="truncate pr-2">{step.command_or_tool}</span>
                      <button
                        onClick={() => handleCopy(step.command_or_tool!, step.step_number)}
                        className="text-zinc-400 hover:text-white p-1 rounded transition-colors shrink-0"
                        title="Copy command"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Human-in-the-Loop Decision Bar */}
      <div className="p-4 bg-white border border-black/[0.06] rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-wrap items-center justify-between gap-3 sticky bottom-4 z-20">
        <div>
          <span className="text-xs font-medium text-zinc-900 block">
            Authorize Resolution Plan
          </span>
          <span className="text-[11px] text-zinc-500">
            Commits root cause, work notes, and assignment routing to ServiceNow.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onReject}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            Escalate / Dismiss
          </button>

          <button
            onClick={onEdit}
            className="px-4 py-1.5 rounded-full text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200/80 border border-zinc-200/60 transition-colors"
          >
            Edit Plan
          </button>

          <button
            onClick={onApprove}
            className="px-5 py-1.5 rounded-full text-xs font-medium text-white bg-[#0071e3] hover:bg-[#0077ed] shadow-xs transition-colors"
          >
            Approve & Update Ticket
          </button>
        </div>
      </div>
    </div>
  );
};
