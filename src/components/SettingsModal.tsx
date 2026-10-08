import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Download,
  Trash2,
  RefreshCw,
  Lock,
  Cpu,
  FileText,
  Check,
  Cloud,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Note } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onResetToSampleNotes: () => void;
  onClearAllNotes: () => void;
  user?: User | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
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

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  notes,
  onResetToSampleNotes,
  onClearAllNotes,
  user,
  onSignIn,
  onSignOut,
}) => {
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  // Export as JSON backup
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `recall-backup-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setDownloadStatus('JSON exported!');
    setTimeout(() => setDownloadStatus(null), 2500);
  };

  // Export as Markdown format
  const handleExportMarkdown = () => {
    const mdContent = notes
      .map(
        (n) =>
          `# ${n.title}\n\n**Category:** ${n.category} | **Date:** ${new Date(n.createdAt).toLocaleDateString()}\n**Tags:** ${n.tags.map((t) => `#${t.label}`).join(' ')}\n\n${n.content}\n\n---\n`
      )
      .join('\n\n');

    const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(mdContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `recall-notes-${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setDownloadStatus('Markdown exported!');
    setTimeout(() => setDownloadStatus(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-[560px] bg-white dark:bg-[#1E1E1E] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[#1A1A1A] dark:text-[#F2F2F2]">
                Privacy & Cloud Settings
              </h3>
              <p className="text-xs text-[#6B6B6B] dark:text-[#A0A0A0]">
                Google login, Firestore cloud sync & data portability
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-6 text-sm">
          {/* Cloud Account Section */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
              Google Account & Cloud Sync
            </div>
            {user ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
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
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {user.displayName || 'Google Account'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                      <Cloud className="w-3 h-3" />
                      <span>Syncing with Cloud Firestore</span>
                    </div>
                  </div>
                </div>

                {onSignOut && (
                  <button
                    onClick={() => {
                      onSignOut();
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    Not Signed In
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Sign in with Google to sync all your saved reels across devices and prevent data loss.
                  </div>
                </div>
                {onSignIn && (
                  <button
                    onClick={() => {
                      onSignIn();
                      onClose();
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/[0.08] shadow-xs hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer shrink-0"
                  >
                    <GoogleIcon className="w-3.5 h-3.5" />
                    <span>Sign In with Google</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Privacy Guarantee */}
          <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/40">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
              <Lock className="w-3.5 h-3.5" />
              <span>Zero Model Training Pledge</span>
            </div>
            <p className="text-xs text-emerald-900/80 dark:text-emerald-300/80 leading-relaxed">
              Your notes are personal thoughts, contacts, and ideas. Recall guarantees that your note content is treated strictly as data and is <strong>never used to train third-party foundation models</strong>. All API keys remain isolated on the server.
            </p>
          </div>

          {/* Export Options */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
              Data Portability
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleExportJSON}
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-[#5B5BF0] dark:hover:border-[#7C7CFF] bg-stone-50/50 dark:bg-stone-900/30 flex items-center gap-2.5 transition text-left cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#5B5BF0] dark:text-[#7C7CFF]" />
                <div>
                  <div className="text-xs font-semibold text-[#1A1A1A] dark:text-[#F2F2F2]">
                    Export JSON
                  </div>
                  <div className="text-[11px] text-[#6B6B6B] dark:text-[#A0A0A0]">
                    Full structured database
                  </div>
                </div>
              </button>

              <button
                onClick={handleExportMarkdown}
                className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-[#5B5BF0] dark:hover:border-[#7C7CFF] bg-stone-50/50 dark:bg-stone-900/30 flex items-center gap-2.5 transition text-left cursor-pointer"
              >
                <FileText className="w-4 h-4 text-[#5B5BF0] dark:text-[#7C7CFF]" />
                <div>
                  <div className="text-xs font-semibold text-[#1A1A1A] dark:text-[#F2F2F2]">
                    Export Markdown
                  </div>
                  <div className="text-[11px] text-[#6B6B6B] dark:text-[#A0A0A0]">
                    Clean Obsidian/Notion format
                  </div>
                </div>
              </button>
            </div>
            {downloadStatus && (
              <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {downloadStatus}
              </div>
            )}
          </div>

          {/* Storage & Reset */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-3">
              Storage & Reset Options
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  if (confirm('Reset knowledge base to sample reels and notes?')) {
                    onResetToSampleNotes();
                    onClose();
                  }
                }}
                className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/50 flex items-center justify-between text-xs text-[#1A1A1A] dark:text-[#F2F2F2] transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-stone-400" />
                  <span>Restore Sample Second Brain Notes</span>
                </div>
                <span className="text-[11px] text-stone-400">Sample Reels</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Are you sure you want to permanently erase all notes? This cannot be undone.')) {
                    onClearAllNotes();
                    onClose();
                  }
                }}
                className="w-full p-3 rounded-xl border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-between text-xs text-red-600 dark:text-red-400 transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span>Erase All Notes Permanently</span>
                </div>
                <span className="text-[11px] text-red-500">Purge</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
