"use client";

import React, { useState, useEffect } from "react";
import { KBArticle } from "../lib/types";
import { searchKB } from "../lib/api";
import { X, Search, BookOpen, Layers } from "lucide-react";

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
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-black/[0.08] w-full max-w-5xl h-[700px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="p-4 border-b border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-zinc-900">
                Standard Operating Procedures & Runbooks
              </h3>
              <p className="text-[11px] text-zinc-500">
                Official warehouse distribution incident recovery guidelines
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-zinc-50 border-b border-black/[0.04]">
          <form onSubmit={handleSearch} className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search runbooks by keyword, error code (ORA-00054, DELVRY03), or process stage..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/20 transition-all"
            />
          </form>
        </div>

        {/* Master Detail Split Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Article List */}
          <div className="w-80 border-r border-black/[0.06] overflow-y-auto p-2 space-y-1 bg-zinc-50/50">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                Searching runbooks...
              </div>
            ) : articles.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">
                No matching SOP articles found.
              </div>
            ) : (
              articles.map((art) => {
                const isSelected = selectedKB?.kb_id === art.kb_id;
                return (
                  <div
                    key={art.kb_id}
                    onClick={() => setSelectedKB(art)}
                    className={`p-3 rounded-xl cursor-pointer text-left transition-all ${
                      isSelected
                        ? "bg-white text-zinc-900 shadow-xs border border-zinc-200/80"
                        : "hover:bg-zinc-100 text-zinc-600 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                      <span className="font-semibold text-zinc-900">
                        {art.kb_id}
                      </span>
                      <span className="text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                        {art.category}
                      </span>
                    </div>
                    <div className="text-xs font-medium line-clamp-2 leading-snug">
                      {art.title}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: Article Content Viewer */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {selectedKB ? (
              <div className="space-y-4 max-w-2xl">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-semibold text-[#0071e3] bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                      {selectedKB.kb_id}
                    </span>
                    <span className="text-xs text-zinc-400">&bull;</span>
                    <span className="text-xs font-medium text-zinc-500">
                      {selectedKB.category}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-zinc-900 leading-snug">
                    {selectedKB.title}
                  </h2>
                </div>

                {/* Applicable Stages */}
                {selectedKB.applicable_stages && selectedKB.applicable_stages.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-zinc-400">Applicable Stages:</span>
                    {selectedKB.applicable_stages.map((st) => (
                      <span
                        key={st}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700"
                      >
                        {st}
                      </span>
                    ))}
                  </div>
                )}

                {/* Tags */}
                {selectedKB.tags && (
                  <div className="flex flex-wrap gap-1">
                    {selectedKB.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Content */}
                <div className="pt-4 border-t border-black/[0.04] text-xs text-zinc-800 leading-relaxed font-normal whitespace-pre-line select-text">
                  {selectedKB.content}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                Select an SOP article from the list to view instructions.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
