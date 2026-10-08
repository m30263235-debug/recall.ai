import React, { useState, useMemo } from 'react';
import {
  Image as ImageIcon,
  Video,
  FileText,
  Search,
  Filter,
  Download,
  ExternalLink,
  ZoomIn,
  Copy,
  Check,
  Sparkles,
  Grid,
  List,
  Headphones,
  Cpu,
  Palette,
  Compass,
  UtensilsCrossed,
  Tag as TagIcon,
  Play,
  Layers,
  HardDrive,
} from 'lucide-react';
import { Note, NoteMediaType } from '../types';

interface MediaGalleryViewProps {
  notes: Note[];
  onSelectNote: (note: Note) => void;
  onOpenLightbox: (note: Note) => void;
  onFilterByTag?: (tag: string) => void;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return 'Web asset';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export const MediaGalleryView: React.FC<MediaGalleryViewProps> = ({
  notes,
  onSelectNote,
  onOpenLightbox,
  onFilterByTag,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'file'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [mediaSearch, setMediaSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract all notes that have visual media (image, screenshot, video thumbnail, or file)
  const mediaNotes = useMemo(() => {
    return notes.filter((n) => !n.isArchived && (n.imageUrl || n.videoEmbedUrl || n.sourceUrl));
  }, [notes]);

  // Compute available categories from media
  const categories = useMemo(() => {
    const set = new Set<string>();
    mediaNotes.forEach((n) => {
      if (n.category) set.add(n.category);
    });
    return Array.from(set);
  }, [mediaNotes]);

  // Filtered media items
  const filteredMedia = useMemo(() => {
    return mediaNotes.filter((note) => {
      // Type filter
      if (filterType === 'image') {
        const isImg =
          note.mediaType === 'screenshot' ||
          note.mediaType === 'image' ||
          note.source === 'screenshot' ||
          note.source === 'image';
        if (!isImg && (note.sourceUrl?.includes('youtube') || note.sourceUrl?.includes('instagram.com/reel'))) {
          return false;
        }
      } else if (filterType === 'video') {
        const isVid =
          note.mediaType === 'reel' ||
          note.mediaType === 'video' ||
          Boolean(note.videoEmbedUrl) ||
          (note.sourceUrl && (note.sourceUrl.includes('youtube') || note.sourceUrl.includes('instagram')));
        if (!isVid) return false;
      } else if (filterType === 'file') {
        if (!note.fileMetadata && note.mediaType !== 'document' && note.mediaType !== 'file') {
          return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'all' && note.category !== categoryFilter) {
        return false;
      }

      // Search
      if (mediaSearch.trim()) {
        const q = mediaSearch.toLowerCase();
        const titleMatch = (note.title || '').toLowerCase().includes(q);
        const catMatch = (note.category || '').toLowerCase().includes(q);
        const bioMatch = (note.productBio?.itemName || '').toLowerCase().includes(q);
        const tagMatch = (note.tags || []).some((t) => t.label.toLowerCase().includes(q));
        const kwMatch = (note.keywords || []).some((k) => k.toLowerCase().includes(q));
        const fileMatch = (note.fileMetadata?.fileName || '').toLowerCase().includes(q);
        return titleMatch || catMatch || bioMatch || tagMatch || kwMatch || fileMatch;
      }

      return true;
    });
  }, [mediaNotes, filterType, categoryFilter, mediaSearch]);

  const handleCopyUrl = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = note.imageUrl || note.sourceUrl;
    if (url) {
      navigator.clipboard.writeText(url);
      setCopiedId(note.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleDownload = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!note.imageUrl) return;
    const a = document.createElement('a');
    a.href = note.imageUrl;
    a.download = note.fileMetadata?.fileName || `${note.title.slice(0, 30).replace(/\s+/g, '_')}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const imagesCount = useMemo(
    () =>
      mediaNotes.filter(
        (n) =>
          n.mediaType === 'screenshot' ||
          n.mediaType === 'image' ||
          (!n.sourceUrl?.includes('youtube') && !n.sourceUrl?.includes('instagram.com/reel'))
      ).length,
    [mediaNotes]
  );

  const videosCount = useMemo(
    () =>
      mediaNotes.filter(
        (n) =>
          n.mediaType === 'reel' ||
          n.mediaType === 'video' ||
          Boolean(n.videoEmbedUrl) ||
          (n.sourceUrl && (n.sourceUrl.includes('youtube') || noteHasVideo(n)))
      ).length,
    [mediaNotes]
  );

  function noteHasVideo(n: Note): boolean {
    return Boolean(n.sourceUrl && (n.sourceUrl.includes('youtube') || n.sourceUrl.includes('instagram')));
  }

  return (
    <div className="w-full space-y-4">
      {/* Media Header Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#161820] border border-slate-200/80 dark:border-white/[0.07] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div>
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-slate-100">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-white flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">Media & Files Catalog</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Visual index for video reels, high-res thumbnails, product photos, and attachments
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
          <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/[0.06] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>{mediaNotes.length} Total</span>
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/[0.06] flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span>{imagesCount} Images</span>
          </span>
          <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/[0.06] flex items-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-red-500" />
            <span>{videosCount} Videos</span>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#161820] p-3 rounded-2xl border border-slate-200/80 dark:border-white/[0.07]">
        {/* Media Search Input */}
        <div className="relative flex-1 flex items-center bg-slate-50 dark:bg-white/[0.04] rounded-xl px-3 py-1.5 border border-slate-200/70 dark:border-white/[0.06] focus-within:border-slate-400 transition">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={mediaSearch}
            onChange={(e) => setMediaSearch(e.target.value)}
            placeholder="Search media by model, specs, category, or file name..."
            className="w-full bg-transparent border-0 px-2 text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
          />
        </div>

        {/* Media Type Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              filterType === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
            }`}
          >
            All ({mediaNotes.length})
          </button>
          <button
            onClick={() => setFilterType('image')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer ${
              filterType === 'image'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Images ({imagesCount})</span>
          </button>
          <button
            onClick={() => setFilterType('video')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer ${
              filterType === 'video'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Videos ({videosCount})</span>
          </button>
        </div>

          {/* View mode toggle */}
          <div className="hidden sm:flex items-center border-l border-stone-200 dark:border-stone-800 pl-2 ml-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-stone-100 dark:bg-stone-800 text-[#5B5BF0]'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

      {/* Category Pills Filter */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-semibold text-stone-400 whitespace-nowrap mr-1">
            Category:
          </span>
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              categoryFilter === 'all'
                ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
                : 'bg-stone-100 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#5B5BF0] text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredMedia.length === 0 ? (
        <div className="text-center py-12 px-6 rounded-2xl bg-white dark:bg-[#1E1E1E] border border-stone-200/80 dark:border-stone-800">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-[#5B5BF0] mx-auto flex items-center justify-center mb-3">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-[#1A1A1A] dark:text-[#F2F2F2]">
            {mediaSearch ? `No media matching "${mediaSearch}"` : 'No media or images yet'}
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
            Upload an image, snap a photo using mobile camera, or paste a video reel above. All photos, diagrams, and thumbnails will appear here in high resolution.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Gallery View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredMedia.map((note) => {
            const hasVideo =
              note.videoEmbedUrl ||
              (note.sourceUrl && (note.sourceUrl.includes('youtube') || note.sourceUrl.includes('instagram')));
            const isCopied = copiedId === note.id;

            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note)}
                className="group relative bg-white dark:bg-[#1E1E1E] rounded-2xl overflow-hidden border border-stone-200/80 dark:border-stone-800 shadow-2xs hover:shadow-md hover:border-[#5B5BF0]/40 transition-all flex flex-col justify-between cursor-pointer"
              >
                {/* Visual Stage */}
                <div className="relative h-48 w-full bg-stone-900 overflow-hidden">
                  {note.imageUrl ? (
                    <img
                      src={note.imageUrl}
                      alt={note.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center text-white/50">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-black/60 backdrop-blur-md text-white border border-white/20 truncate max-w-[150px]">
                      {note.category}
                    </span>

                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-white/20 backdrop-blur-md text-white border border-white/20">
                      {note.fileMetadata?.fileSize
                        ? formatBytes(note.fileMetadata.fileSize)
                        : hasVideo
                        ? 'Video Reel'
                        : 'Image Asset'}
                    </span>
                  </div>

                  {/* Hover / Tap Quick Actions */}
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                    {note.imageUrl && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenLightbox(note);
                        }}
                        className="p-1.5 rounded-xl bg-white/90 hover:bg-white text-stone-900 shadow-md backdrop-blur-md transition cursor-pointer"
                        title="View Fullscreen Lightbox"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    )}

                    {note.imageUrl && (
                      <button
                        onClick={(e) => handleDownload(note, e)}
                        className="p-1.5 rounded-xl bg-white/90 hover:bg-white text-stone-900 shadow-md backdrop-blur-md transition cursor-pointer"
                        title="Download image"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={(e) => handleCopyUrl(note, e)}
                      className="p-1.5 rounded-xl bg-white/90 hover:bg-white text-stone-900 shadow-md backdrop-blur-md transition cursor-pointer"
                      title="Copy URL"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Play Indicator if video */}
                  {hasVideo && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center border border-white/30 shadow-lg">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Body Details */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    {note.productBio && (
                      <div className="mb-1 text-[11px] font-bold text-[#5B5BF0] dark:text-[#7C7CFF] flex items-center gap-1 truncate">
                        <Sparkles className="w-3 h-3 shrink-0" />
                        <span>{note.productBio.itemName}</span>
                        {note.productBio.priceRange && (
                          <span className="text-stone-400 font-normal">({note.productBio.priceRange})</span>
                        )}
                      </div>
                    )}

                    <h4 className="text-xs sm:text-sm font-bold text-[#1A1A1A] dark:text-[#F2F2F2] line-clamp-1 leading-snug">
                      {note.title}
                    </h4>

                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                      {note.executiveSummary || note.aiSummary || note.content}
                    </p>
                  </div>

                  {/* Sensible File Info Footer */}
                  <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between text-[11px] text-stone-400">
                    <span className="truncate max-w-[140px]">
                      {note.fileMetadata?.fileName || (hasVideo ? 'Video stream' : 'Web screenshot')}
                    </span>
                    <span className="shrink-0 font-medium text-stone-500 dark:text-stone-400">
                      {new Date(note.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed List View */
        <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl border border-stone-200/80 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden shadow-2xs">
          {filteredMedia.map((note) => {
            const isCopied = copiedId === note.id;
            return (
              <div
                key={note.id}
                onClick={() => onSelectNote(note)}
                className="p-3 sm:p-4 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLightbox(note);
                    }}
                    className="w-16 h-14 rounded-xl overflow-hidden bg-stone-900 shrink-0 relative group"
                  >
                    <img
                      src={note.imageUrl}
                      alt={note.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 flex items-center justify-center transition">
                      <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="px-2 py-0.2 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-[#5B5BF0] dark:text-[#7C7CFF]">
                        {note.category}
                      </span>
                      {note.productBio && (
                        <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 truncate">
                          {note.productBio.itemName}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#1A1A1A] dark:text-[#F2F2F2] truncate">
                      {note.title}
                    </h4>
                    <p className="text-[11px] text-stone-400 truncate">
                      {note.fileMetadata?.fileName || 'Attached media asset'} •{' '}
                      {formatBytes(note.fileMetadata?.fileSize)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenLightbox(note);
                    }}
                    className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                    title="Zoom in Lightbox"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => handleCopyUrl(note, e)}
                    className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                    title="Copy URL"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>

                  {note.imageUrl && (
                    <button
                      onClick={(e) => handleDownload(note, e)}
                      className="p-2 rounded-xl text-stone-500 hover:text-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                      title="Download image"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
