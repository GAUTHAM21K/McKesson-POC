"use client";

import React, { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { IncidentList } from "../components/IncidentList";
import { TicketViewer } from "../components/TicketViewer";
import { RcaProposalViewer } from "../components/RcaProposalViewer";
import { ProcessPipeline } from "../components/ProcessPipeline";
import { DecisionModal } from "../components/DecisionModal";
import { KnowledgeBaseModal } from "../components/KnowledgeBaseModal";
import {
  IncidentSummary,
  IncidentDetail,
  FinalRCAResult,
  RCADecisionRequest,
} from "../lib/types";
import {
  fetchIncidents,
  fetchIncidentDetail,
  generateRCA,
  recordDecision,
} from "../lib/api";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  ChevronRight,
} from "lucide-react";

export default function Home() {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>("INC0892110");
  const [selectedDetail, setSelectedDetail] = useState<IncidentDetail | null>(null);
  const [rcaResult, setRcaResult] = useState<FinalRCAResult | null>(null);

  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  const [isRunningRCA, setIsRunningRCA] = useState(false);
  const [lastDecisionMessage, setLastDecisionMessage] = useState<string | null>(null);

  // Modals
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionMode, setDecisionMode] = useState<"APPROVE" | "EDIT" | "REJECT">("APPROVE");
  const [isKBModalOpen, setIsKBModalOpen] = useState(false);

  // Load Incidents on Mount
  useEffect(() => {
    loadIncidents();
  }, []);

  // When selected incident changes, load detail and reset/fetch cached RCA
  useEffect(() => {
    if (selectedIncidentId) {
      loadIncidentDetail(selectedIncidentId);
    }
  }, [selectedIncidentId]);

  const loadIncidents = async () => {
    setIsLoadingIncidents(true);
    try {
      const data = await fetchIncidents();
      setIncidents(data);
      if (!selectedIncidentId && data.length > 0) {
        setSelectedIncidentId(data[0].incident_id);
      }
    } catch (err) {
      console.error("Error loading incidents:", err);
    } finally {
      setIsLoadingIncidents(false);
    }
  };

  const loadIncidentDetail = async (id: string) => {
    try {
      const detail = await fetchIncidentDetail(id);
      setSelectedDetail(detail);
      setRcaResult(null); // Clear previous RCA when switching tickets
      setLastDecisionMessage(null);
    } catch (err) {
      console.error("Error loading incident detail:", err);
    }
  };

  const handleRunRCA = async () => {
    if (!selectedIncidentId) return;
    setIsRunningRCA(true);
    try {
      const rca = await generateRCA(selectedIncidentId);
      setRcaResult(rca);
    } catch (err) {
      console.error("Error generating RCA:", err);
    } finally {
      setIsRunningRCA(false);
    }
  };

  const openDecisionModal = (mode: "APPROVE" | "EDIT" | "REJECT") => {
    setDecisionMode(mode);
    setIsDecisionModalOpen(true);
  };

  const handleCommitDecision = async (req: RCADecisionRequest) => {
    try {
      const res = await recordDecision(req);
      setLastDecisionMessage(res.message);
      // Reload incidents list to reflect updated ServiceNow status
      await loadIncidents();
      if (selectedIncidentId) {
        await loadIncidentDetail(selectedIncidentId);
      }
    } catch (err) {
      console.error("Error recording decision:", err);
    }
  };

  const p1Count = incidents.filter((i) => i.priority.startsWith("P1")).length;
  const p2Count = incidents.filter((i) => i.priority.startsWith("P2")).length;
  const resolvedCount = incidents.filter((i) => i.state.includes("Resolved")).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6f8]">
      {/* Enterprise Global Header */}
      <Header
        onOpenKB={() => setIsKBModalOpen(true)}
        onRefresh={loadIncidents}
        isLoading={isLoadingIncidents}
        activeIncidentsCount={incidents.length}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 space-y-4">
        {/* KPI / Distribution Network Health Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 p-3 rounded-md shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Active P1 Outages
              </span>
              <span className="text-xl font-bold text-red-700">{p1Count}</span>
              <span className="text-[10px] text-slate-500 block">Critical Fulfillment Blocks</span>
            </div>
            <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center text-red-700">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3 rounded-md shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Active P2 Disruptions
              </span>
              <span className="text-xl font-bold text-amber-700">{p2Count}</span>
              <span className="text-[10px] text-slate-500 block">Sortation & Gate Delays</span>
            </div>
            <div className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3 rounded-md shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                AI RCA Copilot Mode
              </span>
              <span className="text-sm font-bold text-[#005086]">Supervisor-Gated</span>
              <span className="text-[10px] text-slate-500 block">Human-in-the-Loop Sign-off</span>
            </div>
            <div className="w-8 h-8 rounded bg-sky-100 flex items-center justify-center text-[#005086]">
              <Cpu className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3 rounded-md shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                SOP Ingestion Status
              </span>
              <span className="text-sm font-bold text-emerald-700">100% Synced</span>
              <span className="text-[10px] text-slate-500 block">Vector Index Grounded</span>
            </div>
            <div className="w-8 h-8 rounded bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Section 1: Dashboard Incident Table */}
        <section>
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#005086]" />
              <span>ServiceNow Open Operational Incidents (P1/P2 Distribution Queue)</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">
              Auto-refreshed from synthetic distribution stream
            </span>
          </div>
          <IncidentList
            incidents={incidents}
            selectedId={selectedIncidentId}
            onSelectIncident={(id) => setSelectedIncidentId(id)}
          />
        </section>

        {/* Section 2: Active Investigation Workspace (Two-Pane Split) */}
        {selectedDetail && (
          <section className="space-y-2">
            {/* Pipeline Stage Visualization Banner */}
            <ProcessPipeline
              currentStage={selectedDetail.process_stage}
              stageAnalysis={rcaResult?.pipeline_stage_analysis}
            />

            {/* Split Pane: Left Ticket / Telemetry Viewer, Right AI RCA Proposal */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[580px]">
              {/* Left Pane: Raw ServiceNow Ticket Viewer & System Logs */}
              <div className="lg:col-span-5 h-[620px]">
                <TicketViewer
                  incident={selectedDetail}
                  onRunRCA={handleRunRCA}
                  isRunningRCA={isRunningRCA}
                />
              </div>

              {/* Right Pane: AI RCA Proposal & HITL Decision Action Bar */}
              <div className="lg:col-span-7 h-[620px]">
                <RcaProposalViewer
                  rca={rcaResult}
                  isLoading={isRunningRCA}
                  onApprove={() => openDecisionModal("APPROVE")}
                  onEdit={() => openDecisionModal("EDIT")}
                  onReject={() => openDecisionModal("REJECT")}
                  lastDecisionMessage={lastDecisionMessage}
                />
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Decision Modal (Approve / Edit / Reject) */}
      {rcaResult && (
        <DecisionModal
          isOpen={isDecisionModalOpen}
          mode={decisionMode}
          rca={rcaResult}
          onClose={() => setIsDecisionModalOpen(false)}
          onSubmit={handleCommitDecision}
        />
      )}

      {/* Knowledge Base & SOP Repository Modal */}
      <KnowledgeBaseModal
        isOpen={isKBModalOpen}
        onClose={() => setIsKBModalOpen(false)}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-2 px-4 text-center text-[11px] text-slate-500 font-mono">
        Distribution Operations AI Root Cause Analysis (RCA) Copilot &bull; Enterprise Monorepo &bull; Confidential
      </footer>
    </div>
  );
}
