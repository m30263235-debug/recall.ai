import React, { useState } from 'react';
import { Sparkles, Clock, Check, Eye, EyeOff, Calendar, ArrowRight, BellOff } from 'lucide-react';
import { Note } from '../types';

interface RecallFeedProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
}

export const RecallFeed: React.FC<RecallFeedProps> = ({ notes, onSelectNote, onUpdateNote }) => {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Compute smart resurfaced candidates (e.g. notes older than 3 days, not snoozed, not archived)
  const now = Date.now();
  const candidates = notes.filter((n) => {
    if (n.isArchived) return false;
    if (dismissedIds.includes(n.id)) return false;
    if (n.snoozedUntil && n.snoozedUntil > now) return false;

    // Resurface notes from ~3 days, 7 days, 14 days, or 30 days ago (spaced retrieval)
    const ageDays = (now - n.createdAt) / (1000 * 60 * 60 * 24);
    return ageDays >= 2; // At least 2 days old
  });

  // Sort candidates by priority / spaced interval
  const resurfacedNotes = candidates.slice(0, 3);

  const handleSnooze = (note: Note, days: number, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateNote({
      ...note,
      snoozedUntil: now + days * 24 * 60 * 60 * 1000,
    });
    setDismissedIds((prev) => [...prev, note.id]);
  };

  const handleMarkReviewed = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateNote({
      ...note,
      lastResurfacedAt: now,
    });
    setDismissedIds((prev) => [...prev, note.id]);
  };

  if (resurfacedNotes.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-white dark:bg-[#161820] border border-slate-200/80 dark:border-white/[0.07] text-center mb-8 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 mx-auto flex items-center justify-center mb-3">
          <Check className="w-5 h-5 text-emerald-500" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Your Mind is Clear
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
          No older notes need resurfacing today. Spaced retrieval will quietly surface past reviews and ideas when optimal.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-indigo-500" />
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Spaced Retrieval
          </h2>
          <span className="text-xs text-slate-400">
            · Proactive memory
          </span>
        </div>
        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-md">
          {resurfacedNotes.length} resurfaced today
        </span>
      </div>

      <div className="space-y-3.5">
        {resurfacedNotes.map((note) => {
          const daysOld = Math.round((now - note.createdAt) / (1000 * 60 * 60 * 24));
          const reason =
            daysOld >= 14
              ? `Spaced repetition: Captured ${daysOld} days ago`
              : note.connections && note.connections.length > 0
              ? `Context connection: Links to your active reviews`
              : `Proactive recall: Revisit this ${note.category.toLowerCase()}`;

          return (
            <div
              key={note.id}
              onClick={() => onSelectNote(note)}
              className="p-5 rounded-2xl bg-white dark:bg-[#161820] border border-slate-200/80 dark:border-white/[0.07] shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:border-slate-300 dark:hover:border-white/[0.12] transition-all cursor-pointer"
            >
              {/* Resurface Reason Banner */}
              <div className="flex items-center justify-between gap-2 mb-2.5 pb-2.5 border-b border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{reason}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {daysOld}d ago
                </span>
              </div>

              {/* Note Summary */}
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5 leading-snug">
                {note.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed mb-4">
                {note.aiSummary || note.content}
              </p>

              {/* Quick Actions for Resurfaced note */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleMarkReviewed(note, e)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-100 transition font-medium cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Acknowledge</span>
                  </button>

                  <button
                    onClick={(e) => handleSnooze(note, 7, e)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 transition cursor-pointer"
                  >
                    <BellOff className="w-3 h-3" />
                    <span>Snooze 7d</span>
                  </button>
                </div>

                <span className="flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  <span>Open note</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
