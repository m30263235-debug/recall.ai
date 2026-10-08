import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  Tag as TagIcon,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  FileText,
  ListChecks,
  Hash,
  Play,
  Pause,
  ZoomIn,
  Pin,
  Archive,
  ArchiveRestore,
  Trash2,
  Check,
  Volume2,
  VolumeX,
  Cpu,
  Headphones,
  Compass,
  Palette,
  UtensilsCrossed,
  Code2,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';
import { Note } from '../types';

interface NoteCardProps {
  note: Note;
  allNotes?: Note[];
  onSelectNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
  onSelectConnectedNote?: (id: string) => void;
  onFilterByTag?: (tag: string) => void;
  selectedTag?: string | null;
  onOpenLightbox?: (note: Note) => void;
  viewMode?: 'grid' | 'list';
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onSelectNote,
  onUpdateNote,
  onDeleteNote,
  onFilterByTag,
  selectedTag,
  onOpenLightbox,
  viewMode = 'grid',
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedKeywords, setCopiedKeywords] = useState(false);
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Stop speech when card unmounts
  useEffect(() => {
    return () => {
      if (isSpeaking && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSpeaking]);

  const handleToggleSpeech = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const textToRead = `${note.title}. ${note.executiveSummary || note.aiSummary || note.content}`;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateNote({
      ...note,
      isPinned: !note.isPinned,
      updatedAt: Date.now(),
    });
  };

  const handleToggleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateNote({
      ...note,
      isArchived: !note.isArchived,
      updatedAt: Date.now(),
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteNote(note.id);
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (note.sourceUrl) {
      navigator.clipboard.writeText(note.sourceUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopySummary = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = `${note.title}\n\nSUMMARY:\n${note.executiveSummary || note.aiSummary || note.content}\n\nKEY TAKEAWAYS:\n${(note.keyTakeaways || []).map((k) => `• ${k}`).join('\n')}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleCopyKeywords = (e: React.MouseEvent) => {
    e.stopPropagation();
    const kws = (note.keywords && note.keywords.length > 0)
      ? note.keywords.join(', ')
      : (note.tags || []).map((t) => `#${t.label}`).join(' ');
    navigator.clipboard.writeText(kws);
    setCopiedKeywords(true);
    setTimeout(() => setCopiedKeywords(false), 2000);
  };

  // Platform and embed checks
  const isYouTube =
    note.sourceUrl?.includes('youtube.com') ||
    note.sourceUrl?.includes('youtu.be') ||
    Boolean(note.videoEmbedUrl);
  const isInstagram = note.sourceUrl?.includes('instagram.com');
  const isTikTok = note.sourceUrl?.includes('tiktok.com');

  const ytMatch = note.sourceUrl?.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  const youtubeEmbedUrl = note.videoEmbedUrl || (ytMatch ? `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1` : undefined);

  // Consolidated keywords
  const displayKeywords = Array.from(
    new Set([
      ...(note.keywords || []),
      ...(note.tags || []).map((t) => t.label),
    ])
  ).filter(Boolean);

  const displayExecutiveSummary = note.executiveSummary || note.aiSummary || note.content;
  const displayDetailedSummary = note.detailedSummary || note.content;
  const hasDistinctDetailedSummary =
    Boolean(note.detailedSummary) &&
    (note.detailedSummary?.length || 0) > (displayExecutiveSummary.length + 25) &&
    note.detailedSummary !== displayExecutiveSummary;

  // Category Icon Resolver
  const getCategoryIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('tech') || c.includes('gear') || c.includes('gadget') || c.includes('wearable')) {
      return Cpu;
    }
    if (c.includes('iem') || c.includes('audio') || c.includes('sound') || c.includes('music')) {
      return Headphones;
    }
    if (c.includes('design') || c.includes('art') || c.includes('ui') || c.includes('ux')) {
      return Palette;
    }
    if (c.includes('code') || c.includes('develop') || c.includes('software')) {
      return Code2;
    }
    if (c.includes('travel') || c.includes('place')) {
      return Compass;
    }
    if (c.includes('food') || c.includes('recipe')) {
      return UtensilsCrossed;
    }
    return TagIcon;
  };

  const CategoryIcon = getCategoryIcon(note.category || 'General');

  const formattedDate = new Date(note.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <article
      onClick={() => onSelectNote(note)}
      className={`group relative bg-white dark:bg-[#161820] rounded-2xl border border-slate-200/80 dark:border-white/[0.07] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:border-slate-300 dark:hover:border-white/[0.14] transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden ${
        note.isPinned ? 'ring-1 ring-amber-400/40 dark:ring-amber-500/30' : ''
      } ${viewMode === 'list' ? 'p-5 sm:p-6' : 'p-5 sm:p-6'}`}
    >
      {/* Floating Quick Actions Bar (Pin, Speech, Archive, Delete) */}
      <div
        className="absolute top-4 right-4 z-20 flex items-center gap-1 p-1 rounded-xl bg-white/95 dark:bg-[#1C1F2B]/95 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-sm opacity-90 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-all duration-150"
        onClick={(e) => e.stopPropagation()}
        aria-label="Quick actions"
      >
        {/* Listen Audio */}
        <button
          type="button"
          onClick={handleToggleSpeech}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer text-xs ${
            isSpeaking
              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/[0.08]'
          }`}
          title={isSpeaking ? 'Stop listening' : 'Listen with Voice'}
          aria-label={isSpeaking ? 'Stop speech' : 'Listen with Voice'}
        >
          {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>

        {/* Pin Toggle */}
        <button
          type="button"
          onClick={handleTogglePin}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer text-xs ${
            note.isPinned
              ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50'
              : 'text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-white/[0.08]'
          }`}
          title={note.isPinned ? 'Unpin note' : 'Pin note to top'}
          aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
        >
          <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-current' : ''}`} />
        </button>

        {/* Archive Toggle */}
        <button
          type="button"
          onClick={handleToggleArchive}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer text-xs ${
            note.isArchived
              ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50'
              : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/[0.08]'
          }`}
          title={note.isArchived ? 'Restore from archive' : 'Archive note'}
          aria-label={note.isArchived ? 'Restore note' : 'Archive note'}
        >
          {note.isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={handleDelete}
          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer text-xs"
          title="Delete note"
          aria-label="Delete note"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div>
        {/* Editorial Metadata Kicker (Anti-slop zero-pill clean typographic header) */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2.5 flex-wrap pr-24">
          <span className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-200">
            <CategoryIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>{note.category}</span>
          </span>

          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>

          <span>
            {isYouTube
              ? 'YouTube'
              : isInstagram
              ? 'Instagram Reel'
              : isTikTok
              ? 'TikTok'
              : note.mediaType === 'image'
              ? 'Image'
              : 'Note'}
          </span>

          {note.creator && (
            <>
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {note.creator.startsWith('@') ? note.creator : `@${note.creator}`}
              </span>
            </>
          )}

          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
          <span className="text-slate-400 dark:text-slate-500">{formattedDate}</span>

          {note.isPinned && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
              <Pin className="w-3 h-3 fill-current text-amber-500" />
              <span>Pinned</span>
            </span>
          )}
        </div>

        {/* Primary Note Title */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-3.5 leading-snug tracking-tight break-words pr-12">
          {note.title}
        </h3>

        {/* Media Presentation: Video Embed / High-Res Thumbnail */}
        {isPlayingVideo && youtubeEmbedUrl ? (
          <div className="relative mb-4 w-full aspect-video rounded-xl overflow-hidden bg-black shadow-sm border border-slate-200/80 dark:border-white/[0.08]">
            <iframe
              src={youtubeEmbedUrl}
              title={note.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPlayingVideo(false);
              }}
              className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-black/80 hover:bg-black text-white flex items-center gap-1 backdrop-blur-md transition cursor-pointer"
            >
              <Pause className="w-3 h-3" />
              <span>Close Video</span>
            </button>
          </div>
        ) : note.imageUrl ? (
          <div className="relative mb-4 h-48 sm:h-52 w-full rounded-xl overflow-hidden bg-slate-900 group/thumb border border-slate-200/70 dark:border-white/[0.07]">
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
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

            {/* Bottom Actions Overlay */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              {note.fileMetadata?.fileSize ? (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono tabular-nums text-white/90 bg-black/50 backdrop-blur-md">
                  {note.fileMetadata.fileSize < 1024 * 1024
                    ? `${(note.fileMetadata.fileSize / 1024).toFixed(0)} KB`
                    : `${(note.fileMetadata.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                </span>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-1.5">
                {onOpenLightbox && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLightbox(note);
                    }}
                    className="p-1.5 rounded-lg bg-white/90 hover:bg-white text-slate-900 shadow-sm backdrop-blur-md transition cursor-pointer"
                    title="Fullscreen Lightbox"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                )}

                {youtubeEmbedUrl && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsPlayingVideo(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100 shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current text-red-600" />
                    <span>Watch</span>
                  </button>
                )}

                {note.sourceUrl && (
                  <a
                    href={note.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/90 hover:bg-black text-white shadow-sm flex items-center gap-1.5 backdrop-blur-md transition"
                  >
                    <span>Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ) : isInstagram ? (
          /* Elegant dark slate badge card for Instagram Reel */
          <div className="relative mb-4 h-28 w-full rounded-xl overflow-hidden bg-slate-900 p-4 flex flex-col justify-between text-white border border-white/[0.08]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 fill-white text-white" />
                <span>Instagram Reel</span>
              </span>
              <span className="text-xs text-white/70 font-medium">
                {note.creator || '@creator'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/60">Transcribed & Analyzed</span>
              {note.sourceUrl && (
                <a
                  href={note.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-1 rounded-lg text-xs font-semibold bg-white/15 hover:bg-white/25 text-white flex items-center gap-1 transition"
                >
                  <span>Open Reel</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ) : null}

        {/* Clean Body Summary (No candy pill box, high legibility) */}
        <div className="mb-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal whitespace-pre-line break-words">
            {showDetailedBreakdown && hasDistinctDetailedSummary
              ? displayDetailedSummary
              : displayExecutiveSummary}
          </p>

          {hasDistinctDetailedSummary && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDetailedBreakdown(!showDetailedBreakdown);
              }}
              className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>{showDetailedBreakdown ? 'Show concise summary' : 'Read full in-depth breakdown'}</span>
              {showDetailedBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Key Takeaways (Hairline divider, clean typographic list) */}
        {note.keyTakeaways && note.keyTakeaways.length > 0 && (
          <div className="pt-3.5 mb-4 border-t border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
              <ListChecks className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Key Takeaways</span>
            </div>
            <ul className="space-y-1.5">
              {note.keyTakeaways.map((takeaway, i) => (
                <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 mt-1.5 shrink-0" />
                  <span className="leading-snug">{takeaway}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Product Bio / Hardware Specifications Dossier */}
        {note.productBio && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="pt-3.5 mb-4 border-t border-slate-100 dark:border-white/[0.06]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {note.productBio.itemName}
                </span>
              </div>
              {note.productBio.priceRange && (
                <span className="text-xs font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.06] px-2 py-0.5 rounded-md">
                  {note.productBio.priceRange}
                </span>
              )}
            </div>

            {note.productBio.driverOrSpecs && (
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mb-1.5 leading-relaxed">
                {note.productBio.driverOrSpecs}
              </p>
            )}

            {note.productBio.bioSummary && (
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                {note.productBio.bioSummary}
              </p>
            )}

            {note.productBio.verdict && (
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 italic border-l-2 border-indigo-500 pl-2 mt-1">
                "{note.productBio.verdict}"
              </p>
            )}
          </div>
        )}

        {/* Extracted Key Words & Tags (Clean typographic hashtags) */}
        {displayKeywords.length > 0 && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center gap-1.5 flex-wrap"
          >
            {displayKeywords.slice(0, 6).map((kw, idx) => {
              const cleanKw = kw.replace(/^#/, '').toLowerCase().trim();
              const isSelected = selectedTag && selectedTag.toLowerCase().replace(/^#/, '') === cleanKw;
              return (
                <button
                  key={idx}
                  onClick={() => onFilterByTag?.(isSelected ? '' : cleanKw)}
                  className={`text-xs font-mono py-0.5 px-1.5 rounded transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                  }`}
                  title={`Filter by #${cleanKw}`}
                >
                  #{cleanKw}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Card Footer: Quiet Action Icons */}
      <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopySummary}
            className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
            title="Copy summary text"
          >
            {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
          </button>

          {note.sourceUrl && (
            <button
              onClick={handleCopyLink}
              className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              title="Copy original link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <LinkIcon className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link copied' : 'Link'}</span>
            </button>
          )}
        </div>

        <button
          onClick={() => onSelectNote(note)}
          className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          View details →
        </button>
      </div>
    </article>
  );
};
