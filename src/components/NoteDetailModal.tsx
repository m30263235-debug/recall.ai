import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Video,
  Clock,
  Trash2,
  Headphones,
  Save,
  Check,
  Tag as TagIcon,
  Cpu,
  Copy,
  Hash,
  ListChecks,
  FileText,
  Globe,
  Pin,
  Archive,
  ArchiveRestore,
  Sparkles,
} from 'lucide-react';
import { Note, NoteTag } from '../types';

interface NoteDetailModalProps {
  note: Note | null;
  onClose: () => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  allNotes: Note[];
  onSelectConnectedNote?: (id: string) => void;
}

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({
  note,
  onClose,
  onUpdateNote,
  onDeleteNote,
}) => {
  if (!note) return null;

  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [category, setCategory] = useState(note.category);
  const [newTag, setNewTag] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedKeywords, setCopiedKeywords] = useState(false);
  const [activeTab, setActiveTab] = useState<'breakdown' | 'bio' | 'edit'>('breakdown');

  const ytMatch = note.sourceUrl?.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  const youtubeEmbedUrl = note.videoEmbedUrl || (ytMatch ? `https://www.youtube.com/embed/${ytMatch[1]}` : undefined);

  const displayKeywords = Array.from(
    new Set([
      ...(note.keywords || []),
      ...(note.tags || []).map((t) => t.label),
    ])
  ).filter(Boolean);

  const handleSave = () => {
    onUpdateNote({
      ...note,
      title: title.trim() || 'Untitled Note',
      content: content.trim(),
      detailedSummary: content.trim(),
      category: category.trim() || 'General',
      updatedAt: Date.now(),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCopySummary = () => {
    const textToCopy = `${note.title}\n\nSUMMARY:\n${note.executiveSummary || note.aiSummary || note.content}\n\nKEY TAKEAWAYS:\n${(note.keyTakeaways || []).map((k) => `• ${k}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleCopyKeywords = () => {
    const kws = displayKeywords.join(', ');
    navigator.clipboard.writeText(kws);
    setCopiedKeywords(true);
    setTimeout(() => setCopiedKeywords(false), 2000);
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTag.replace(/^#/, '').trim().toLowerCase();
    if (!clean) return;

    if (!note.tags.some((t) => t.label === clean)) {
      const updatedTags: NoteTag[] = [
        ...note.tags,
        { id: `tag-${Date.now()}`, label: clean, isAi: false },
      ];
      onUpdateNote({ ...note, tags: updatedTags });
    }
    setNewTag('');
  };

  const handleRemoveTag = (tagId: string) => {
    const updatedTags = note.tags.filter((t) => t.id !== tagId);
    onUpdateNote({ ...note, tags: updatedTags });
  };

  const isTech =
    note.category.toLowerCase().includes('tech') ||
    note.category.toLowerCase().includes('gear') ||
    note.category.toLowerCase().includes('gadget') ||
    note.title.toLowerCase().includes('wearable') ||
    note.title.toLowerCase().includes('omi');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white dark:bg-[#161820] rounded-2xl border border-slate-200/80 dark:border-white/[0.08] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
              {category}
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-xs text-slate-500">
              {note.sourceUrl?.includes('youtube')
                ? 'YouTube'
                : note.sourceUrl?.includes('instagram')
                ? 'Instagram Reel'
                : 'Note'}
            </span>
            {note.creator && (
              <>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {note.creator.startsWith('@') ? note.creator : `@${note.creator}`}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {note.sourceUrl && (
              <a
                href={note.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 flex items-center gap-1.5 transition mr-1"
              >
                <span>Original Link</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {/* Pin Toggle */}
            <button
              onClick={() => {
                onUpdateNote({
                  ...note,
                  isPinned: !note.isPinned,
                  updatedAt: Date.now(),
                });
              }}
              className={`p-1.5 rounded-lg transition cursor-pointer text-xs ${
                note.isPinned
                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/40'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08]'
              }`}
              title={note.isPinned ? 'Unpin' : 'Pin to top'}
              aria-label="Pin note"
            >
              <Pin className={`w-4 h-4 ${note.isPinned ? 'fill-current' : ''}`} />
            </button>

            {/* Archive Toggle */}
            <button
              onClick={() => {
                onUpdateNote({
                  ...note,
                  isArchived: !note.isArchived,
                  updatedAt: Date.now(),
                });
                onClose();
              }}
              className={`p-1.5 rounded-lg transition cursor-pointer text-xs ${
                note.isArchived
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.08]'
              }`}
              title={note.isArchived ? 'Restore from Archive' : 'Archive note'}
              aria-label="Archive note"
            >
              {note.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
            </button>

            {/* Delete */}
            <button
              onClick={() => {
                onDeleteNote(note.id);
                onClose();
              }}
              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.08] transition cursor-pointer"
              title="Delete note"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.08] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 border-b border-slate-100 dark:border-white/[0.06] overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('breakdown')}
            className={`pb-2.5 px-1 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'breakdown'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Overview & Insights</span>
          </button>

          {note.productBio && (
            <button
              onClick={() => setActiveTab('bio')}
              className={`pb-2.5 px-1 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'bio'
                  ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {isTech ? <Cpu className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
              <span>Item Dossier & Specs</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('edit')}
            className={`pb-2.5 px-1 text-xs font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'edit'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <TagIcon className="w-3.5 h-3.5" />
            <span>Edit Note & Tags</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          {activeTab === 'breakdown' && (
            <div className="space-y-5">
              {/* Media presentation */}
              {youtubeEmbedUrl ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-sm">
                  <iframe
                    src={youtubeEmbedUrl}
                    title={note.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              ) : note.imageUrl ? (
                <div className="relative w-full h-56 sm:h-72 rounded-xl overflow-hidden bg-slate-950">
                  <img
                    src={note.imageUrl}
                    alt={note.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src.includes('maxresdefault.jpg')) {
                        target.src = target.src.replace('maxresdefault.jpg', 'hqdefault.jpg');
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}

              {/* Title */}
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-snug tracking-tight">
                  {note.title}
                </h2>
              </div>

              {/* Executive Summary */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Executive Summary
                  </span>
                  <button
                    onClick={handleCopySummary}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-normal">
                  {note.executiveSummary || note.aiSummary || note.content}
                </p>
              </div>

              {/* Detailed Breakdown */}
              {note.detailedSummary && note.detailedSummary !== (note.executiveSummary || note.aiSummary) && (
                <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                    Detailed Synthesis
                  </span>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                    {note.detailedSummary}
                  </p>
                </div>
              )}

              {/* Key Takeaways */}
              {note.keyTakeaways && note.keyTakeaways.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 mb-3">
                    <ListChecks className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>Key Takeaways & Findings</span>
                  </div>
                  <ul className="space-y-2">
                    {note.keyTakeaways.map((point, i) => (
                      <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                        <span className="leading-relaxed">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extracted Keywords */}
              {displayKeywords.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Extracted Keywords & Concepts
                    </span>
                    <button
                      onClick={handleCopyKeywords}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      {copiedKeywords ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKeywords ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {displayKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300"
                      >
                        #{kw.replace(/^#/, '').toLowerCase().trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Web Citations */}
              {note.searchCitations && note.searchCitations.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    <Globe className="w-3.5 h-3.5" />
                    <span>Grounded Sources</span>
                  </div>
                  <div className="space-y-1.5">
                    {note.searchCitations.map((cit, idx) => (
                      <a
                        key={idx}
                        href={cit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.04]"
                      >
                        <span className="font-medium truncate">{cit.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 ml-2 text-slate-400" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Product Bio Tab */}
          {activeTab === 'bio' && note.productBio && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {note.productBio.itemName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {note.productBio.itemType}
                  </p>
                </div>
                {note.productBio.priceRange && (
                  <span className="text-sm font-mono font-bold px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-slate-100">
                    {note.productBio.priceRange}
                  </span>
                )}
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Summary & Functionality
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {note.productBio.bioSummary}
                </p>
              </div>

              {note.productBio.driverOrSpecs && (
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Technical Specifications
                  </span>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] font-mono text-xs text-slate-800 dark:text-slate-200 border border-slate-200/60 dark:border-white/[0.06]">
                    {note.productBio.driverOrSpecs}
                  </div>
                </div>
              )}

              {/* Strengths & Limitations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {note.productBio.pros && note.productBio.pros.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block mb-2">
                      Advantages:
                    </span>
                    <ul className="space-y-1.5">
                      {note.productBio.pros.map((p, idx) => (
                        <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                          <span className="text-emerald-500">✓</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {note.productBio.cons && note.productBio.cons.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 block mb-2">
                      Considerations:
                    </span>
                    <ul className="space-y-1.5">
                      {note.productBio.cons.map((c, idx) => (
                        <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                          <span className="text-rose-500">✕</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {note.productBio.verdict && (
                <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06]">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Verdict
                  </span>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 italic border-l-2 border-indigo-500 pl-3">
                    "{note.productBio.verdict}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Edit Tab */}
          {activeTab === 'edit' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-base font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-white/[0.04] p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.08] outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Content & Breakdown
                </label>
                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-white/[0.04] p-3 rounded-xl border border-slate-200/80 dark:border-white/[0.08] outline-none focus:border-slate-400 leading-relaxed resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-white/[0.04] p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] outline-none focus:border-slate-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Tags & Keywords
                </label>
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  {note.tags.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300"
                    >
                      <span>#{t.label}</span>
                      <button
                        onClick={() => handleRemoveTag(t.id)}
                        className="hover:text-red-500 text-slate-400 ml-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <form onSubmit={handleAddTag} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag..."
                    className="text-xs px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 outline-none focus:border-slate-400"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-700 dark:text-slate-200 transition cursor-pointer"
                  >
                    Add
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Captured {new Date(note.createdAt).toLocaleDateString()}</span>
          </div>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 flex items-center gap-1.5 transition cursor-pointer"
          >
            {isSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
