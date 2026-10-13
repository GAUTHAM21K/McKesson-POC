"use client";

import React, { useState } from "react";
import { FinalRCAResult, RCADecisionRequest } from "../lib/types";
import { X, ThumbsUp, Edit3, XCircle, CheckCircle } from "lucide-react";

interface DecisionModalProps {
  isOpen: boolean;
  mode: "APPROVE" | "EDIT" | "REJECT";
  rca: FinalRCAResult;
  onClose: () => void;
  onSubmit: (request: RCADecisionRequest) => Promise<void>;
}

export const DecisionModal: React.FC<DecisionModalProps> = ({
  isOpen,
  mode,
  rca,
  onClose,
  onSubmit,
}) => {
  const [operatorNotes, setOperatorNotes] = useState("");
  const [editedRootCause, setEditedRootCause] = useState(rca.root_cause_summary);
  const [editedGroup, setEditedGroup] = useState(rca.predicted_assignment_group);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: RCADecisionRequest = {
        incident_id: rca.incident_id,
        action: mode,
        operator_name: "Operations Commander (Marcus / Ops Console)",
        notes: operatorNotes || (mode === "APPROVE" ? "Approved as submitted by AI RCA Supervisor" : ""),
        edited_root_cause: mode === "EDIT" ? editedRootCause : undefined,
        edited_assignment_group: mode === "EDIT" ? editedGroup : undefined,
      };
      await onSubmit(payload);
      onClose();
    } catch (err) {
      console.error("Failed to commit decision", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const titles = {
    APPROVE: "Approve AI RCA Proposal & Commit Routing",
    EDIT: "Edit & Override RCA Diagnosis",
    REJECT: "Reject RCA Proposal & Request Telemetry",
  };

  const descriptions = {
    APPROVE: "You are validating this AI-generated root cause diagnosis and authorizing ticket reassignment and remediation dispatch.",
    EDIT: "Modify the root cause summary or target assignment group based on operational discretion before synchronizing to ServiceNow.",
    REJECT: "Reject the AI analysis. The ticket will remain escalated for manual tier 3 engineering investigation.",
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className={`p-4 border-b text-white flex items-center justify-between ${
          mode === "APPROVE"
            ? "bg-emerald-800 border-emerald-900"
            : mode === "EDIT"
            ? "bg-[#005086] border-[#003b64]"
            : "bg-red-800 border-red-900"
        }`}>
          <div className="flex items-center space-x-2">
            {mode === "APPROVE" && <ThumbsUp className="w-4 h-4" />}
            {mode === "EDIT" && <Edit3 className="w-4 h-4" />}
            {mode === "REJECT" && <XCircle className="w-4 h-4" />}
            <h3 className="font-bold text-sm">{titles[mode]}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          <p className="text-slate-600 leading-normal">
            {descriptions[mode]}
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-slate-700">
            <div className="flex justify-between font-mono text-[11px] mb-1">
              <span>Incident ID: <strong>{rca.incident_number}</strong></span>
              <span>DC: <strong>{rca.distribution_center}</strong></span>
            </div>
            <div className="text-[11px] text-slate-500">
              Process Stage: <span className="font-semibold text-slate-800">{rca.process_stage}</span>
            </div>
          </div>

          {mode === "EDIT" && (
            <>
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Adjusted Root Cause Summary:
                </label>
                <textarea
                  rows={3}
                  value={editedRootCause}
                  onChange={(e) => setEditedRootCause(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#005086]"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Reassign To Assignment Group:
                </label>
                <select
                  value={editedGroup}
                  onChange={(e) => setEditedGroup(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#005086]"
                >
                  <option value="Acumax Support">Acumax Support</option>
                  <option value="SAP Support">SAP Support</option>
                  <option value="EAI Support">EAI Support</option>
                  <option value="Conveyor & WCS Automation Ops">Conveyor & WCS Automation Ops</option>
                  <option value="Distribution Ops Incident Management">Distribution Ops Incident Management</option>
                  <option value="Core DBA Team">Core DBA Team</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              {mode === "REJECT" ? "Rejection Reason & Required Telemetry (Required):" : "Operator Work Notes / Comments (Optional):"}
            </label>
            <textarea
              rows={mode === "REJECT" ? 3 : 2}
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              placeholder={
                mode === "REJECT"
                  ? "E.g., Contradiction noted in database dump; requesting physical optical alignment telemetry from shift engineer..."
                  : "Enter additional context to append to ServiceNow work notes..."
              }
              className="w-full p-2 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#005086]"
              required={mode === "REJECT"}
            />
          </div>

          {/* ServiceNow Payload Preview */}
          <div className="bg-slate-900 text-slate-300 p-2.5 rounded font-mono text-[10px] select-text">
            <span className="text-slate-400 block mb-0.5">// ServiceNow Target Payload Preview</span>
            <code>
              {JSON.stringify(
                {
                  incident_id: rca.incident_id,
                  u_rca_status: mode,
                  state: mode === "APPROVE" ? "Resolved (Pending Validation)" : mode === "REJECT" ? "Escalated to Engineering" : "In Progress (Operator Modified)",
                  assignment_group: mode === "EDIT" ? editedGroup : rca.predicted_assignment_group,
                },
                null,
                2
              )}
            </code>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-1.5 rounded font-semibold text-white shadow-xs transition-colors disabled:opacity-50 ${
                mode === "APPROVE"
                  ? "bg-emerald-700 hover:bg-emerald-800"
                  : mode === "EDIT"
                  ? "bg-[#005086] hover:bg-[#003b64]"
                  : "bg-red-700 hover:bg-red-800"
              }`}
            >
              {isSubmitting ? "Committing..." : `Confirm ${mode}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
