import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  ExternalLink,
  Cpu,
  ArrowRight,
} from 'lucide-react';
import { Note, AskAnswer } from '../types';

interface AskNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onSelectNote: (note: Note) => void;
}

export const AskNotesModal: React.FC<AskNotesModalProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectNote,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AskAnswer[]>([]);

  if (!isOpen) return null;

  const sampleQuestions = [
    'What budget IEMs were recommended and what are their bios?',
    'Show me all IEM reels with prices and direct links',
    'What did the design video say about spring physics?',
    'Show me my travel reels',
  ];

  const handleAsk = async (questionText?: string) => {
    const q = (questionText || query).trim();
    if (!q || loading) return;

    setLoading(true);
    if (questionText) setQuery(questionText);

    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          notes: notes.map((n) => ({
            id: n.id,
            title: n.title,
            content: n.content,
            executiveSummary: n.executiveSummary,
            detailedSummary: n.detailedSummary,
            keyTakeaways: n.keyTakeaways,
            keywords: n.keywords || (n.tags || []).map((t) => t.label),
            category: n.category,
            mediaType: n.mediaType,
            sourceUrl: n.sourceUrl,
            imageUrl: n.imageUrl,
            productBio: n.productBio,
            keyDetails: n.keyDetails,
            tags: n.tags,
            createdAt: n.createdAt,
          })),
        }),
      });

      const data = await res.json();
      setHistory((prev) => [data, ...prev]);
    } catch (err) {
      console.error('Failed to ask notes:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#161820] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-400 dark:text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Ask Second Brain
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Query across saved video reels, item bios, and specs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {history.length === 0 && (
            <div className="py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 mx-auto flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5 text-indigo-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                Explore Your Saved Knowledge
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
                Ask about specific models, prices, audio signatures, or synthesize across multiple reels.
              </p>

              <div className="flex flex-col gap-2 max-w-md mx-auto text-left">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Suggested Questions:
                </span>
                {sampleQuestions.map((sq, i) => (
                  <button
                    key={i}
                    onClick={() => handleAsk(sq)}
                    className="p-3 text-xs rounded-xl bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-200/70 dark:border-white/[0.06] text-slate-700 dark:text-slate-200 transition text-left cursor-pointer flex items-center justify-between group"
                  >
                    <span>{sq}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Q&A Items */}
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-200/70 dark:border-white/[0.06] p-4 sm:p-5 space-y-3"
            >
              {/* Question */}
              <div className="flex items-start gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0 mt-0.5">
                  Query:
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {item.query}
                </p>
              </div>

              {/* Answer */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-white/[0.05] text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-normal">
                {item.answer}
              </div>

              {/* Citations */}
              {item.citations && item.citations.length > 0 && (
                <div className="pt-2 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Referenced Sources ({item.citations.length}):
                  </span>

                  <div className="grid grid-cols-1 gap-2">
                    {item.citations.map((c) => {
                      const origNote = notes.find((n) => n.id === c.noteId);
                      return (
                        <div
                          key={c.noteId}
                          className="p-3 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.06] flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {c.category}
                              </span>
                              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                {c.title}
                              </span>
                            </div>

                            {c.sourceUrl && (
                              <a
                                href={c.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 flex items-center gap-1 shrink-0 transition"
                              >
                                <span>Link</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          {c.productBio && (
                            <div className="text-xs text-slate-600 dark:text-slate-300">
                              <span className="font-semibold">{c.productBio.itemName}</span>
                              {c.productBio.priceRange && ` (${c.productBio.priceRange})`}
                              {` — ${c.productBio.bioSummary}`}
                            </div>
                          )}

                          {origNote && (
                            <button
                              onClick={() => {
                                onSelectNote(origNote);
                                onClose();
                              }}
                              className="text-left text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              Open full note details →
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.06] flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-slate-600 dark:text-slate-400" />
              <span className="text-xs text-slate-500">
                Synthesizing answer from your saved reels and notes...
              </span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3.5 bg-white dark:bg-[#161820] border-t border-slate-100 dark:border-white/[0.06]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about budget IEMs, prices, specs, or search reels..."
              className="flex-1 bg-slate-50 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-slate-400"
            />
            <button
              type="submit"
              disabled={!query.trim() || loading}
              className={`p-2.5 rounded-xl flex items-center justify-center transition cursor-pointer ${
                query.trim() && !loading
                  ? 'bg-slate-900 text-white hover:bg-black dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-white/[0.06] text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
