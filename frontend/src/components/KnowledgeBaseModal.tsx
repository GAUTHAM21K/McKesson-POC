"use client";

import React, { useState, useEffect } from "react";
import { KBArticle } from "../lib/types";
import { searchKB } from "../lib/api";
import { X, Search, BookOpen, Tag } from "lucide-react";

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [selectedKB, setSelectedKB] = useState<KBArticle | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadArticles();
    }
  }, [isOpen]);

  const loadArticles = async (q?: string) => {
    setLoading(true);
    try {
      const data = await searchKB(q);
      setArticles(data);
      if (data.length > 0 && !selectedKB) {
        setSelectedKB(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadArticles(query);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-4xl h-[650px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="p-3 bg-[#005086] text-white flex items-center justify-between border-b border-[#003b64]">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-sky-300" />
            <h3 className="font-bold text-sm">
              Standard Operating Procedures (SOP) & Knowledge Base Repository
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Toolbar */}
        <div className="p-3 bg-slate-50 border-b border-slate-200">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search KBs by error code (e.g. ORA-00054, DELVRY03), component, or tag..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#005086]"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#005086] hover:bg-[#003b64] text-white rounded text-xs font-semibold"
            >
              Search
            </button>
          </form>
        </div>

        {/* Master Detail Split Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left List */}
          <div className="w-2/5 border-r border-slate-200 overflow-y-auto bg-slate-50 divide-y divide-slate-200">
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-500">Querying vector index...</div>
            ) : articles.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">No matching SOPs found.</div>
            ) : (
              articles.map((kb) => (
                <div
                  key={kb.kb_id}
                  onClick={() => setSelectedKB(kb)}
                  className={`p-3 cursor-pointer text-xs transition-colors ${
                    selectedKB?.kb_id === kb.kb_id
                      ? "bg-white border-l-4 border-l-[#005086]"
                      : "hover:bg-slate-100/80"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-mono font-bold text-[#005086]">{kb.kb_id}</span>
                    <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded text-[10px]">
                      {kb.category}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900 leading-snug">
                    {kb.title}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Detail Pane */}
          <div className="w-3/5 p-4 overflow-y-auto bg-white text-xs">
            {selectedKB ? (
              <div className="space-y-3">
                <div className="border-b border-slate-200 pb-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Document ID: <strong>{selectedKB.kb_id}</strong></span>
                    <span>Category: <strong>{selectedKB.category}</strong></span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mt-1">
                    {selectedKB.title}
                  </h4>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedKB.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-100 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono flex items-center gap-1"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded border border-slate-200 whitespace-pre-wrap font-sans text-slate-800 leading-relaxed text-[11px] select-text">
                  {selectedKB.content}
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-center py-12">
                Select an article to view details
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-slate-100 border-t border-slate-200 text-right text-xs">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
