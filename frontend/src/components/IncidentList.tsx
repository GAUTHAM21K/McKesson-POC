"use client";

import React, { useState } from "react";
import Link from "next/link";
import { IncidentSummary } from "../lib/types";
import { Search, Filter, AlertCircle, ArrowRight } from "lucide-react";

interface IncidentListProps {
  incidents: IncidentSummary[];
  selectedId: string | null;
  onSelectIncident: (id: string) => void;
}

export const IncidentList: React.FC<IncidentListProps> = ({
  incidents,
  selectedId,
  onSelectIncident,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [stageFilter, setStageFilter] = useState<string>("ALL");

  const filtered = incidents.filter((inc) => {
    const matchesSearch =
      inc.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.short_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.distribution_center.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority =
      priorityFilter === "ALL" || inc.priority.startsWith(priorityFilter);

    const matchesStage =
      stageFilter === "ALL" || inc.process_stage.toLowerCase() === stageFilter.toLowerCase();

    return matchesSearch && matchesPriority && matchesStage;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-md shadow-xs">
      {/* Table Toolbar */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by INC#, DC, or symptom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#005086] focus:border-[#005086]"
            />
          </div>
          <span className="text-slate-500 font-mono text-[11px]">
            {filtered.length} of {incidents.length} Records
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <span className="text-slate-500">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#005086]"
            >
              <option value="ALL">All Priorities</option>
              <option value="P1">P1 - Critical</option>
              <option value="P2">P2 - Major</option>
            </select>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-slate-500">Stage:</span>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#005086]"
            >
              <option value="ALL">All Stages</option>
              <option value="SAP">SAP</option>
              <option value="EAI">EAI</option>
              <option value="Acumax">Acumax</option>
              <option value="Pick">Pick</option>
              <option value="Ship">Ship</option>
              <option value="Truck Close">Truck Close</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dense Enterprise Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600">
              <th className="py-2 px-3 w-24">Priority</th>
              <th className="py-2 px-3 w-28">Incident #</th>
              <th className="py-2 px-3 w-24">Stage</th>
              <th className="py-2 px-3 w-44">Distribution Center</th>
              <th className="py-2 px-3">Description</th>
              <th className="py-2 px-3 w-28">State</th>
              <th className="py-2 px-3 w-24 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  No active incidents matching the selected filters.
                </td>
              </tr>
            ) : (
              filtered.map((inc) => {
                const isSelected = inc.incident_id === selectedId;
                const isP1 = inc.priority.startsWith("P1");
                return (
                  <tr
                    key={inc.incident_id}
                    onClick={() => onSelectIncident(inc.incident_id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-sky-50 border-l-4 border-l-[#005086]"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                          isP1
                            ? "bg-red-100 text-red-800 border border-red-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {isP1 ? "P1 - CRIT" : "P2 - MAJ"}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-medium text-slate-900">
                      {inc.number}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-700">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">
                        {inc.process_stage}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700 font-medium truncate max-w-[170px]" title={inc.distribution_center}>
                      {inc.distribution_center}
                    </td>
                    <td className="py-2 px-3 text-slate-600 truncate max-w-[340px]" title={inc.short_description}>
                      {inc.short_description}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${
                        inc.state.includes("Resolved")
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : inc.state.includes("Escalated")
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {inc.state}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/dashboard/investigation/${inc.incident_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-800 hover:bg-blue-900 text-white flex items-center gap-1 transition-colors"
                          title="Open dedicated investigation workspace"
                        >
                          <span>Open RCA</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
