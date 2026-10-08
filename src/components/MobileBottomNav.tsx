import React from 'react';
import {
  Layers,
  Image as ImageIcon,
  Plus,
  Sparkles,
  Tag,
  Clock,
  HardDrive,
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'all' | 'media' | 'recall' | 'archive';
  onSelectTab: (tab: 'all' | 'media' | 'recall' | 'archive') => void;
  onOpenCapture: () => void;
  onOpenAskNotes: () => void;
  onOpenTagSidebar: () => void;
  notesCount: number;
  mediaCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenCapture,
  onOpenAskNotes,
  onOpenTagSidebar,
  notesCount,
  mediaCount,
}) => {
  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#101114]/95 backdrop-blur-xl border-t border-slate-200/70 dark:border-white/[0.06] shadow-[0_-2px_10px_rgba(0,0,0,0.03)] px-2 py-1 flex items-center justify-around"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)' }}
    >
      {/* 1. All Notes / Feed */}
      <button
        id="mobile-nav-feed"
        onClick={() => onSelectTab('all')}
        className={`flex-1 min-w-0 flex flex-col items-center justify-center min-h-[48px] py-1 transition-all cursor-pointer ${
          activeTab === 'all'
            ? 'text-slate-900 dark:text-white font-bold'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <div className="relative">
          <Layers className="w-5 h-5" />
          {notesCount > 0 && (
            <span className="absolute -top-1 -right-2 text-[9px] px-1 min-w-[14px] h-[14px] rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center font-bold">
              {notesCount > 99 ? '99+' : notesCount}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5 font-medium truncate w-full text-center">Feed</span>
      </button>

      {/* 2. Media & Files Organizer */}
      <button
        id="mobile-nav-media"
        onClick={() => onSelectTab('media')}
        className={`flex-1 min-w-0 flex flex-col items-center justify-center min-h-[48px] py-1 transition-all cursor-pointer ${
          activeTab === 'media'
            ? 'text-slate-900 dark:text-white font-bold'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <div className="relative">
          <HardDrive className="w-5 h-5" />
          {mediaCount > 0 && (
            <span className="absolute -top-1 -right-2 text-[9px] px-1 min-w-[14px] h-[14px] rounded-full bg-slate-700 text-white dark:bg-slate-300 dark:text-slate-900 flex items-center justify-center font-bold">
              {mediaCount}
            </span>
          )}
        </div>
        <span className="text-[10px] mt-0.5 font-medium truncate w-full text-center">Media</span>
      </button>

      {/* 3. Center Raised Capture Action */}
      <div className="flex-1 min-w-0 flex items-center justify-center">
        <button
          id="mobile-nav-capture"
          onClick={onOpenCapture}
          className="flex flex-col items-center justify-center -mt-5 cursor-pointer group active:scale-95 transition-transform"
          aria-label="Create note or upload image"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-lg group-hover:scale-105 transition-all">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[10px] mt-1 font-semibold text-slate-800 dark:text-slate-200">Capture</span>
        </button>
      </div>

      {/* 4. Spaced Recall */}
      <button
        id="mobile-nav-recall"
        onClick={() => onSelectTab('recall')}
        className={`flex-1 min-w-0 flex flex-col items-center justify-center min-h-[48px] py-1 transition-all cursor-pointer ${
          activeTab === 'recall'
            ? 'text-slate-900 dark:text-white font-bold'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        <Clock className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium truncate w-full text-center">Recall</span>
      </button>

      {/* 5. Organize / Tags */}
      <button
        id="mobile-nav-tags"
        onClick={onOpenTagSidebar}
        className="flex-1 min-w-0 flex flex-col items-center justify-center min-h-[48px] py-1 transition-all cursor-pointer text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
      >
        <Tag className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium truncate w-full text-center">Tags</span>
      </button>
    </nav>
  );
};
