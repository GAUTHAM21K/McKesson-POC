"use client";

import React, { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { IncidentList } from "../components/IncidentList";
import { TicketViewer } from "../components/TicketViewer";
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

export default function Home() {
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(
    "INC0892110"
  );
  const [selectedDetail, setSelectedDetail] = useState<IncidentDetail | null>(
    null
  );
  const [rcaResult, setRcaResult] = useState<FinalRCAResult | null>(null);

  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  const [isRunningRCA, setIsRunningRCA] = useState(false);
  const [lastDecisionMessage, setLastDecisionMessage] = useState<string | null>(
    null
  );

  // Modals
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionMode, setDecisionMode] = useState<
    "APPROVE" | "EDIT" | "REJECT"
  >("APPROVE");
  const [isKBModalOpen, setIsKBModalOpen] = useState(false);

  // Load Incidents on Mount
  useEffect(() => {
    loadIncidents();
  }, []);

  // When selected incident changes, load detail
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

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7]">
      {/* Frosted Glass Header */}
      <Header
        onOpenKB={() => setIsKBModalOpen(true)}
        onRefresh={loadIncidents}
        isLoading={isLoadingIncidents}
        activeIncidentsCount={incidents.length}
      />

      {/* Main Master-Detail Console */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Incident Queue Selector */}
          <aside className="lg:col-span-4 xl:col-span-4 h-[calc(100vh-6.5rem)] sticky top-20">
            <IncidentList
              incidents={incidents}
              selectedId={selectedIncidentId}
              onSelectIncident={(id) => setSelectedIncidentId(id)}
            />
          </aside>

          {/* Right Column: Active Incident Workspace */}
          <section className="lg:col-span-8 xl:col-span-8 min-h-[calc(100vh-6.5rem)] pb-12">
            {selectedDetail ? (
              <TicketViewer
                incident={selectedDetail}
                rcaResult={rcaResult}
                isRunningRCA={isRunningRCA}
                onRunRCA={handleRunRCA}
                onApprove={() => openDecisionModal("APPROVE")}
                onEdit={() => openDecisionModal("EDIT")}
                onReject={() => openDecisionModal("REJECT")}
                lastDecisionMessage={lastDecisionMessage}
              />
            ) : (
              <div className="h-full flex items-center justify-center p-12 text-center text-xs text-zinc-400 bg-white/60 rounded-2xl border border-black/[0.04]">
                Select an incident from the queue to view details and diagnostics.
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Decision Modal */}
      {rcaResult && (
        <DecisionModal
          isOpen={isDecisionModalOpen}
          mode={decisionMode}
          rca={rcaResult}
          onClose={() => setIsDecisionModalOpen(false)}
          onSubmit={handleCommitDecision}
        />
      )}

      {/* Knowledge Base Modal */}
      <KnowledgeBaseModal
        isOpen={isKBModalOpen}
        onClose={() => setIsKBModalOpen(false)}
      />
    </div>
  );
}
