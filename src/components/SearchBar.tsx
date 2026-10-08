import React from 'react';
import {
  Search,
  Sparkles,
  X,
  Headphones,
  Palette,
  Code2,
  Compass,
  UtensilsCrossed,
  MessageSquare,
  Cpu,
  Tag,
  Video,
  Image as ImageIcon,
  Link as LinkIcon,
  Layers,
  LayoutGrid,
  List,
  ArrowUpDown,
} from 'lucide-react';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  availableCategories: string[];
  mediaTypeFilter?: 'all' | 'video' | 'image' | 'link';
  onSelectMediaType?: (type: 'all' | 'video' | 'image' | 'link') => void;
  onOpenChatbot: () => void;
  onOpenTagSidebar?: () => void;
  sortBy?: 'newest' | 'pinned' | 'confidence' | 'title';
  onSortChange?: (sort: 'newest' | 'pinned' | 'confidence' | 'title') => void;
  viewMode?: 'grid' | 'list';
  onToggleViewMode?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  availableCategories,
  mediaTypeFilter = 'all',
  onSelectMediaType,
  onOpenChatbot,
  onOpenTagSidebar,
  sortBy = 'newest',
  onSortChange,
  viewMode = 'grid',
  onToggleViewMode,
}) => {
  const quickSearches = [
    'tech gear',
    'iem',
    'budget iem',
    'tangzu wan\'er',
    'moondrop chu ii',
    'omi wearable',
    'design',
    'travel',
  ];

  const getCategoryIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('tech') || c.includes('gear') || c.includes('wearable')) return <Cpu className="w-3 h-3 text-cyan-500" />;
    if (c.includes('ai')) return <Sparkles className="w-3 h-3 text-indigo-500" />;
    if (c.includes('iem') || c.includes('audio')) return <Headphones className="w-3 h-3 text-amber-500" />;
    if (c.includes('design')) return <Palette className="w-3 h-3 text-purple-500" />;
    if (c.includes('develop') || c.includes('code')) return <Code2 className="w-3 h-3 text-emerald-500" />;
    if (c.includes('travel')) return <Compass className="w-3 h-3 text-blue-500" />;
    if (c.includes('food')) return <UtensilsCrossed className="w-3 h-3 text-rose-500" />;
    return null;
  };

  return (
    <div className="w-full mb-6 space-y-3.5">
      {/* Search Bar Input Row */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex-1 flex items-center bg-white dark:bg-[#161820] rounded-xl border border-slate-200/80 dark:border-white/[0.07] p-2 sm:p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus-within:border-slate-400 dark:focus-within:border-white/20 focus-within:ring-2 focus-within:ring-slate-400/10 transition-all">
          <Search className="w-4 h-4 ml-2 text-slate-400 shrink-0" />
          <input
            id="main-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search keywords, items, creators, or specs (iem, budget iem, omi, wan'er)..."
            className="w-full bg-transparent border-0 px-3 text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
          />

          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="p-1 mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Ask AI Button */}
        <button
          onClick={onOpenChatbot}
          className="min-h-[42px] px-3.5 sm:px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-white/[0.08] flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition cursor-pointer shrink-0 active:scale-95"
          title="Ask AI about your saved reels"
        >
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      </div>

      {/* Quick Search Suggestions & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Quick search suggestions */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar text-xs text-slate-500">
          <span className="text-slate-400 text-[11px] whitespace-nowrap font-medium">Quick:</span>
          {quickSearches.map((term) => (
            <button
              key={term}
              onClick={() => onSearchChange(term)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                searchQuery.toLowerCase() === term.toLowerCase()
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-white/[0.08]'
              }`}
            >
              {term}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto shrink-0">
          {/* Media Type Filter Segmented Control */}
          {onSelectMediaType && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/50 dark:border-white/[0.04]">
              <button
                onClick={() => onSelectMediaType('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  mediaTypeFilter === 'all'
                    ? 'bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => onSelectMediaType('video')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  mediaTypeFilter === 'video'
                    ? 'bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Video className="w-3 h-3 text-red-500" />
                <span>Videos</span>
              </button>
              <button
                onClick={() => onSelectMediaType('image')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                  mediaTypeFilter === 'image'
                    ? 'bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ImageIcon className="w-3 h-3 text-emerald-500" />
                <span>Images</span>
              </button>
            </div>
          )}

          {/* Sort Selector */}
          {onSortChange && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.06] px-2.5 py-1 rounded-xl border border-slate-200/60 dark:border-white/[0.06] text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as any)}
                className="bg-transparent text-slate-700 dark:text-slate-300 font-semibold text-xs outline-none cursor-pointer py-0.5"
              >
                <option value="newest" className="bg-white dark:bg-slate-900">Newest</option>
                <option value="pinned" className="bg-white dark:bg-slate-900">Pinned</option>
                <option value="confidence" className="bg-white dark:bg-slate-900">AI Score</option>
                <option value="title" className="bg-white dark:bg-slate-900">Title A-Z</option>
              </select>
            </div>
          )}

          {/* Grid vs List View Mode Toggle */}
          {onToggleViewMode && (
            <button
              onClick={onToggleViewMode}
              className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-slate-200/60 dark:border-white/[0.06] text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title={viewMode === 'grid' ? 'Switch to List View' : 'Switch to Grid View'}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Content-Based Category Buttons */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {onOpenTagSidebar && (
          <button
            id="searchbar-tags-button"
            type="button"
            onClick={onOpenTagSidebar}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-white/[0.08] transition cursor-pointer shrink-0 active:scale-95"
            title="Open Tag Management System"
          >
            <Tag className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Tags</span>
          </button>
        )}

        {availableCategories.map((cat) => {
          const isSelected = selectedCategory === cat;
          const icon = getCategoryIcon(cat);
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-white dark:bg-[#161820] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-white/[0.07] hover:border-slate-300 dark:hover:border-white/[0.15]'
              }`}
            >
              {icon}
              <span>{cat}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
