import React, { useState } from 'react';
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Check,
  Sparkles,
  FileText,
  Tag as TagIcon,
} from 'lucide-react';
import { Note } from '../types';

interface ImageLightboxModalProps {
  note: Note | null;
  onClose: () => void;
  onOpenDetailModal?: (note: Note) => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  note,
  onClose,
  onOpenDetailModal,
}) => {
  if (!note || !note.imageUrl) return null;

  const [scale, setScale] = useState(1);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setScale(1);

  const handleCopyImageLink = () => {
    if (note.imageUrl) {
      navigator.clipboard.writeText(note.imageUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image view"
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black/90 backdrop-blur-md animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="w-full p-3 sm:p-4 bg-black/50 backdrop-blur-lg border-b border-white/10 flex items-center justify-between text-white z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 max-w-[65%] sm:max-w-[75%]">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 border border-white/30 truncate">
            {note.category}
          </span>
          <h3 className="text-xs sm:text-sm font-semibold truncate text-white/90">
            {note.title}
          </h3>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center bg-white/10 rounded-xl p-1 border border-white/15">
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-white/20 rounded-lg transition text-white/80 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 text-xs font-mono text-white/80 hover:text-white"
              title="Reset Zoom"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-white/20 rounded-lg transition text-white/80 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Copy Link */}
          <button
            onClick={handleCopyImageLink}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition border border-white/15 cursor-pointer"
            title="Copy Image URL"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Copy URL'}</span>
          </button>

          {/* Open Note Details */}
          {onOpenDetailModal && (
            <button
              onClick={() => {
                onClose();
                onOpenDetailModal(note);
              }}
              className="px-3 py-1.5 rounded-xl bg-[#5B5BF0] hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">View Details</span>
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition cursor-pointer"
            title="Close Lightbox (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden relative"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <img
          src={note.imageUrl}
          alt={note.title}
          referrerPolicy="no-referrer"
          style={{ transform: `scale(${scale})` }}
          className="max-h-[75vh] max-w-[95vw] sm:max-w-[85vw] object-contain rounded-xl shadow-2xl transition-transform duration-200 cursor-zoom-in"
          onClick={(e) => {
            e.stopPropagation();
            setScale((prev) => (prev > 1.2 ? 1 : 1.75));
          }}
        />
      </div>

      {/* Bottom Summary Bar */}
      <div
        className="w-full p-3 sm:p-4 bg-black/60 backdrop-blur-lg border-t border-white/10 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-1 max-w-3xl">
          <p className="text-xs sm:text-sm text-white/90 line-clamp-2 leading-relaxed">
            {note.executiveSummary || note.aiSummary || note.content}
          </p>
          {note.keyDetails && note.keyDetails.length > 0 && (
            <div className="flex items-center gap-2 mt-1 text-[11px] text-white/60 truncate">
              <span>Key detail:</span>
              <span className="text-white/80 font-medium truncate">{note.keyDetails[0]}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {(note.keywords || note.tags.map((t) => t.label)).slice(0, 4).map((kw, i) => (
            <span
              key={i}
              className="text-[11px] px-2 py-0.5 rounded-md bg-white/15 text-white/90 border border-white/20"
            >
              #{kw.replace(/^#/, '')}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
