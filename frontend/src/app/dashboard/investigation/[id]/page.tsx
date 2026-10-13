"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  IncidentDetail,
  FinalRCAResult,
  RemediationStep,
  RCAExecutionRequest
} from "@/lib/types";
import {
  fetchIncidentDetail,
  generateRCAStream,
  executeRCA,
  StreamActionEvent
} from "@/lib/api";
import {
  ArrowLeft,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Edit3,
  Terminal,
  FileText,
  Building,
  Server,
  Activity,
  Check,
  Sparkles,
  ShieldCheck,
  Clock,
  Plus,
  Trash2,
  ExternalLink,
  Save,
  CheckCircle
} from "lucide-react";

export default function InvestigationPage() {
  const params = useParams();
  const incidentId = (params?.id as string) || "INC0892110";

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [isLoadingIncident, setIsLoadingIncident] = useState(true);
  const [activeTab, setActiveTab] = useState<"NOTES" | "LOGS">("LOGS");
  const [logFilter, setLogFilter] = useState("");

  // AI RCA Streaming State
  const [isRunningRCA, setIsRunningRCA] = useState(false);
  const [streamEvents, setStreamEvents] = useState<StreamActionEvent[]>([]);
  const [rcaResult, setRcaResult] = useState<FinalRCAResult | null>(null);

  // In-Place Editable Human-in-the-Loop State
  const [editableRootCause, setEditableRootCause] = useState("");
  const [editableTechCause, setEditableTechCause] = useState("");
  const [editableActionPlan, setEditableActionPlan] = useState<RemediationStep[]>([]);
  const [editableGroup, setEditableGroup] = useState("Acumax Support");
  const [operatorNotes, setOperatorNotes] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  // Closed-Loop Execution Status
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionToast, setExecutionToast] = useState<{
    title: string;
    description: string;
    mode: string;
    timestamp: string;
  } | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoadingIncident(true);
      try {
        const detail = await fetchIncidentDetail(incidentId);
        setIncident(detail);
      } catch (err) {
        console.error("Failed to load incident detail:", err);
      } finally {
        setIsLoadingIncident(false);
      }
    }
    loadData();
  }, [incidentId]);

  // Sync AI results into local editable state
  useEffect(() => {
    if (rcaResult) {
      setEditableRootCause(rcaResult.root_cause_summary);
      setEditableTechCause(rcaResult.technical_root_cause);
      setEditableActionPlan(rcaResult.remediation_plan || []);
      setEditableGroup(rcaResult.predicted_assignment_group || "Acumax Support");
    }
  }, [rcaResult]);

  // Auto-scroll streaming execution trace
  useEffect(() => {
    if (isRunningRCA && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamEvents, isRunningRCA]);

  const handleRunRCA = async () => {
    setIsRunningRCA(true);
    setStreamEvents([]);
    setRcaResult(null);
    setExecutionToast(null);
    setIsEditMode(false);

    try {
      const finalRCA = await generateRCAStream(incidentId, (event) => {
        if (event.type === "agent_action") {
          setStreamEvents((prev) => [...prev, event]);
        }
      });
      setRcaResult(finalRCA);
    } catch (err) {
      console.error("Error generating RCA:", err);
    } finally {
      setIsRunningRCA(false);
    }
  };

  const handleApproveAndExecute = async () => {
    if (!incident) return;
    setIsExecuting(true);

    try {
      const payload: RCAExecutionRequest = {
        incident_id: incident.incident_id,
        root_cause_summary: editableRootCause,
        remediation_plan: editableActionPlan,
        assignment_group: editableGroup,
        operator_name: "Operations Commander (Marcus Vance / DC-04)",
        state: "Resolved (Pending Validation)",
        notes: operatorNotes || "Human Operator approved AI RCA and authorized ticket routing."
      };

      const res = await executeRCA(payload);

      setExecutionToast({
        title: `ServiceNow Ticket ${incident.number} Updated Successfully`,
        description: `Action plan committed, routed to '${editableGroup}', state changed to 'Resolved (Pending Validation)'.`,
        mode: res.mode,
        timestamp: res.timestamp
      });

      // Reload ticket detail to reflect updated status
      const updated = await fetchIncidentDetail(incident.incident_id);
      setIncident(updated);
      setIsEditMode(false);
    } catch (err) {
      console.error("Closed-loop execution failed:", err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleUpdateStepAction = (idx: number, newAction: string) => {
    setEditableActionPlan((prev) =>
      prev.map((step, i) => (i === idx ? { ...step, action: newAction } : step))
    );
  };

  const handleUpdateStepCommand = (idx: number, newCmd: string) => {
    setEditableActionPlan((prev) =>
      prev.map((step, i) => (i === idx ? { ...step, command_or_tool: newCmd } : step))
    );
  };

  const handleAddStep = () => {
    setEditableActionPlan((prev) => [
      ...prev,
      {
        step_number: prev.length + 1,
        action: "Enter corrective action step...",
        command_or_tool: "EXEC sp_custom_action();",
        target_system: incident?.process_stage || "Warehouse Subsystem"
      }
    ]);
  };

  const handleDeleteStep = (idx: number) => {
    setEditableActionPlan((prev) =>
      prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 }))
    );
  };

  if (isLoadingIncident) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 font-mono text-sm">
          <RotateCcw className="w-5 h-5 animate-spin text-blue-800" />
          <span>Ingesting telemetry and ticket context for {incidentId}...</span>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-md p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <h2 className="text-base font-bold text-slate-900 mb-1">Incident Not Found</h2>
          <p className="text-xs text-slate-500 mb-4">
            Could not retrieve incident records for &quot;{incidentId}&quot;.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-blue-800 hover:bg-blue-900 text-white text-xs px-3 py-1.5 rounded-md font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Operations Queue
          </Link>
        </div>
      </div>
    );
  }

  const isP1 = incident.priority.startsWith("P1");
  const filteredLogs = incident.synthetic_logs.filter((log) =>
    log.toLowerCase().includes(logFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Enterprise Navigation & Incident Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 transition-colors"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-slate-900">
                  {incident.number}
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                    isP1
                      ? "bg-red-50 text-red-800 border-red-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  {incident.priority}
                </span>
                <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                  Stage: {incident.process_stage}
                </span>
                <span
                  className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                    incident.state.includes("Resolved")
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  State: {incident.state}
                </span>
              </div>
              <h1 className="text-xs font-semibold text-slate-600 truncate max-w-2xl mt-0.5">
                {incident.short_description}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                Distribution Center
              </span>
              <span className="font-medium text-slate-800 flex items-center gap-1 justify-end">
                <Building className="w-3 h-3 text-slate-400" />
                {incident.distribution_center}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 hidden sm:block" />
            <div className="text-right hidden sm:block">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                Caller
              </span>
              <span className="font-medium text-slate-800 truncate max-w-[150px]">
                {incident.caller}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Toast Notification Banner (Closed-Loop ServiceNow Push Confirmation) */}
      {executionToast && (
        <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs shadow-md border-b border-emerald-700 transition-all">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 shrink-0 text-white" />
              <div>
                <span className="font-bold text-sm block">{executionToast.title}</span>
                <span className="text-emerald-100 text-[11px]">
                  {executionToast.description} &bull; Mode:{" "}
                  <code className="font-mono bg-emerald-700 px-1 py-0.5 rounded">
                    {executionToast.mode}
                  </code>{" "}
                  &bull; {executionToast.timestamp}
                </span>
              </div>
            </div>
            <button
              onClick={() => setExecutionToast(null)}
              className="text-emerald-200 hover:text-white p-1 text-xs"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Main 2-Column Enterprise Investigation Grid */}
      <main className="max-w-7xl w-full mx-auto p-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pb-28">
        {/* ======================================================== */}
        {/* LEFT COLUMN: The Evidence Context (5 Cols)               */}
        {/* ======================================================== */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          {/* Metadata Card */}
          <div className="bg-white border border-slate-200 rounded-md shadow-xs p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-800" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Target Configuration Item (CI)
                </h2>
              </div>
              <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {incident.configuration_item}
              </span>
            </div>

            <div className="mt-3 text-xs space-y-2">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">
                  Incident Description
                </span>
                <p className="text-slate-700 leading-relaxed mt-0.5 bg-slate-50 p-2.5 rounded border border-slate-100 text-[11px]">
                  {incident.description}
                </p>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 font-medium block">
                  Business &amp; SLA Impact
                </span>
                <p className="text-red-700 font-medium leading-relaxed mt-0.5 bg-red-50/60 p-2 rounded border border-red-100 text-[11px]">
                  {incident.business_impact}
                </p>
              </div>
            </div>
          </div>

          {/* Telemetry Tabs Container */}
          <div className="bg-white border border-slate-200 rounded-md shadow-xs flex flex-col h-[520px]">
            {/* Tabs Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3">
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab("LOGS")}
                  className={`py-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                    activeTab === "LOGS"
                      ? "border-blue-800 text-blue-800 bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Splunk Logs ({incident.synthetic_logs.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab("NOTES")}
                  className={`py-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                    activeTab === "NOTES"
                      ? "border-blue-800 text-blue-800 bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Work Notes ({incident.ticket_notes.length})</span>
                </button>
              </div>

              {activeTab === "LOGS" && (
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="px-2 py-0.5 text-xs font-mono border border-slate-200 rounded w-36 focus:outline-none focus:ring-1 focus:ring-blue-800"
                />
              )}
            </div>

            {/* Tabs Body */}
            <div className="flex-1 overflow-hidden p-3 bg-slate-50">
              {activeTab === "LOGS" ? (
                <div className="h-full bg-slate-950 text-green-400 font-mono text-xs p-4 rounded-md overflow-y-auto border border-slate-900 space-y-1.5 select-text shadow-inner">
                  {filteredLogs.length === 0 ? (
                    <div className="text-slate-500">No logs matching query.</div>
                  ) : (
                    filteredLogs.map((log, idx) => {
                      const isErr =
                        log.includes("ERROR") ||
                        log.includes("FATAL") ||
                        log.includes("CRIT") ||
                        log.includes("Deadlock");
                      const isWarn = log.includes("WARN") || log.includes("ALERT");

                      return (
                        <div
                          key={idx}
                          className={`leading-relaxed break-all ${
                            isErr
                              ? "text-red-400 bg-red-950/30 px-1 py-0.5 rounded"
                              : isWarn
                              ? "text-amber-300"
                              : "text-green-400"
                          }`}
                        >
                          <span className="text-slate-600 select-none mr-2">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          {log}
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                <div className="h-full overflow-y-auto space-y-2.5 pr-1">
                  {incident.ticket_notes.map((note, idx) => {
                    const colonIdx = note.indexOf(":");
                    const author = colonIdx !== -1 ? note.slice(0, colonIdx) : "Note";
                    const text = colonIdx !== -1 ? note.slice(colonIdx + 1).trim() : note;

                    return (
                      <div
                        key={idx}
                        className="p-3 bg-white border border-slate-200 rounded-md text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {author}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed font-sans">{text}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: The AI Copilot Workspace (7 Cols)          */}
        {/* ======================================================== */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          {/* Top Trigger Card */}
          <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-blue-800 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Cyclic Multi-Agent ReAct Engine</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Cyclic tool calling across ServiceNow, Splunk, and Vector SOPs with Human-in-the-Loop closed-loop execution.
              </p>
            </div>

            <button
              onClick={handleRunRCA}
              disabled={isRunningRCA}
              className="inline-flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-md text-xs font-semibold transition-colors disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {isRunningRCA ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Cyclic Investigation in Progress...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Execute AI Root Cause Analysis</span>
                </>
              )}
            </button>
          </div>

          {/* STREAMING TRACE BOX */}
          {(isRunningRCA || (streamEvents.length > 0 && !rcaResult)) && (
            <div className="bg-white border border-slate-200 rounded-md p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-800 animate-pulse" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Cyclic ReAct Trace (Server-Sent Events)
                  </span>
                </div>
                {isRunningRCA && (
                  <span className="text-[10px] font-mono text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 animate-pulse">
                    REASON_ACT_CYCLE
                  </span>
                )}
              </div>

              {/* Terminal-style live stream container with auto-scroll */}
              <div className="bg-slate-950 text-slate-300 font-mono text-xs p-3.5 rounded-md max-h-56 overflow-y-auto space-y-2 border border-slate-900 shadow-inner">
                {streamEvents.map((evt, idx) => (
                  <div key={idx} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-blue-400 select-none">&gt;</span>
                    <div>
                      <span className="text-amber-400 font-semibold mr-1.5">
                        [{evt.agent || "Agent"}]:
                      </span>
                      <span className="text-slate-200">{evt.message}</span>
                    </div>
                  </div>
                ))}

                {isRunningRCA && (
                  <div className="flex items-center gap-2 text-slate-500 pt-1">
                    <RotateCcw className="w-3 h-3 animate-spin text-blue-400" />
                    <span>Evaluating telemetry and resolving contradictions...</span>
                  </div>
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>
          )}

          {/* STRUCTURED RCA PROPOSAL (Interactive & Editable) */}
          {rcaResult ? (
            <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs space-y-5">
              {/* Proposal Header with Confidence Score Badge */}
              <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      AI Deductive Finding &bull; LangGraph Certified
                    </span>
                    <button
                      onClick={() => setIsEditMode(!isEditMode)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 transition-colors ${
                        isEditMode
                          ? "bg-amber-100 border-amber-300 text-amber-800"
                          : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{isEditMode ? "Exit Edit Mode" : "Enable HITL Edit Mode"}</span>
                    </button>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">
                    Root Cause Analysis Proposal &amp; Closed-Loop Action Plan
                  </h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] font-semibold text-slate-500 block uppercase">
                      Confidence
                    </span>
                    <span className="text-2xl font-extrabold text-blue-800">
                      {rcaResult.confidence_score}%
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-800 font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Confidence Rationale */}
              <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Grounding Rationale: </span>
                {rcaResult.confidence_rationale}
              </div>

              {/* Executive Summary (Editable by Human) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Executive Root Cause Summary</span>
                    {isEditMode && (
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-normal">
                        Editable
                      </span>
                    )}
                  </h4>
                </div>
                {isEditMode ? (
                  <textarea
                    value={editableRootCause}
                    onChange={(e) => setEditableRootCause(e.target.value)}
                    rows={3}
                    className="w-full text-xs font-sans text-slate-800 leading-relaxed bg-white p-3 rounded border border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-800"
                    placeholder="Refine or override the AI root cause summary..."
                  />
                ) : (
                  <p className="text-xs text-slate-800 leading-relaxed bg-slate-50/80 p-3 rounded border border-slate-200">
                    {editableRootCause}
                  </p>
                )}
              </div>

              {/* Technical Root Cause */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
                  Technical Root Cause &amp; Error Mechanics
                </h4>
                <p className="text-xs font-mono text-slate-700 bg-slate-100 p-3 rounded border border-slate-200 leading-relaxed select-text">
                  {editableTechCause}
                </p>
              </div>

              {/* Dense Evidence Citations Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Evidence Citations &amp; Corroborated Telemetry
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {rcaResult.evidence_used?.length || 0} citations linked
                  </span>
                </div>

                <div className="border border-slate-200 rounded-md overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-600 text-[11px] font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 w-28">Source</th>
                        <th className="py-2 px-3 w-40">Citation / Ref</th>
                        <th className="py-2 px-3">Diagnostic Observation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-sans">
                      {rcaResult.evidence_used?.map((ev, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3">
                            <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-800">
                              {ev.source_type}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-700">
                            {ev.citation}
                          </td>
                          <td className="py-2 px-3 text-slate-800 text-[11px] leading-relaxed">
                            {ev.detail}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Contradictions & Ruled-Out Hypotheses */}
              {rcaResult.contradictions && rcaResult.contradictions.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Hypotheses Ruled Out (Contradiction Analysis)
                  </h4>
                  <div className="space-y-2">
                    {rcaResult.contradictions.map((c, i) => (
                      <div
                        key={i}
                        className="bg-amber-50/60 border border-amber-200 rounded p-2.5 text-xs text-slate-800"
                      >
                        <span className="font-semibold text-amber-900">
                          Ruled Out: {c.hypothesis_ruled_out}
                        </span>
                        <p className="text-[11px] text-slate-700 mt-0.5 leading-relaxed">
                          <span className="font-medium text-slate-900">Counter-Evidence: </span>
                          {c.counter_evidence}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step-by-Step Remediation Plan (Human-Editable) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Corrective Remediation Action Plan
                    </h4>
                    {isEditMode && (
                      <button
                        onClick={handleAddStep}
                        className="text-[11px] font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Step
                      </button>
                    )}
                  </div>
                  {rcaResult.sop_reference && (
                    <span className="text-[11px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Governed by: {rcaResult.sop_reference}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {editableActionPlan.map((step, idx) => (
                    <div
                      key={step.step_number || idx}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-blue-800 text-white inline-flex items-center justify-center text-[11px] font-bold">
                            {idx + 1}
                          </span>
                          <span>Action Step {idx + 1}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            Target: {step.target_system}
                          </span>
                          {isEditMode && (
                            <button
                              onClick={() => handleDeleteStep(idx)}
                              className="text-red-600 hover:text-red-800 p-0.5"
                              title="Delete Step"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {isEditMode ? (
                        <div className="pl-6 space-y-1">
                          <input
                            type="text"
                            value={step.action}
                            onChange={(e) => handleUpdateStepAction(idx, e.target.value)}
                            className="w-full text-xs font-sans text-slate-800 p-1.5 bg-white border border-blue-500 rounded focus:outline-none"
                            placeholder="Remediation action description..."
                          />
                          <input
                            type="text"
                            value={step.command_or_tool || ""}
                            onChange={(e) => handleUpdateStepCommand(idx, e.target.value)}
                            className="w-full text-xs font-mono text-slate-800 p-1.5 bg-white border border-slate-300 rounded focus:outline-none"
                            placeholder="CLI or DB procedure command..."
                          />
                        </div>
                      ) : (
                        <>
                          <p className="text-slate-800 text-xs pl-6">{step.action}</p>
                          {step.command_or_tool && (
                            <div className="pl-6">
                              <code className="block bg-slate-900 text-slate-100 font-mono text-[11px] p-2 rounded border border-slate-800 select-text overflow-x-auto">
                                {step.command_or_tool}
                              </code>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Assignment Group & SLA Risk Routing (Human-Selectable) */}
              <div className="bg-slate-100 border border-slate-200 rounded-md p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Target ServiceNow Assignment Group
                  </span>
                  {isEditMode ? (
                    <select
                      value={editableGroup}
                      onChange={(e) => setEditableGroup(e.target.value)}
                      className="mt-1 w-full bg-white border border-blue-600 rounded px-2 py-1 text-xs font-semibold text-blue-900 focus:outline-none"
                    >
                      <option value="Acumax Support">Acumax Support</option>
                      <option value="EAI Support">EAI Support</option>
                      <option value="Conveyor & WCS Automation Ops">
                        Conveyor &amp; WCS Automation Ops
                      </option>
                      <option value="Distribution Ops Incident Management">
                        Distribution Ops Incident Management
                      </option>
                    </select>
                  ) : (
                    <span className="font-semibold text-blue-900 text-sm mt-0.5 block">
                      {editableGroup}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">
                    Confidence: {rcaResult.assignment_group_confidence}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    SLA Breach Risk Level
                  </span>
                  <span className="font-semibold text-red-700 text-sm mt-0.5 block">
                    {rcaResult.sla_risk_level}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Action required to avert line-haul penalty
                  </span>
                </div>
              </div>
            </div>
          ) : !isRunningRCA ? (
            /* Empty State Prompt */
            <div className="bg-white border border-slate-200 rounded-md p-10 text-center shadow-xs">
              <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                No RCA Generated Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4 leading-relaxed">
                Click &quot;Execute AI Root Cause Analysis&quot; above to initiate the cyclic LangGraph
                investigation. The agent will pull ServiceNow work notes, query Splunk telemetry, and
                evaluate SOPs in a closed ReAct cycle.
              </p>
              <button
                onClick={handleRunRCA}
                className="inline-flex items-center gap-1.5 bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-md text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Analysis Now</span>
              </button>
            </div>
          ) : null}
        </section>
      </main>

      {/* ======================================================== */}
      {/* BOTTOM ACTION BAR (Sticky Closed-Loop HITL Execution)   */}
      {/* ======================================================== */}
      {rcaResult && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-300 py-3 px-6 z-30 shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-800">
                Closed-Loop HITL Ready: Authorize ServiceNow Ticket Update
              </span>
              <span className="text-slate-400 text-xs hidden sm:inline">&bull;</span>
              <span className="text-xs text-slate-500 hidden sm:inline font-mono">
                {incident.number}
              </span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`inline-flex items-center justify-center gap-1.5 border px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  isEditMode
                    ? "bg-amber-100 border-amber-300 text-amber-800"
                    : "bg-white border-slate-300 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditMode ? "Finish Editing" : "Edit Plan"}</span>
              </button>

              <button
                onClick={handleApproveAndExecute}
                disabled={isExecuting}
                className="inline-flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-900 text-white px-5 py-1.5 rounded-md text-xs font-bold shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing ServiceNow Sync...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Approve &amp; Execute RCA</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
