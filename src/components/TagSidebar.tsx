import React, { useState, useMemo } from 'react';
import {
  Tag,
  Hash,
  X,
  Search,
  Trash2,
  Edit3,
  Check,
  CheckSquare,
  Square,
  Merge,
  Filter,
  Sparkles,
  Layers,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { Note } from '../types';

interface TagSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  onRenameTag: (oldTag: string, newTag: string) => void;
  onDeleteTags: (tagsToDelete: string[]) => void;
  onMergeTags: (sourceTags: string[], targetTag: string) => void;
}

interface TagStat {
  label: string;
  count: number;
  hasAi: boolean;
}

export const TagSidebar: React.FC<TagSidebarProps> = ({
  isOpen,
  onClose,
  notes,
  selectedTag,
  onSelectTag,
  onRenameTag,
  onDeleteTags,
  onMergeTags,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedTagsForBulk, setSelectedTagsForBulk] = useState<string[]>([]);
  
  // Modals / Dialog states
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [targetMergeTag, setTargetMergeTag] = useState('');
  const [deleteConfirmTags, setDeleteConfirmTags] = useState<string[] | null>(null);

  // Compute unique tags from all notes
  const tagStats = useMemo(() => {
    const map = new Map<string, { count: number; hasAi: boolean }>();
    
    notes.forEach((note) => {
      if (!note.tags || !Array.isArray(note.tags)) return;
      const seenInNote = new Set<string>();
      
      note.tags.forEach((t) => {
        const clean = (t.label || '').trim().toLowerCase().replace(/^#/, '');
        if (!clean) return;
        
        if (!seenInNote.has(clean)) {
          seenInNote.add(clean);
          const current = map.get(clean) || { count: 0, hasAi: false };
          map.set(clean, {
            count: current.count + 1,
            hasAi: current.hasAi || !!t.isAi,
          });
        }
      });
    });

    const list: TagStat[] = [];
    map.forEach((stat, label) => {
      list.push({ label, count: stat.count, hasAi: stat.hasAi });
    });

    // Sort by count desc, then alphabetically
    return list.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [notes]);

  // Filtered tags based on search
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tagStats;
    const q = searchQuery.toLowerCase().trim();
    return tagStats.filter((t) => t.label.toLowerCase().includes(q));
  }, [tagStats, searchQuery]);

  // Total notes with at least one tag
  const totalTaggedNotes = useMemo(() => {
    return notes.filter((n) => n.tags && n.tags.length > 0).length;
  }, [notes]);

  if (!isOpen) return null;

  // Toggle selection for a tag in bulk mode
  const toggleSelectTag = (label: string) => {
    setSelectedTagsForBulk((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
    );
  };

  // Select all / Deselect all
  const handleToggleSelectAll = () => {
    if (selectedTagsForBulk.length === filteredTags.length) {
      setSelectedTagsForBulk([]);
    } else {
      setSelectedTagsForBulk(filteredTags.map((t) => t.label));
    }
  };

  // Open Rename Dialog for a single tag
  const handleOpenRename = (label: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRenamingTag(label);
    setRenameValue(label);
  };

  // Confirm Rename
  const handleConfirmRename = () => {
    const cleanNew = renameValue.trim().toLowerCase().replace(/^#/, '');
    if (renamingTag && cleanNew && cleanNew !== renamingTag) {
      onRenameTag(renamingTag, cleanNew);
    }
    setRenamingTag(null);
    setRenameValue('');
  };

  // Open Merge Dialog
  const handleOpenMerge = () => {
    if (selectedTagsForBulk.length < 2) return;
    setTargetMergeTag(selectedTagsForBulk[0]);
    setIsMergeModalOpen(true);
  };

  // Confirm Merge
  const handleConfirmMerge = () => {
    const cleanTarget = targetMergeTag.trim().toLowerCase().replace(/^#/, '');
    if (cleanTarget && selectedTagsForBulk.length >= 2) {
      onMergeTags(selectedTagsForBulk, cleanTarget);
      setSelectedTagsForBulk([]);
      setIsBulkMode(false);
    }
    setIsMergeModalOpen(false);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (deleteConfirmTags && deleteConfirmTags.length > 0) {
      onDeleteTags(deleteConfirmTags);
      setSelectedTagsForBulk((prev) => prev.filter((t) => !deleteConfirmTags.includes(t)));
      if (selectedTag && deleteConfirmTags.includes(selectedTag)) {
        onSelectTag(null);
      }
    }
    setDeleteConfirmTags(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Sidebar Drawer */}
      <aside
        id="tag-management-sidebar"
        className="relative w-full max-w-[100vw] sm:max-w-[460px] h-full bg-[#F9F9F8] dark:bg-[#101114] text-slate-900 dark:text-slate-100 border-l border-slate-200/80 dark:border-white/[0.08] shadow-2xl flex flex-col z-10 transition-transform duration-300 ease-out"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200/70 dark:border-white/[0.06] bg-white/90 dark:bg-[#161820]/90 backdrop-blur-md">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.06] flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
                <Tag className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-1.5">
                  <span>Tag Management</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300">
                    {tagStats.length}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {totalTaggedNotes} of {notes.length} notes organized
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              id="close-tag-sidebar-btn"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition cursor-pointer"
              aria-label="Close Tag Sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Tags Input */}
          <div className="mt-3 relative flex items-center bg-white dark:bg-[#161822] rounded-xl border border-slate-200 dark:border-white/[0.08] px-3 py-2 text-xs focus-within:border-indigo-500 transition-colors shadow-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or filter tags..."
              className="w-full bg-transparent border-0 outline-none text-base sm:text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Active Filter Banner (if a tag is selected) */}
          {selectedTag && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-medium">
                <Filter className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Active Filter: <strong>#{selectedTag}</strong>
                </span>
              </div>
              <button
                onClick={() => onSelectTag(null)}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline px-1.5 py-0.5 rounded cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          {/* Bulk Mode Controls Toggle */}
          <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <button
                id="toggle-bulk-mode-btn"
                onClick={() => {
                  setIsBulkMode((prev) => !prev);
                  setSelectedTagsForBulk([]);
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  isBulkMode
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isBulkMode ? 'Done Bulk' : 'Bulk Edit'}</span>
              </button>

              {isBulkMode && (
                <button
                  onClick={handleToggleSelectAll}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 rounded cursor-pointer"
                >
                  {selectedTagsForBulk.length === filteredTags.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            <span className="text-[11px] text-slate-400">
              {filteredTags.length} {filteredTags.length === 1 ? 'tag' : 'tags'}
            </span>
          </div>
        </div>

        {/* Bulk Action Sticky Bar (when 1 or more tags selected) */}
        {isBulkMode && selectedTagsForBulk.length > 0 && (
          <div className="p-3 bg-indigo-50/95 dark:bg-indigo-950/70 border-b border-indigo-200 dark:border-indigo-800/80 flex items-center justify-between gap-2 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
            <span className="font-semibold text-indigo-900 dark:text-indigo-200">
              {selectedTagsForBulk.length} selected
            </span>

            <div className="flex items-center gap-2">
              {selectedTagsForBulk.length === 1 && (
                <button
                  onClick={() => handleOpenRename(selectedTagsForBulk[0])}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3 h-3 text-indigo-500" />
                  <span>Rename</span>
                </button>
              )}

              {selectedTagsForBulk.length >= 2 && (
                <button
                  onClick={handleOpenMerge}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 flex items-center gap-1 cursor-pointer shadow-sm"
                >
                  <Merge className="w-3 h-3" />
                  <span>Merge ({selectedTagsForBulk.length})</span>
                </button>
              )}

              <button
                onClick={() => setDeleteConfirmTags(selectedTagsForBulk)}
                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-rose-600" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}

        {/* Tag List Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
          {filteredTags.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <Hash className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {searchQuery ? 'No matching tags found' : 'No tags in your notes yet'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                {searchQuery
                  ? `No tag matches "${searchQuery}". Try a different keyword.`
                  : 'Capture notes or video reels with the AI analyzer to automatically generate and organize tags.'}
              </p>
            </div>
          ) : (
            filteredTags.map((tag) => {
              const isSelectedForFilter = selectedTag === tag.label;
              const isCheckedInBulk = selectedTagsForBulk.includes(tag.label);

              return (
                <div
                  key={tag.label}
                  onClick={() => {
                    if (isBulkMode) {
                      toggleSelectTag(tag.label);
                    } else {
                      onSelectTag(isSelectedForFilter ? null : tag.label);
                    }
                  }}
                  className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                    isSelectedForFilter
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                      : isCheckedInBulk
                      ? 'bg-slate-100 dark:bg-white/[0.08] border-slate-400 dark:border-white/20'
                      : 'bg-white dark:bg-[#161820] border-slate-200/80 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/[0.14]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                    {/* Bulk Checkbox */}
                    {isBulkMode ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectTag(tag.label);
                        }}
                        className="text-slate-400 hover:text-slate-600 transition shrink-0"
                      >
                        {isCheckedInBulk ? (
                          <CheckSquare className="w-4 h-4 text-slate-900 dark:text-white" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    ) : (
                      <span
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono font-medium ${
                          isSelectedForFilter
                            ? 'bg-white/20 text-white dark:bg-black/10 dark:text-slate-900'
                            : 'bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        #
                      </span>
                    )}

                    {/* Tag Name */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs sm:text-sm font-semibold truncate ${
                            isSelectedForFilter
                              ? 'text-white dark:text-slate-900'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          #{tag.label}
                        </span>
                        {tag.hasAi && (
                          <span title="Auto-extracted by AI" className="inline-flex items-center">
                            <Sparkles className={`w-2.5 h-2.5 shrink-0 ${isSelectedForFilter ? 'text-white/80 dark:text-slate-700' : 'text-indigo-500'}`} />
                          </span>
                        )}
                      </div>
                      <span className={`text-[11px] ${isSelectedForFilter ? 'text-white/70 dark:text-slate-600' : 'text-slate-400 dark:text-slate-500'}`}>
                        {tag.count} {tag.count === 1 ? 'note' : 'notes'}
                      </span>
                    </div>
                  </div>

                  {/* Actions / Filter Indicator */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {!isBulkMode && (
                      <>
                        {/* Rename Icon Button */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenRename(tag.label, e)}
                          className={`min-w-[32px] min-h-[32px] rounded-lg flex items-center justify-center transition cursor-pointer opacity-80 sm:opacity-0 group-hover:opacity-100 ${
                            isSelectedForFilter
                              ? 'text-white/80 hover:text-white hover:bg-white/10 dark:text-slate-700 dark:hover:text-black dark:hover:bg-black/10'
                              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08]'
                          }`}
                          title={`Rename #${tag.label}`}
                          aria-label={`Rename #${tag.label}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Icon Button */}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmTags([tag.label])}
                          className={`min-w-[32px] min-h-[32px] rounded-lg flex items-center justify-center transition cursor-pointer opacity-80 sm:opacity-0 group-hover:opacity-100 ${
                            isSelectedForFilter
                              ? 'text-rose-200 hover:text-white hover:bg-rose-500/20'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                          }`}
                          title={`Delete #${tag.label} from all notes`}
                          aria-label={`Delete #${tag.label}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {/* Active Indicator */}
                    {isSelectedForFilter && !isBulkMode && (
                      <span className="text-[11px] font-semibold tracking-wide flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>Filter Active</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="p-3 sm:p-4 border-t border-slate-200/80 dark:border-white/[0.08] bg-white/60 dark:bg-[#10121A]/60 text-[11px] text-slate-400 dark:text-slate-500 flex items-center justify-between">
          <span>Click tag to filter feed</span>
          <span>Auto-syncs across notes</span>
        </div>
      </aside>

      {/* ── Dialog: Rename Single Tag ── */}
      {renamingTag && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setRenamingTag(null)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#161822] rounded-2xl p-5 border border-slate-200 dark:border-white/[0.1] shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-2">
              <Edit3 className="w-4 h-4 text-indigo-500" />
              <span>Rename Tag</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Renaming <strong>#{renamingTag}</strong> will update it across all notes that use it.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmRename();
              }}
              className="space-y-4"
            >
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#10121A] px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] focus-within:border-indigo-500">
                <span className="text-slate-400 font-semibold text-sm">#</span>
                <input
                  type="text"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="new-tag-name..."
                  className="w-full bg-transparent border-0 outline-none text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRenamingTag(null)}
                  className="min-h-[40px] px-3.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameValue.trim() || renameValue.trim().toLowerCase() === renamingTag}
                  className="min-h-[40px] px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition shadow-sm"
                >
                  Save Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Dialog: Merge Tags ── */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMergeModalOpen(false)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#161822] rounded-2xl p-5 border border-slate-200 dark:border-white/[0.1] shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-2">
              <Merge className="w-4 h-4 text-indigo-500" />
              <span>Merge {selectedTagsForBulk.length} Tags</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Combine these tags into a single unified tag:
            </p>

            <div className="flex flex-wrap gap-1 mb-4 p-2.5 rounded-xl bg-slate-50 dark:bg-[#10121A] border border-slate-200/70 dark:border-white/[0.06]">
              {selectedTagsForBulk.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-200/60 dark:border-indigo-800/60"
                >
                  #{t}
                </span>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleConfirmMerge();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Merge into Tag:
                </label>
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-[#10121A] px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] focus-within:border-indigo-500">
                  <span className="text-slate-400 font-semibold text-sm">#</span>
                  <input
                    type="text"
                    value={targetMergeTag}
                    onChange={(e) => setTargetMergeTag(e.target.value)}
                    placeholder="target-tag-name..."
                    className="w-full bg-transparent border-0 outline-none text-xs sm:text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsMergeModalOpen(false)}
                  className="min-h-[40px] px-3.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!targetMergeTag.trim()}
                  className="min-h-[40px] px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition shadow-sm flex items-center gap-1.5"
                >
                  <span>Merge Tags</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Dialog: Confirm Delete Tags ── */}
      {deleteConfirmTags && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirmTags(null)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#161822] rounded-2xl p-5 border border-slate-200 dark:border-white/[0.1] shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              Delete {deleteConfirmTags.length === 1 ? 'Tag' : `${deleteConfirmTags.length} Tags`}?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              {deleteConfirmTags.length === 1 ? (
                <>
                  Are you sure you want to remove <strong>#{deleteConfirmTags[0]}</strong> from all notes? The notes themselves will not be deleted.
                </>
              ) : (
                <>
                  Are you sure you want to remove these {deleteConfirmTags.length} tags across all notes? The notes themselves will not be deleted.
                </>
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTags(null)}
                className="min-h-[40px] px-3.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="min-h-[40px] px-4 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm cursor-pointer"
              >
                Delete from Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
