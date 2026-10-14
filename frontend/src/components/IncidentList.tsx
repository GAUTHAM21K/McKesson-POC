"use client";

import React, { useState } from "react";
import { IncidentSummary } from "../lib/types";
import { Search, MapPin, Clock } from "lucide-react";

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

  const filtered = incidents.filter((inc) => {
    const matchesSearch =
      inc.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.short_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.distribution_center.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.process_stage.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority =
      priorityFilter === "ALL" || inc.priority.startsWith(priorityFilter);

    return matchesSearch && matchesPriority;
  });

  return (
    <div className="flex flex-col h-full bg-white/70 backdrop-blur-sm border border-black/[0.06] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
      {/* Search & Filter Header */}
      <div className="p-3.5 border-b border-black/[0.04] space-y-2.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search incidents, facilities, stages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-100/80 hover:bg-zinc-100 focus:bg-white border border-transparent focus:border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/15 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 text-[11px]">
          {(["ALL", "P1", "P2"] as const).map((p) => {
            const count =
              p === "ALL"
                ? incidents.length
                : incidents.filter((i) => i.priority.startsWith(p)).length;
            const label = p === "ALL" ? "All" : p === "P1" ? "P1 Critical" : "P2 Major";
            const isActive = priorityFilter === p;

            return (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                  isActive
                    ? "bg-zinc-900 text-white shadow-xs"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Incident Cards Queue */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y-0">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            No incidents found matching &quot;{searchTerm}&quot;
          </div>
        ) : (
          filtered.map((inc) => {
            const isSelected = inc.incident_id === selectedId;
            const isP1 = inc.priority.startsWith("P1");
            const isResolved = inc.state.includes("Resolved");

            return (
              <div
                key={inc.incident_id}
                onClick={() => onSelectIncident(inc.incident_id)}
                className={`group p-3 rounded-xl cursor-pointer transition-all duration-150 border text-left ${
                  isSelected
                    ? "bg-white border-zinc-300/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-[#0071e3]/30"
                    : "bg-transparent hover:bg-zinc-100/60 border-transparent"
                }`}
              >
                {/* Card Top: Number, Severity Dot, Stage */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isResolved
                          ? "bg-emerald-500"
                          : isP1
                          ? "bg-rose-500"
                          : "bg-amber-500"
                      }`}
                    />
                    <span className="font-mono text-xs font-semibold text-zinc-900">
                      {inc.number}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600">
                      {inc.process_stage}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      isP1
                        ? "text-rose-700 bg-rose-50"
                        : "text-amber-700 bg-amber-50"
                    }`}
                  >
                    {isP1 ? "P1" : "P2"}
                  </span>
                </div>

                {/* Card Title */}
                <h4 className="text-xs font-medium text-zinc-800 line-clamp-2 leading-snug mb-2">
                  {inc.short_description}
                </h4>

                {/* Card Footer: DC & Status */}
                <div className="flex items-center justify-between text-[11px] text-zinc-400 font-normal">
                  <div className="flex items-center gap-1 truncate max-w-[180px]">
                    <MapPin className="w-3 h-3 shrink-0 text-zinc-400" />
                    <span className="truncate">{inc.distribution_center}</span>
                  </div>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {inc.state}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
