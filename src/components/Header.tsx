import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Moon, Sun, ShieldCheck, Zap, Menu, Tag, LogOut, Cloud, CloudCheck, Loader2, User as UserIcon } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenAskNotes: () => void;
  onOpenSettings: () => void;
  onOpenTagSidebar: () => void;
  totalNotesCount: number;
  uniqueTagsCount?: number;
  user: User | null;
  isAuthLoading: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  onToggleDarkMode,
  onOpenAskNotes,
  onOpenSettings,
  onOpenTagSidebar,
  totalNotesCount,
  uniqueTagsCount = 0,
  user,
  isAuthLoading,
  onSignIn,
  onSignOut,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="w-full border-b border-slate-200/70 dark:border-white/[0.06] bg-white/90 dark:bg-[#101114]/90 backdrop-blur-md sticky top-0 z-30 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left Side: Hamburger Menu & Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Hamburger Menu button opening Tag Management Sidebar */}
          <button
            id="header-hamburger-menu-btn"
            onClick={onOpenTagSidebar}
            className="min-w-[40px] min-h-[40px] -ml-2 sm:ml-0 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all cursor-pointer active:scale-95"
            aria-label="Open Tag Library Sidebar"
            title="Open Tag Management Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="w-8 h-8 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Recall
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">·</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Second Brain
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal hidden sm:block">
              Synthesizing video reels, tech specs & notes
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Tags Sidebar Quick Trigger (Tablet & Desktop) */}
          <button
            id="header-tags-trigger-btn"
            onClick={onOpenTagSidebar}
            className="hidden sm:flex min-h-[38px] px-3 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-slate-200/70 dark:border-white/[0.08] items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            title="Open Tag Management System"
          >
            <Tag className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Tags</span>
            {uniqueTagsCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white dark:bg-white/10 text-slate-800 dark:text-slate-200 font-bold border border-slate-200/60 dark:border-transparent">
                {uniqueTagsCount}
              </span>
            )}
          </button>

          {/* Ask AI Notes Button */}
          <button
            id="header-ask-notes-btn"
            onClick={onOpenAskNotes}
            className="min-h-[38px] px-3.5 rounded-xl text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] border border-slate-200/70 dark:border-white/[0.08] flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
            title="Ask AI about your saved items and specs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="hidden xs:inline">Ask Second Brain</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            id="header-theme-toggle"
            onClick={onToggleDarkMode}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-slate-200/70 dark:border-white/[0.08] transition-all cursor-pointer active:scale-95 shrink-0"
            aria-label="Toggle theme"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-300 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700 transition-transform hover:-rotate-12" />
            )}
          </button>

          {/* Settings Button */}
          <button
            id="header-settings-btn"
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer active:scale-95 shrink-0"
            aria-label="Settings & Storage"
            title="Settings & Storage"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>

          {/* Google Login / User Profile Menu */}
          {isAuthLoading ? (
            <div className="min-h-[40px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                id="header-user-profile-btn"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="min-h-[40px] pl-1.5 pr-2.5 py-1 rounded-xl bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-white/[0.08] flex items-center gap-2 transition cursor-pointer shadow-2xs active:scale-95"
                title={`Signed in as ${user.displayName || user.email}`}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-lg object-cover border border-indigo-200 dark:border-indigo-800 shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[110px]">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <Cloud className="w-2.5 h-2.5" />
                    <span>Cloud Sync</span>
                  </span>
                </div>
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#12151E] rounded-2xl border border-slate-200/90 dark:border-white/[0.08] shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/[0.06] mb-2.5">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-xl object-cover border border-indigo-200 dark:border-indigo-800 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                        {(user.displayName || user.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {user.displayName || 'Google User'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <div className="px-2 py-1.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 mb-2.5">
                    <CloudCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Cloud Sync Active (Firestore)</span>
                  </div>

                  <button
                    id="header-signout-btn"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full min-h-[38px] px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              id="header-google-signin-btn"
              onClick={onSignIn}
              className="min-h-[40px] px-3 sm:px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-white/[0.08] shadow-2xs flex items-center gap-2 text-xs font-bold transition-all cursor-pointer active:scale-95 shrink-0"
              title="Sign in with Google to sync your reels and notes to the cloud"
            >
              <GoogleIcon className="w-4 h-4 shrink-0" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
