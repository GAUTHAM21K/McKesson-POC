"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Header } from "@/components/Header";
import { TicketViewer } from "@/components/TicketViewer";
import { DecisionModal } from "@/components/DecisionModal";
import { KnowledgeBaseModal } from "@/components/KnowledgeBaseModal";
import {
  IncidentDetail,
  FinalRCAResult,
  RCADecisionRequest,
} from "@/lib/types";
import {
  fetchIncidentDetail,
  generateRCA,
  recordDecision,
} from "@/lib/api";
import { ArrowLeft } from "lucide-react";

export default function InvestigationPage() {
  const params = useParams();
  const incidentId = (params?.id as string) || "INC0892110";

  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [rcaResult, setRcaResult] = useState<FinalRCAResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningRCA, setIsRunningRCA] = useState(false);
  const [lastDecisionMessage, setLastDecisionMessage] = useState<string | null>(null);

  // Modals
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionMode, setDecisionMode] = useState<"APPROVE" | "EDIT" | "REJECT">("APPROVE");
  const [isKBModalOpen, setIsKBModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const detail = await fetchIncidentDetail(incidentId);
        setIncident(detail);
      } catch (err) {
        console.error("Failed to load incident detail:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [incidentId]);

  const handleRunRCA = async () => {
    if (!incidentId) return;
    setIsRunningRCA(true);
    try {
      const rca = await generateRCA(incidentId);
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
      if (incidentId) {
        const detail = await fetchIncidentDetail(incidentId);
        setIncident(detail);
      }
    } catch (err) {
      console.error("Error recording decision:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f7]">
      {/* Header */}
      <Header
        onOpenKB={() => setIsKBModalOpen(true)}
        onRefresh={() => {
          if (incidentId) fetchIncidentDetail(incidentId).then(setIncident);
        }}
        isLoading={isLoading}
        activeIncidentsCount={1}
      />

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white/70 hover:bg-white border border-black/[0.06] transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Incident Queue</span>
          </Link>
          <span className="text-zinc-300">/</span>
          <span className="text-xs font-mono font-medium text-zinc-500">
            {incidentId}
          </span>
        </div>

        {/* Workspace */}
        {isLoading ? (
          <div className="py-24 text-center text-xs text-zinc-400 bg-white/60 rounded-2xl border border-black/[0.04]">
            Loading incident records...
          </div>
        ) : incident ? (
          <TicketViewer
            incident={incident}
            rcaResult={rcaResult}
            isRunningRCA={isRunningRCA}
            onRunRCA={handleRunRCA}
            onApprove={() => openDecisionModal("APPROVE")}
            onEdit={() => openDecisionModal("EDIT")}
            onReject={() => openDecisionModal("REJECT")}
            lastDecisionMessage={lastDecisionMessage}
          />
        ) : (
          <div className="py-24 text-center text-xs text-zinc-400 bg-white/60 rounded-2xl border border-black/[0.04]">
            Incident &quot;{incidentId}&quot; not found.
          </div>
        )}
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
