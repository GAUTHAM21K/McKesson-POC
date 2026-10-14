"use client";

import React, { useState } from "react";
import { IncidentDetail, FinalRCAResult } from "../lib/types";
import { ProcessPipeline } from "./ProcessPipeline";
import { RcaProposalViewer } from "./RcaProposalViewer";
import {
  Building2,
  Cpu,
  User,
  Clock,
  Terminal,
  FileText,
  ShieldCheck,
  Search,
  Copy,
  Check,
  RotateCcw,
  Play,
  AlertTriangle,
} from "lucide-react";

interface TicketViewerProps {
  incident: IncidentDetail;
  rcaResult: FinalRCAResult | null;
  isRunningRCA: boolean;
  onRunRCA: () => void;
  onApprove: () => void;
  onEdit: () => void;
  onReject: () => void;
  lastDecisionMessage?: string | null;
}

export const TicketViewer: React.FC<TicketViewerProps> = ({
  incident,
  rcaResult,
  isRunningRCA,
  onRunRCA,
  onApprove,
  onEdit,
  onReject,
  lastDecisionMessage,
}) => {
  const [activeTab, setActiveTab] = useState<
    "DIAGNOSTIC" | "LOGS" | "NOTES" | "EVIDENCE"
  >("DIAGNOSTIC");

  const [logFilter, setLogFilter] = useState("");
  const [isCopiedLogs, setIsCopiedLogs] = useState(false);

  const isP1 = incident.priority.startsWith("P1");
  const filteredLogs = incident.synthetic_logs.filter((line) =>
    line.toLowerCase().includes(logFilter.toLowerCase())
  );

  const handleCopyLogs = () => {
    navigator.clipboard.writeText(incident.synthetic_logs.join("\n"));
    setIsCopiedLogs(true);
    setTimeout(() => setIsCopiedLogs(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Incident Header Surface */}
      <div className="bg-white/70 backdrop-blur-sm border border-black/[0.06] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-4">
        {/* Title Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  isP1
                    ? "bg-rose-50 text-rose-700 border border-rose-100"
                    : "bg-amber-50 text-amber-700 border border-amber-100"
                }`}
              >
                {incident.priority}
              </span>
              <span className="font-mono text-sm font-semibold text-zinc-900">
                {incident.number}
              </span>
              <span className="text-zinc-300">&bull;</span>
              <span className="text-xs text-zinc-500 font-medium">
                {incident.state}
              </span>
            </div>
            <h1 className="text-lg font-semibold text-zinc-900 tracking-tight leading-snug">
              {incident.short_description}
            </h1>
          </div>

          {/* Primary Action Button */}
          <div className="shrink-0">
            <button
              onClick={onRunRCA}
              disabled={isRunningRCA}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-medium text-white bg-[#0071e3] hover:bg-[#0077ed] shadow-xs transition-all disabled:opacity-50"
            >
              {isRunningRCA ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing Telemetry...</span>
                </>
              ) : rcaResult ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-run Diagnosis</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Diagnostic</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quiet Metadata Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-black/[0.04] text-xs">
          <div>
            <span className="text-[10px] text-zinc-400 font-medium block">
              Facility Location
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 text-zinc-800 font-medium truncate">
              <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">{incident.distribution_center}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-zinc-400 font-medium block">
              Configuration Item (CI)
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 text-zinc-800 font-mono text-[11px] truncate">
              <Cpu className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">{incident.configuration_item}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-zinc-400 font-medium block">
              Reporter / Caller
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 text-zinc-800 font-medium truncate">
              <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">{incident.caller}</span>
            </div>
          </div>

          <div>
            <span className="text-[10px] text-zinc-400 font-medium block">
              Logged Timestamp
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 text-zinc-800 font-medium truncate">
              <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="truncate">{incident.sys_created_on}</span>
            </div>
          </div>
        </div>

        {/* Quiet Impact Callout */}
        {incident.business_impact && (
          <div className="px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200/50 flex items-start gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-zinc-900">Operational Impact: </span>
              <span className="text-zinc-600">{incident.business_impact}</span>
            </div>
          </div>
        )}
      </div>

      {/* Process Pipeline Flow Tracker */}
      <ProcessPipeline
        currentStage={incident.process_stage}
        stageAnalysis={rcaResult?.pipeline_stage_analysis}
      />

      {/* Apple-style Segmented Control Navigation */}
      <div className="flex items-center justify-between border-b border-black/[0.06] pb-1">
        <div className="inline-flex p-1 bg-zinc-200/60 rounded-xl text-xs font-medium">
          <button
            onClick={() => setActiveTab("DIAGNOSTIC")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "DIAGNOSTIC"
                ? "bg-white text-zinc-900 shadow-xs font-semibold"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Diagnostic & Resolution
            {rcaResult && (
              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("LOGS")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "LOGS"
                ? "bg-white text-zinc-900 shadow-xs font-semibold"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            System Logs ({incident.synthetic_logs.length})
          </button>

          <button
            onClick={() => setActiveTab("NOTES")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === "NOTES"
                ? "bg-white text-zinc-900 shadow-xs font-semibold"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Work Notes ({incident.ticket_notes.length})
          </button>

          {rcaResult && rcaResult.evidence_used && (
            <button
              onClick={() => setActiveTab("EVIDENCE")}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === "EVIDENCE"
                  ? "bg-white text-zinc-900 shadow-xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Evidence & Analysis ({rcaResult.evidence_used.length})
            </button>
          )}
        </div>
      </div>

      {/* Tab Panels */}
      <div>
        {/* Tab 1: Diagnostic & Resolution */}
        {activeTab === "DIAGNOSTIC" && (
          <RcaProposalViewer
            rca={rcaResult}
            isLoading={isRunningRCA}
            onRunRCA={onRunRCA}
            onApprove={onApprove}
            onEdit={onEdit}
            onReject={onReject}
            lastDecisionMessage={lastDecisionMessage}
          />
        )}

        {/* Tab 2: System Logs */}
        {activeTab === "LOGS" && (
          <div className="bg-white/70 backdrop-blur-sm border border-black/[0.06] rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter logs by keyword or code..."
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-zinc-100 hover:bg-zinc-100/80 focus:bg-white border border-transparent focus:border-zinc-300 rounded-xl text-xs font-mono text-zinc-800 placeholder-zinc-400 focus:outline-none transition-all"
                />
              </div>

              <button
                onClick={handleCopyLogs}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/60 transition-colors shrink-0"
              >
                {isCopiedLogs ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied Logs</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All Logs</span>
                  </>
                )}
              </button>
            </div>

            {/* Terminal Window */}
            <div className="bg-zinc-950 text-zinc-200 p-4 rounded-xl font-mono text-[11px] leading-relaxed overflow-x-auto border border-zinc-900 max-h-[460px] select-text">
              {filteredLogs.length === 0 ? (
                <div className="text-zinc-500 py-6 text-center">
                  No log entries matching &quot;{logFilter}&quot;
                </div>
              ) : (
                filteredLogs.map((log, idx) => {
                  const isErr =
                    log.includes("ERROR") ||
                    log.includes("FATAL") ||
                    log.includes("CRIT");
                  const isWarn = log.includes("WARN") || log.includes("ALERT");

                  return (
                    <div
                      key={idx}
                      className={`py-1 px-1.5 rounded-sm ${
                        isErr
                          ? "text-rose-400 bg-rose-950/30"
                          : isWarn
                          ? "text-amber-300 bg-amber-950/20"
                          : "text-zinc-300 hover:bg-zinc-900/50"
                      }`}
                    >
                      {log}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Work Notes */}
        {activeTab === "NOTES" && (
          <div className="bg-white/70 backdrop-blur-sm border border-black/[0.06] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Incident Journal Timeline
            </span>

            <div className="space-y-2.5">
              {incident.ticket_notes.map((note, idx) => {
                const parts = note.split(":");
                const header = parts[0];
                const content = note.substring(header.length + 1).trim();

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/60 text-xs"
                  >
                    <div className="font-semibold text-zinc-900 mb-1">
                      {header}
                    </div>
                    <div className="text-zinc-700 leading-relaxed">
                      {content}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Evidence & Ruling */}
        {activeTab === "EVIDENCE" && rcaResult && (
          <div className="space-y-4">
            {/* Cited Evidence Table */}
            <div className="bg-white border border-black/[0.06] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                Corroborated Telemetry Sources ({rcaResult.evidence_used.length})
              </span>

              <div className="border border-zinc-200/70 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200/70">
                    <tr>
                      <th className="py-2 px-3 w-28">Source Type</th>
                      <th className="py-2 px-3 w-36">Citation</th>
                      <th className="py-2 px-3">Supporting Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/60 bg-white">
                    {rcaResult.evidence_used.map((ev, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/50">
                        <td className="py-2 px-3">
                          <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                            {ev.source_type}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-zinc-900 font-semibold">
                          {ev.citation}
                        </td>
                        <td className="py-2 px-3 text-zinc-600 text-[11px] leading-relaxed">
                          {ev.detail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ruled-out Hypotheses */}
            {rcaResult.contradictions && rcaResult.contradictions.length > 0 && (
              <div className="bg-white border border-black/[0.06] rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-3">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Hypotheses Disproven
                </span>

                <div className="space-y-2">
                  {rcaResult.contradictions.map((ct, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/60 text-xs"
                    >
                      <div className="flex items-center gap-2 text-zinc-700 font-medium">
                        <span className="text-rose-500 font-semibold">Ruled Out:</span>
                        <span>{ct.hypothesis_ruled_out}</span>
                      </div>
                      <div className="text-zinc-600 text-[11px] mt-1 pl-3 border-l-2 border-zinc-300">
                        <span className="font-medium text-zinc-800">Counter-Evidence: </span>
                        {ct.counter_evidence}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
