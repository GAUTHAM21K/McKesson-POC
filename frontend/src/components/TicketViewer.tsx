"use client";

import React, { useState } from "react";
import { IncidentDetail } from "../lib/types";
import {
  FileText,
  Terminal,
  Clock,
  User,
  Building,
  Cpu,
  AlertTriangle,
  Play,
  RotateCcw,
} from "lucide-react";

interface TicketViewerProps {
  incident: IncidentDetail;
  onRunRCA: () => void;
  isRunningRCA: boolean;
}

export const TicketViewer: React.FC<TicketViewerProps> = ({
  incident,
  onRunRCA,
  isRunningRCA,
}) => {
  const [activeTab, setActiveTab] = useState<"NOTES" | "LOGS">("LOGS");
  const [logFilter, setLogFilter] = useState("");

  const filteredLogs = incident.synthetic_logs.filter((line) =>
    line.toLowerCase().includes(logFilter.toLowerCase())
  );

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-xs flex flex-col h-full">
      {/* Header & Trigger Bar */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-[#005086]" />
          <div>
            <h2 className="text-xs font-bold text-slate-900 tracking-wide">
              ServiceNow Incident: <span className="font-mono">{incident.number}</span>
            </h2>
            <p className="text-[11px] text-slate-500">{incident.short_description}</p>
          </div>
        </div>

        <button
          onClick={onRunRCA}
          disabled={isRunningRCA}
          className="flex items-center space-x-1.5 bg-[#005086] hover:bg-[#003b64] text-white px-3.5 py-1.5 rounded text-xs font-semibold shadow-xs disabled:opacity-60 transition-colors"
        >
          {isRunningRCA ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 animate-spin" />
              <span>Running AI Multi-Agent RCA...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run AI Root Cause Analysis</span>
            </>
          )}
        </button>
      </div>

      {/* Metadata Key-Value Matrix */}
      <div className="p-3 bg-slate-100/60 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">DC Location</span>
          <span className="font-medium text-slate-800 flex items-center gap-1 mt-0.5">
            <Building className="w-3 h-3 text-slate-400" />
            {incident.distribution_center}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Process Stage</span>
          <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
            {incident.process_stage}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Config Item (CI)</span>
          <span className="font-mono text-slate-700 flex items-center gap-1 mt-0.5 truncate" title={incident.configuration_item}>
            <Cpu className="w-3 h-3 text-slate-400" />
            {incident.configuration_item}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Caller / Reporter</span>
          <span className="text-slate-800 flex items-center gap-1 mt-0.5 truncate" title={incident.caller}>
            <User className="w-3 h-3 text-slate-400" />
            {incident.caller}
          </span>
        </div>
      </div>

      {/* Business Impact Alert */}
      <div className="px-3 py-2 bg-red-50/70 border-b border-red-100 flex items-start gap-2 text-xs">
        <AlertTriangle className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
        <div>
          <span className="font-semibold text-red-900">Operational & SLA Impact: </span>
          <span className="text-red-800">{incident.business_impact}</span>
        </div>
      </div>

      {/* Tabs: Synthetic Telemetry Logs vs ServiceNow Work Notes */}
      <div className="flex border-b border-slate-200 bg-slate-50 text-xs px-3">
        <button
          onClick={() => setActiveTab("LOGS")}
          className={`py-2 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === "LOGS"
              ? "border-[#005086] text-[#005086] bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Diagnostic System Logs ({incident.synthetic_logs.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("NOTES")}
          className={`py-2 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === "NOTES"
              ? "border-[#005086] text-[#005086] bg-white"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>ServiceNow Work Notes ({incident.ticket_notes.length})</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="p-3 flex-1 overflow-y-auto">
        {activeTab === "LOGS" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-500 font-mono text-[11px]">
                Raw log stream captured from {incident.configuration_item}
              </span>
              <input
                type="text"
                placeholder="Filter logs by keyword or error..."
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="px-2 py-0.5 border border-slate-300 rounded text-xs w-56 font-mono focus:outline-none focus:ring-1 focus:ring-[#005086]"
              />
            </div>
            <div className="bg-slate-950 text-slate-200 p-3 rounded font-mono text-[11px] leading-relaxed overflow-x-auto border border-slate-800 max-h-[360px] select-text">
              {filteredLogs.length === 0 ? (
                <div className="text-slate-500">No log entries matching filter.</div>
              ) : (
                filteredLogs.map((log, idx) => {
                  const isErr = log.includes("ERROR") || log.includes("FATAL") || log.includes("CRIT");
                  const isWarn = log.includes("WARN") || log.includes("ALERT");
                  return (
                    <div
                      key={idx}
                      className={`py-0.5 border-b border-slate-900 last:border-b-0 ${
                        isErr
                          ? "text-red-400 bg-red-950/20"
                          : isWarn
                          ? "text-amber-300 bg-amber-950/20"
                          : "text-slate-300"
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

        {activeTab === "NOTES" && (
          <div className="space-y-2">
            {incident.ticket_notes.map((note, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800"
              >
                <div className="font-semibold text-slate-900 mb-0.5">
                  {note.split(":")[0]}
                </div>
                <div className="text-slate-700 leading-normal">
                  {note.substring(note.indexOf(":") + 1).trim()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
