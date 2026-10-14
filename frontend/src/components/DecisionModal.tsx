"use client";

import React, { useState } from "react";
import { FinalRCAResult, RCADecisionRequest } from "../lib/types";
import { X, CheckCircle2, RotateCcw } from "lucide-react";

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
        notes:
          operatorNotes ||
          (mode === "APPROVE"
            ? "Approved as submitted by diagnostic system"
            : ""),
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
    APPROVE: "Approve Resolution & Route Ticket",
    EDIT: "Modify Resolution Details",
    REJECT: "Dismiss Diagnosis & Escalate",
  };

  const descriptions = {
    APPROVE:
      "Validates the identified root cause and synchronizes the recovery procedure and group assignment directly to ServiceNow.",
    EDIT:
      "Adjust the diagnosis summary or target assignment group before pushing the updates to ServiceNow.",
    REJECT:
      "Dismisses this diagnostic recommendation. The ticket remains open for manual Tier 3 investigation.",
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-black/[0.08] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-black/[0.04] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-zinc-900">
              {titles[mode]}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Incident {rca.incident_number} &middot; {rca.distribution_center}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <p className="text-zinc-600 leading-relaxed">{descriptions[mode]}</p>

          {mode === "EDIT" ? (
            <div className="space-y-3">
              <div>
                <label className="font-medium text-zinc-700 block mb-1">
                  Root Cause Summary
                </label>
                <textarea
                  rows={3}
                  value={editedRootCause}
                  onChange={(e) => setEditedRootCause(e.target.value)}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="font-medium text-zinc-700 block mb-1">
                  Assignment Group
                </label>
                <input
                  type="text"
                  value={editedGroup}
                  onChange={(e) => setEditedGroup(e.target.value)}
                  className="w-full p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:bg-white transition-all"
                />
              </div>
            </div>
          ) : (
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/60 space-y-1.5">
              <div className="font-semibold text-zinc-900">
                Summary: {rca.root_cause_summary}
              </div>
              <div className="text-zinc-500 text-[11px]">
                Target Group: <span className="font-medium text-zinc-800">{rca.predicted_assignment_group}</span>
              </div>
            </div>
          )}

          <div>
            <label className="font-medium text-zinc-700 block mb-1">
              Operator Work Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Add verification notes or instructions for the on-call team..."
              value={operatorNotes}
              onChange={(e) => setOperatorNotes(e.target.value)}
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 focus:bg-white transition-all placeholder-zinc-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-black/[0.04] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-full text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-full text-xs font-medium text-white transition-all flex items-center gap-1.5 shadow-xs ${
                mode === "REJECT"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-[#0071e3] hover:bg-[#0077ed]"
              }`}
            >
              {isSubmitting ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synchronizing...</span>
                </>
              ) : (
                <span>Confirm & Update Ticket</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
