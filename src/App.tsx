import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Note } from './types';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  logOut,
  saveNoteToFirestore,
  deleteNoteFromFirestore,
  subscribeToUserNotes,
} from './lib/firebase';
import { INITIAL_NOTES, DEMO_REELS } from './data/initialNotes';
import { Header } from './components/Header';
import { CaptureBar } from './components/CaptureBar';
import { SearchBar } from './components/SearchBar';
import { NoteCard } from './components/NoteCard';
import { RecallFeed } from './components/RecallFeed';
import { AskNotesModal } from './components/AskNotesModal';
import { NoteDetailModal } from './components/NoteDetailModal';
import { SettingsModal } from './components/SettingsModal';
import { TagSidebar } from './components/TagSidebar';
import { MediaGalleryView } from './components/MediaGalleryView';
import { ImageLightboxModal } from './components/ImageLightboxModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MobileCaptureSheet } from './components/MobileCaptureSheet';
import {
  Sparkles,
  FolderOpen,
  Headphones,
  Palette,
  ExternalLink,
  CheckCircle2,
  Trash2,
  Tag,
  X,
  HardDrive,
  Camera,
} from 'lucide-react';

const STORAGE_KEY = 'recall_reels_fresh_v6';
const DARK_MODE_KEY = 'recall_dark_mode';

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    if (saved !== null) return saved === 'true';
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(DARK_MODE_KEY, String(darkMode));
  }, [darkMode]);

  // Notes state - clean slate by default ("now make it all clear no sabved")
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Remove legacy template notes if any exist
          const clean = parsed.filter(
            (n) => !n.title?.includes('SaaS Pricing') && !n.title?.includes('Elena')
          );
          return clean;
        }
      }
    } catch (e) {
      console.error('Error loading notes from localStorage:', e);
    }
    return INITIAL_NOTES; // empty array by default
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (e) {
      console.error('Error saving notes to localStorage:', e);
    }
  }, [notes]);

  // Navigation & Search state
  const [activeTab, setActiveTab] = useState<'all' | 'media' | 'recall' | 'archive'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'video' | 'image' | 'link'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isTagSidebarOpen, setIsTagSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'pinned' | 'confidence' | 'title'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals state
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [lightboxNote, setLightboxNote] = useState<Note | null>(null);
  const [isMobileCaptureOpen, setIsMobileCaptureOpen] = useState(false);
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Firebase Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const isInitialSyncDone = useRef(false);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Real-time Firestore sync when user is signed in
  useEffect(() => {
    if (!user) {
      isInitialSyncDone.current = false;
      return;
    }

    const unsubscribeNotes = subscribeToUserNotes(
      user.uid,
      (cloudNotes) => {
        if (cloudNotes.length > 0) {
          setNotes(cloudNotes);
        } else if (!isInitialSyncDone.current) {
          // If the user's cloud notes are empty, sync up any current local notes to their cloud
          setNotes((currentNotes) => {
            if (currentNotes.length > 0) {
              currentNotes.forEach((n) => {
                saveNoteToFirestore(user.uid, { ...n, userId: user.uid }).catch(() => {});
              });
            }
            return currentNotes;
          });
        }
        isInitialSyncDone.current = true;
      },
      (err) => {
        console.warn('Firestore subscription notice:', err);
      }
    );

    return () => unsubscribeNotes();
  }, [user]);

  const handleSignIn = async () => {
    try {
      const signedInUser = await signInWithGoogle();
      showToast(`Welcome ${signedInUser.displayName || signedInUser.email}! Synced to Cloud.`);
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        showToast('Google Sign-In failed. Please try again.');
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await logOut();
      showToast('Signed out from Google account.');
    } catch (err) {
      showToast('Sign out failed.');
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Count unique tags across all notes
  const uniqueTagsCount = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      (n.tags || []).forEach((t) => {
        const clean = (t.label || '').trim().toLowerCase().replace(/^#/, '');
        if (clean) set.add(clean);
      });
    });
    return set.size;
  }, [notes]);

  // Bulk / Single tag operations
  const handleRenameTag = (oldTag: string, newTag: string) => {
    const oldClean = oldTag.trim().toLowerCase().replace(/^#/, '');
    const newClean = newTag.trim().toLowerCase().replace(/^#/, '');
    if (!oldClean || !newClean || oldClean === newClean) return;

    let modifiedNotesCount = 0;
    setNotes((prev) =>
      prev.map((note) => {
        if (!note.tags || note.tags.length === 0) return note;
        let found = false;
        const newTags: typeof note.tags = [];
        const seen = new Set<string>();

        note.tags.forEach((t) => {
          const clean = (t.label || '').trim().toLowerCase().replace(/^#/, '');
          if (clean === oldClean) {
            found = true;
            if (!seen.has(newClean)) {
              seen.add(newClean);
              newTags.push({ ...t, label: newClean });
            }
          } else {
            if (!seen.has(clean)) {
              seen.add(clean);
              newTags.push(t);
            }
          }
        });

        if (found) {
          modifiedNotesCount++;
          return { ...note, tags: newTags, updatedAt: Date.now() };
        }
        return note;
      })
    );

    if (selectedTag && selectedTag.toLowerCase().replace(/^#/, '') === oldClean) {
      setSelectedTag(newClean);
    }
    showToast(`Renamed #${oldClean} to #${newClean} across ${modifiedNotesCount} ${modifiedNotesCount === 1 ? 'note' : 'notes'}`);
  };

  const handleDeleteTags = (tagsToDelete: string[]) => {
    const targets = new Set(tagsToDelete.map((t) => t.trim().toLowerCase().replace(/^#/, '')));
    if (targets.size === 0) return;

    let modifiedNotesCount = 0;
    setNotes((prev) =>
      prev.map((note) => {
        if (!note.tags || note.tags.length === 0) return note;
        const remaining = note.tags.filter(
          (t) => !targets.has((t.label || '').trim().toLowerCase().replace(/^#/, ''))
        );
        if (remaining.length !== note.tags.length) {
          modifiedNotesCount++;
          return { ...note, tags: remaining, updatedAt: Date.now() };
        }
        return note;
      })
    );

    if (selectedTag && targets.has(selectedTag.toLowerCase().replace(/^#/, ''))) {
      setSelectedTag(null);
    }
    showToast(`Deleted ${targets.size} ${targets.size === 1 ? 'tag' : 'tags'} from ${modifiedNotesCount} notes`);
  };

  const handleMergeTags = (sourceTags: string[], targetTag: string) => {
    const sources = new Set(sourceTags.map((t) => t.trim().toLowerCase().replace(/^#/, '')));
    const cleanTarget = targetTag.trim().toLowerCase().replace(/^#/, '');
    if (sources.size === 0 || !cleanTarget) return;

    let modifiedNotesCount = 0;
    setNotes((prev) =>
      prev.map((note) => {
        if (!note.tags || note.tags.length === 0) return note;
        let matched = false;
        const newTags: typeof note.tags = [];
        const seen = new Set<string>();

        note.tags.forEach((t) => {
          const clean = (t.label || '').trim().toLowerCase().replace(/^#/, '');
          if (sources.has(clean)) {
            matched = true;
            if (!seen.has(cleanTarget)) {
              seen.add(cleanTarget);
              newTags.push({ ...t, label: cleanTarget });
            }
          } else {
            if (!seen.has(clean)) {
              seen.add(clean);
              newTags.push(t);
            }
          }
        });

        if (matched) {
          modifiedNotesCount++;
          return { ...note, tags: newTags, updatedAt: Date.now() };
        }
        return note;
      })
    );

    if (selectedTag && sources.has(selectedTag.toLowerCase().replace(/^#/, ''))) {
      setSelectedTag(cleanTarget);
    }
    showToast(`Merged ${sources.size} tags into #${cleanTarget} across ${modifiedNotesCount} notes!`);
  };

  // Add new note / reel
  const handleAddNote = async (noteData: Partial<Note>, autoCategorize = false) => {
    const rawContent = noteData.content || '';

    let catData: any = {
      category: noteData.category || 'IEM & Audio',
      title: noteData.title || rawContent.slice(0, 45) || 'Saved Video',
      summary: rawContent.slice(0, 90),
      tags: noteData.tags || [{ id: `tag-${Date.now()}`, label: 'reel', isAi: true, confidence: 95 }],
      aiConfidence: 95,
      productBio: noteData.productBio,
      keyDetails: noteData.keyDetails || [],
    };

    if (autoCategorize && (rawContent.trim() || noteData.sourceUrl)) {
      try {
        const res = await fetch('/api/ai/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: rawContent,
            url: noteData.sourceUrl,
            source: noteData.source || 'reel',
          }),
        });
        const json = await res.json();
        if (json.category) catData = json;
      } catch (err) {
        console.warn('Auto-categorize fallback:', err);
      }
    }

    const newNote: Note = {
      id: `note-${Date.now()}`,
      userId: user?.uid,
      title: noteData.title || catData.title || 'Saved Video Reel',
      content: noteData.content || catData.detailedSummary || rawContent || catData.summary || 'Video review & breakdown',
      executiveSummary: noteData.executiveSummary || catData.executiveSummary || catData.summary,
      detailedSummary: noteData.detailedSummary || catData.detailedSummary || noteData.content || rawContent,
      keyTakeaways: noteData.keyTakeaways || catData.keyTakeaways || [],
      keywords: noteData.keywords || catData.keywords || [],
      category: noteData.category || catData.category || 'Tech Gear',
      mediaType: noteData.mediaType || catData.mediaType || 'reel',
      tags: noteData.tags || catData.tags || [],
      source: noteData.source || 'reel',
      sourceUrl: noteData.sourceUrl || catData.sourceUrl,
      videoEmbedUrl: noteData.videoEmbedUrl || catData.videoEmbedUrl,
      imageUrl: noteData.imageUrl || catData.imageUrl || catData.mediaMetadata?.thumbnailUrl,
      creator: noteData.creator || catData.creator,
      productBio: noteData.productBio || catData.productBio,
      keyDetails: noteData.keyDetails || catData.keyDetails || [],
      searchCitations: noteData.searchCitations || catData.searchCitations || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      aiSummary: noteData.executiveSummary || catData.summary,
      aiConfidence: catData.aiConfidence || 96,
      isPinned: false,
      isArchived: false,
    };

    if (user) {
      await saveNoteToFirestore(user.uid, newNote).catch((e) => console.warn('Cloud save error:', e));
    }
    setNotes((prev) => [newNote, ...prev]);
    showToast(`Categorized as #${newNote.category}${newNote.productBio ? ` with Bio for ${newNote.productBio.itemName}` : ''}!`);
  };

  const handleUpdateNote = (updated: Note) => {
    if (user) {
      saveNoteToFirestore(user.uid, { ...updated, userId: user.uid }).catch((e) => console.warn('Cloud update error:', e));
    }
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    if (selectedNote && selectedNote.id === updated.id) {
      setSelectedNote(updated);
    }
  };

  const handleDeleteNote = (id: string) => {
    if (user) {
      deleteNoteFromFirestore(user.uid, id).catch((e) => console.warn('Cloud delete error:', e));
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
    showToast('Item deleted');
  };

  const handleClearAllNotes = () => {
    if (confirm('Clear all saved reels and notes? This will wipe the list completely.')) {
      if (user) {
        notes.forEach((n) => {
          deleteNoteFromFirestore(user.uid, n.id).catch(() => {});
        });
      }
      setNotes([]);
      localStorage.removeItem(STORAGE_KEY);
      showToast('Cleared all saved items! Ready for new links.');
    }
  };

  const handleLoadDemoReels = () => {
    setNotes(DEMO_REELS);
    if (user) {
      DEMO_REELS.forEach((n) => {
        saveNoteToFirestore(user.uid, { ...n, userId: user.uid }).catch(() => {});
      });
    }
    showToast('Loaded Budget IEM and Design sample reels!');
  };

  // Dynamic available categories based on saved items
  const availableCategories = useMemo(() => {
    const base = ['All', 'Tech Gear', 'IEM & Audio', 'Design', 'Develop', 'Travel', 'Food'];
    const fromNotes = Array.from(new Set(notes.map((n) => n.category).filter(Boolean)));
    return Array.from(new Set([...base, ...fromNotes]));
  }, [notes]);

  // Filter notes by Tab, Category, and Search (IEM search, budget iem, tech gear, keywords, etc.)
  const filteredNotes = useMemo(() => {
    let list = notes;

    // Filter by Tab
    if (activeTab === 'archive') {
      list = list.filter((n) => n.isArchived);
    } else {
      list = list.filter((n) => !n.isArchived);
    }

    // Filter by Category
    if (selectedCategory !== 'All') {
      const catLower = selectedCategory.toLowerCase();
      list = list.filter((n) => {
        const itemCat = (n.category || '').toLowerCase();
        if (catLower.includes('iem') || catLower === 'iem & audio') {
          return itemCat.includes('iem') || (itemCat.includes('audio') && !itemCat.includes('brain')) || (!!n.productBio && n.productBio.itemType?.toLowerCase().includes('iem'));
        }
        if (catLower.includes('tech') || catLower === 'tech gear') {
          return itemCat.includes('tech') || itemCat.includes('gear') || itemCat.includes('gadget') || itemCat.includes('ai & tools');
        }
        return itemCat === catLower || itemCat.includes(catLower);
      });
    }

    // Filter by Selected Tag
    if (selectedTag) {
      const tagClean = selectedTag.toLowerCase().replace(/^#/, '');
      list = list.filter((n) =>
        (n.tags || []).some((t) => (t.label || '').toLowerCase().replace(/^#/, '') === tagClean) ||
        (n.keywords || []).some((k) => k.toLowerCase().replace(/^#/, '') === tagClean)
      );
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((n) => {
        const titleMatch = (n.title || '').toLowerCase().includes(q);
        const categoryMatch = (n.category || '').toLowerCase().includes(q);
        const contentMatch = (n.content || '').toLowerCase().includes(q);
        const execMatch = (n.executiveSummary || '').toLowerCase().includes(q);
        const detailedMatch = (n.detailedSummary || '').toLowerCase().includes(q);
        const creatorMatch = (n.creator || '').toLowerCase().includes(q);
        const tagMatch = (n.tags || []).some((t) => t.label.toLowerCase().includes(q));
        const keywordMatch = (n.keywords || []).some((k) => k.toLowerCase().includes(q));
        const takeawayMatch = (n.keyTakeaways || []).some((kt) => kt.toLowerCase().includes(q));
        const bioItemMatch = (n.productBio?.itemName || '').toLowerCase().includes(q);
        const bioTypeMatch = (n.productBio?.itemType || '').toLowerCase().includes(q);
        const bioSummaryMatch = (n.productBio?.bioSummary || '').toLowerCase().includes(q);
        const bioSpecsMatch = (n.productBio?.driverOrSpecs || '').toLowerCase().includes(q);
        const detailsMatch = (n.keyDetails || []).some((kd) => kd.toLowerCase().includes(q));

        const contentLower = (n.content || '').toLowerCase();
        // If searching "iem", catch all in-ear monitor products
        const iemSpecial = q === 'iem' && (
          categoryMatch ||
          bioItemMatch ||
          bioTypeMatch ||
          contentLower.includes('iem') ||
          contentLower.includes('earphone')
        );

        return (
          titleMatch ||
          categoryMatch ||
          contentMatch ||
          execMatch ||
          detailedMatch ||
          creatorMatch ||
          tagMatch ||
          keywordMatch ||
          takeawayMatch ||
          bioItemMatch ||
          bioTypeMatch ||
          bioSummaryMatch ||
          bioSpecsMatch ||
          detailsMatch ||
          iemSpecial
        );
      });
    }

    // Apply Sorting (default pinned first + newest)
    if (sortBy === 'pinned') {
      list = [...list].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.createdAt - a.createdAt);
    } else if (sortBy === 'confidence') {
      list = [...list].sort((a, b) => (b.aiConfidence || 0) - (a.aiConfidence || 0) || b.createdAt - a.createdAt);
    } else if (sortBy === 'title') {
      list = [...list].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else {
      list = [...list].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.createdAt - a.createdAt);
    }

    // Filter by Media Type (Videos, Images & Files)
    if (mediaTypeFilter === 'video') {
      list = list.filter(
        (n) =>
          n.mediaType === 'reel' ||
          n.mediaType === 'video' ||
          Boolean(n.videoEmbedUrl) ||
          (n.sourceUrl && (n.sourceUrl.includes('youtube') || n.sourceUrl.includes('instagram')))
      );
    } else if (mediaTypeFilter === 'image') {
      list = list.filter(
        (n) =>
          n.mediaType === 'screenshot' ||
          n.mediaType === 'image' ||
          n.source === 'image' ||
          n.source === 'screenshot' ||
          Boolean(n.fileMetadata) ||
          (!n.sourceUrl && Boolean(n.imageUrl))
      );
    }

    return list;
  }, [notes, activeTab, selectedCategory, mediaTypeFilter, searchQuery, selectedTag, sortBy]);

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-[#F9F9F8] dark:bg-[#101114] text-slate-900 dark:text-slate-100 transition-colors flex flex-col selection:bg-slate-200 selection:text-slate-900 dark:selection:bg-white/20 dark:selection:text-white pb-24 md:pb-16">
      {/* Header */}
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        onOpenAskNotes={() => setIsAskModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenTagSidebar={() => setIsTagSidebarOpen(true)}
        totalNotesCount={notes.length}
        uniqueTagsCount={uniqueTagsCount}
        user={user}
        isAuthLoading={isAuthLoading}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {/* Main Responsive Canvas */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex-1 min-w-0">
        {/* Navigation Tabs */}
        <nav aria-label="Main Navigation" className="flex items-center justify-between gap-3 mb-7 pb-3 border-b border-slate-200/70 dark:border-white/[0.06] overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-100/90 dark:bg-white/[0.05] p-1 rounded-2xl border border-slate-200/60 dark:border-white/[0.05]">
            <button
              id="tab-all-notes"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Saved Reels & Notes <span className="font-mono tabular-nums text-[11px] opacity-75">({notes.filter((n) => !n.isArchived).length})</span>
            </button>

            <button
              id="tab-media-files"
              onClick={() => setActiveTab('media')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'media'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Media & Files</span>
              <span className="font-mono tabular-nums text-[11px] opacity-75">({notes.filter((n) => !n.isArchived && (n.imageUrl || n.videoEmbedUrl || n.sourceUrl)).length})</span>
            </button>

            <button
              id="tab-daily-recall"
              onClick={() => setActiveTab('recall')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'recall'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Spaced Recall</span>
            </button>

            <button
              id="tab-archive"
              onClick={() => setActiveTab('archive')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === 'archive'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Archive <span className="font-mono tabular-nums text-[11px] opacity-75">({notes.filter((n) => n.isArchived).length})</span>
            </button>
          </div>

          {notes.length > 0 && (
            <button
              onClick={handleClearAllNotes}
              className="text-xs text-slate-400 hover:text-red-500 transition px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer"
              title="Clear all saved"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          )}
        </nav>

        {/* Video Link & Reel Analyzer Bar */}
        {activeTab === 'all' && (
          <CaptureBar
            onAddNote={handleAddNote}
            onLoadDemoReels={handleLoadDemoReels}
            onClearAllNotes={handleClearAllNotes}
            hasNotes={notes.length > 0}
          />
        )}

        {/* Media & Files Organizer Gallery View */}
        {activeTab === 'media' && (
          <div className="mb-6">
            <MediaGalleryView
              notes={notes}
              onSelectNote={(note) => setSelectedNote(note)}
              onOpenLightbox={(note) => setLightboxNote(note)}
              onFilterByTag={(tag) => setSelectedTag(tag)}
            />
          </div>
        )}

        {/* Spaced Recall View */}
        {activeTab === 'recall' && (
          <div className="mb-6">
            <div className="mb-4 p-4 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong className="text-slate-900 dark:text-slate-200">Spaced Recall:</strong> Resurfaces past reviews and insights from 3, 7, and 14 days ago to maintain memory retention.
            </div>
            <RecallFeed
              notes={notes}
              onSelectNote={(note) => setSelectedNote(note)}
              onUpdateNote={handleUpdateNote}
            />
          </div>
        )}

        {/* Search & Dynamic Category Filter Bar for Feed & Archive */}
        {(activeTab === 'all' || activeTab === 'archive') && (
          <SearchBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            availableCategories={availableCategories}
            mediaTypeFilter={mediaTypeFilter}
            onSelectMediaType={setMediaTypeFilter}
            onOpenChatbot={() => setIsAskModalOpen(true)}
            onOpenTagSidebar={() => setIsTagSidebarOpen(true)}
            sortBy={sortBy}
            onSortChange={setSortBy}
            viewMode={viewMode}
            onToggleViewMode={() => setViewMode((prev) => (prev === 'grid' ? 'list' : 'grid'))}
          />
        )}

        {/* Active Search Filter Banner */}
        {searchQuery && (
          <div className="mb-5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                Searching for <strong>"{searchQuery}"</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100">{filteredNotes.length} matching</span>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Active Tag Filter Banner */}
        {selectedTag && (
          <div className="mb-5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-500 dark:text-slate-400">#</span>
              <span>Filtered by: <strong className="font-semibold text-slate-900 dark:text-slate-100">#{selectedTag}</strong></span>
              <span className="ml-1 text-[11px] px-2 py-0.5 rounded-md bg-white dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200/60 dark:border-transparent">
                {filteredNotes.length} {filteredNotes.length === 1 ? 'note' : 'notes'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTagSidebarOpen(true)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/[0.08] transition cursor-pointer"
              >
                Manage
              </button>
              <button
                onClick={() => setSelectedTag(null)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-white/10 hover:bg-slate-50 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-200 transition cursor-pointer flex items-center gap-1"
                title="Clear tag filter"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>
        )}

        {/* Notes Grid / Compact List */}
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6'
              : 'flex flex-col gap-4 max-w-4xl mx-auto'
          }
        >
          {filteredNotes.length === 0 ? (
            <div className="col-span-full text-center py-16 px-6 rounded-2xl bg-white dark:bg-[#161820] border border-slate-200/70 dark:border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 mx-auto flex items-center justify-center mb-4">
                <FolderOpen className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {searchQuery
                  ? `No items matching "${searchQuery}"`
                  : 'Your Second Brain is Ready'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
                {searchQuery
                  ? 'Try searching "iem", "wan\'er", "wearable", or clearing the search query.'
                  : 'Paste any Instagram Reel, YouTube video, photo, or prompt above to automatically transcribe, synthesize, and extract item bios and specifications.'}
              </p>

              {!searchQuery && (
                <div className="mt-6 flex items-center justify-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => {
                      handleAddNote(
                        {
                          title: 'Top Budget IEM Under $25: Tangzu Wan\'er S.G Deep Breakdown',
                          content: 'Video review analyzing the Tangzu Wan\'er S.G. Compared against entry earphones; praised for vocal clarity, smooth treble, and detachable 2-pin cable.',
                          category: 'IEM & Audio',
                          mediaType: 'reel',
                          source: 'reel',
                          sourceUrl: 'https://www.instagram.com/reel/C4_budget_iem_waner/',
                          imageUrl: '/src/assets/images/tangzu_waner_iem_1790695140285.jpg',
                          productBio: {
                            itemName: 'Tangzu Wan\'er S.G',
                            itemType: 'Budget In-Ear Monitor (IEM)',
                            priceRange: '$19 - $23',
                            driverOrSpecs: '10mm PET Dynamic Driver, 0.78mm 2-Pin Detachable Cable, 20Ω Impedance',
                            bioSummary: 'The benchmark budget IEM for beginner audiophiles. Offers a warm, balanced sound signature with lush vocals and zero treble fatigue.',
                            pros: ['Exceptional vocal intimacy & tuning', 'Detachable 0.78mm 2-pin cable', 'Comfortable lightweight shell'],
                            cons: ['Plastic outer housing', 'Stock ear tips are basic'],
                            verdict: 'The absolute gold standard starter budget IEM under $25.',
                          },
                          keyDetails: [
                            'Priced at ~$20 on AliExpress, Amazon, and Linsoul',
                            '0.78mm 2-pin detachable connection allows upgrading to microphone cables or Bluetooth neckbands',
                            'Impedance 20Ω with 107dB sensitivity—very easy to drive directly from any 3.5mm jack or dongle',
                            'Tuned strictly around the Harman 2019 target with warm bass emphasis',
                          ],
                          tags: [
                            { id: 't-iem', label: 'iem', isAi: true, confidence: 99 },
                            { id: 't-budget', label: 'budget-iem', isAi: true, confidence: 98 },
                            { id: 't-audio', label: 'audiophile', isAi: true, confidence: 96 },
                          ],
                        },
                        false
                      );
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-black dark:hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Headphones className="w-3.5 h-3.5" />
                    <span>Try Sample IEM Breakdown</span>
                  </button>

                  <button
                    onClick={handleLoadDemoReels}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.08] dark:hover:bg-white/[0.14] text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-white/[0.08] cursor-pointer"
                  >
                    Load Demo Reels
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredNotes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                allNotes={notes}
                onSelectNote={(n) => setSelectedNote(n)}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onFilterByTag={(tag) => setSelectedTag(tag || null)}
                selectedTag={selectedTag}
                onOpenLightbox={(n) => setLightboxNote(n)}
                viewMode={viewMode}
              />
            ))
          )}
        </div>
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium shadow-lg flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tag Management Sidebar Drawer */}
      <TagSidebar
        isOpen={isTagSidebarOpen}
        onClose={() => setIsTagSidebarOpen(false)}
        notes={notes}
        selectedTag={selectedTag}
        onSelectTag={(tag) => setSelectedTag(tag)}
        onRenameTag={handleRenameTag}
        onDeleteTags={handleDeleteTags}
        onMergeTags={handleMergeTags}
      />

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenCapture={() => setIsMobileCaptureOpen(true)}
        onOpenAskNotes={() => setIsAskModalOpen(true)}
        onOpenTagSidebar={() => setIsTagSidebarOpen(true)}
        notesCount={notes.filter((n) => !n.isArchived).length}
        mediaCount={notes.filter((n) => !n.isArchived && (n.imageUrl || n.videoEmbedUrl || n.sourceUrl)).length}
      />

      {/* Mobile Quick Capture Sheet Modal */}
      <MobileCaptureSheet
        isOpen={isMobileCaptureOpen}
        onClose={() => setIsMobileCaptureOpen(false)}
        onAddNote={handleAddNote}
      />

      {/* Fullscreen Image Lightbox Modal with Zoom & Pan */}
      <ImageLightboxModal
        note={lightboxNote}
        onClose={() => setLightboxNote(null)}
        onOpenDetailModal={(n) => {
          setLightboxNote(null);
          setSelectedNote(n);
        }}
      />

      {/* Modals */}
      <NoteDetailModal
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
        allNotes={notes}
      />

      <AskNotesModal
        isOpen={isAskModalOpen}
        onClose={() => setIsAskModalOpen(false)}
        notes={notes}
        onSelectNote={(note) => setSelectedNote(note)}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        notes={notes}
        onResetToSampleNotes={handleLoadDemoReels}
        onClearAllNotes={handleClearAllNotes}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />
    </div>
  );
}
