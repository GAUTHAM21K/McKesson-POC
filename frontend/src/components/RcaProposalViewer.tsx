"use client";

import React, { useState } from "react";
import { FinalRCAResult } from "../lib/types";
import {
  CheckCircle,
  AlertTriangle,
  FileCheck,
  ChevronDown,
  ChevronRight,
  Shield,
  Layers,
  Wrench,
  ThumbsUp,
  Edit3,
  XCircle,
  ExternalLink,
} from "lucide-react";

interface RcaProposalViewerProps {
  rca: FinalRCAResult | null;
  isLoading: boolean;
  onApprove: () => void;
  onEdit: () => void;
  onReject: () => void;
  lastDecisionMessage?: string | null;
}

export const RcaProposalViewer: React.FC<RcaProposalViewerProps> = ({
  rca,
  isLoading,
  onApprove,
  onEdit,
  onReject,
  lastDecisionMessage,
}) => {
  const [showAgentTrail, setShowAgentTrail] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-md p-8 text-center h-full flex flex-col items-center justify-center shadow-xs">
        <div className="w-8 h-8 border-3 border-[#005086] border-t-transparent rounded-full animate-spin mb-3"></div>
        <h3 className="text-sm font-semibold text-slate-800">
          Orchestrating LangGraph Multi-Agent RCA...
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Sequential execution: Incident Understanding &rarr; Context Retrieval (RAG) &rarr; RCA Reasoning &rarr; Remediation & Ownership &rarr; Supervisor Gate.
        </p>
      </div>
    );
  }

  if (!rca) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-md p-8 text-center h-full flex flex-col items-center justify-center text-slate-500 shadow-xs">
        <FileCheck className="w-8 h-8 text-slate-400 mb-2" />
        <h3 className="text-xs font-semibold text-slate-700">No RCA Proposal Generated Yet</h3>
        <p className="text-[11px] text-slate-500 max-w-xs mt-1">
          Click <strong>&quot;Run AI Root Cause Analysis&quot;</strong> on the incident viewer to trigger the multi-agent reasoning supervisor.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-xs flex flex-col h-full overflow-hidden">
      {/* Top Banner: RCA Proposal Header & Confidence Score */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#005086] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
            AI Generated RCA Proposal (Supervisor Validated)
          </span>
          <h2 className="text-xs font-bold text-slate-900 mt-1">
            Root Cause Diagnosis for {rca.incident_number} ({rca.process_stage})
          </h2>
        </div>

        {/* Confidence Gauge */}
        <div className="flex items-center space-x-2 bg-white px-3 py-1 rounded border border-slate-200">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 block leading-tight">Confidence</span>
            <span className="font-bold text-emerald-700 text-xs">{rca.confidence_score}% High</span>
          </div>
          <div className="w-12 bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full"
              style={{ width: `${rca.confidence_score}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Decision Status Banner (if human action was recorded) */}
      {lastDecisionMessage && (
        <div className="p-2.5 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{lastDecisionMessage}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 font-bold uppercase">
            ServiceNow Sync Pending
          </span>
        </div>
      )}

      {/* Scrollable RCA Findings Body */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
        {/* Section 1: Root Cause Summary & Technical Cause */}
        <div className="bg-slate-50 border border-slate-200 rounded p-3">
          <div className="font-bold text-slate-900 text-xs uppercase tracking-wide mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Executive Root Cause Summary</span>
          </div>
          <p className="text-slate-800 leading-relaxed font-medium">
            {rca.root_cause_summary}
          </p>

          <div className="mt-2.5 pt-2 border-t border-slate-200">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-0.5">
              Technical Root Cause & Telemetry Detail
            </span>
            <p className="text-slate-700 font-mono text-[11px] leading-relaxed bg-white p-2 rounded border border-slate-200">
              {rca.technical_root_cause}
            </p>
          </div>
          <p className="text-[10px] text-slate-500 mt-1 italic">
            Rationale: {rca.confidence_rationale}
          </p>
        </div>

        {/* Section 2: Recommended Routing & SLA Risk */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="bg-sky-50/60 border border-sky-200 rounded p-2.5">
            <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
              Predicted Owning Support Group
            </span>
            <div className="text-xs font-bold text-[#005086] mt-0.5 flex items-center justify-between">
              <span>{rca.predicted_assignment_group}</span>
              <span className="bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded font-mono text-[10px]">
                {rca.assignment_group_confidence}% Match
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
              SLA Risk Assessment
            </span>
            <div className="text-xs font-semibold text-red-700 mt-0.5">
              {rca.sla_risk_level}
            </div>
          </div>
        </div>

        {/* Section 3: Evidence Used (Explicit citations) */}
        <div>
          <div className="font-bold text-slate-800 text-xs uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#005086]" />
            <span>Evidence Corroborated ({rca.evidence_used.length} Sources Cited)</span>
          </div>
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-1.5 px-2.5 w-24">Type</th>
                  <th className="py-1.5 px-2.5 w-32">Citation</th>
                  <th className="py-1.5 px-2.5">Supporting Observation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rca.evidence_used.map((ev, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2.5">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {ev.source_type}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 font-mono text-[11px] text-slate-800 font-medium">
                      {ev.citation}
                    </td>
                    <td className="py-1.5 px-2.5 text-slate-600 text-[11px]">
                      {ev.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Contradictions / Ruled Out Hypotheses */}
        {rca.contradictions && rca.contradictions.length > 0 && (
          <div>
            <div className="font-bold text-slate-800 text-xs uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-purple-700" />
              <span>Contradictions & Ruled Out Hypotheses</span>
            </div>
            <div className="space-y-1.5">
              {rca.contradictions.map((ct, idx) => (
                <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                    <span className="text-red-600 line-through">Hypothesis:</span>
                    <span>{ct.hypothesis_ruled_out}</span>
                  </div>
                  <div className="text-slate-600 text-[11px] mt-0.5 pl-3 border-l-2 border-purple-400">
                    <span className="font-medium text-purple-900">Counter-Evidence: </span>
                    {ct.counter_evidence}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 5: Remediation Action Plan (SOP Guided) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-[#005086]" />
              <span>Corrective Action Plan</span>
            </div>
            {rca.sop_reference && (
              <span className="text-[11px] font-mono text-[#005086] font-semibold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                {rca.sop_reference}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {rca.remediation_plan.map((step) => (
              <div
                key={step.step_number}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded flex gap-2.5 items-start"
              >
                <div className="w-5 h-5 rounded-full bg-[#005086] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                  {step.step_number}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-xs">
                      {step.action}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200">
                      {step.target_system}
                    </span>
                  </div>
                  {step.command_or_tool && (
                    <div className="mt-1 bg-slate-900 text-emerald-300 font-mono text-[10px] p-1.5 rounded select-text">
                      {step.command_or_tool}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 6: Multi-Agent Reasoning Audit Trail (Collapsible) */}
        <div className="border border-slate-200 rounded bg-slate-50/50">
          <button
            onClick={() => setShowAgentTrail(!showAgentTrail)}
            className="w-full p-2 text-left flex items-center justify-between text-xs text-slate-700 font-semibold hover:bg-slate-100/60"
          >
            <div className="flex items-center gap-1.5">
              {showAgentTrail ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span>Agent Execution Audit Trail ({rca.agent_reasoning_trail.length} Nodes Completed)</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">LangGraph Supervisor</span>
          </button>

          {showAgentTrail && (
            <div className="p-3 border-t border-slate-200 space-y-2 bg-white">
              {rca.agent_reasoning_trail.map((trail, idx) => (
                <div key={idx} className="p-2 bg-slate-50 border border-slate-200 rounded text-[11px]">
                  <div className="flex items-center justify-between font-semibold text-slate-800 mb-0.5">
                    <span className="text-[#005086]">{trail.agent_name}</span>
                    <span className="font-mono text-[10px] text-slate-400">{trail.timestamp}</span>
                  </div>
                  <p className="text-slate-600">{trail.summary}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Human-in-the-Loop Action Bar (CRITICAL REQUIREMENT) */}
      <div className="p-3 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] text-slate-600">
          <span className="font-semibold text-slate-800">Operator Action Required: </span>
          Review proposal and commit to ServiceNow ticket workflow.
        </div>

        <div className="flex items-center space-x-2">
          {/* Reject Button */}
          <button
            onClick={onReject}
            className="px-3 py-2 border border-red-300 hover:bg-red-50 text-red-700 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject / Escalate</span>
          </button>

          {/* Edit Button */}
          <button
            onClick={onEdit}
            className="px-3 py-2 border border-slate-300 hover:bg-white bg-slate-50 text-slate-800 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Proposal</span>
          </button>

          {/* Approve Button */}
          <button
            onClick={onApprove}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>Approve RCA & Route Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
};
