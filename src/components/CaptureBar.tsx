import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Video,
  Link as LinkIcon,
  ArrowUp,
  X,
  Loader2,
  Headphones,
  Palette,
  Compass,
  UtensilsCrossed,
  Image as ImageIcon,
  UploadCloud,
  Check,
  Play,
  Cpu,
  Camera,
  FileUp,
  FolderOpen,
  Info,
  Maximize2,
  Mic,
  MicOff,
  Clipboard,
} from 'lucide-react';
import { Note, FileMetadata } from '../types';
import { CameraModal } from './CameraModal';
import { optimizeImageFile } from '../lib/imageOptimizer';

function getYouTubeThumbnail(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  return match ? `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg` : null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadedFileState {
  base64: string;
  mimeType: string;
  previewUrl: string;
  filename: string;
  fileSize: number;
  dimensions?: string;
}

interface CaptureBarProps {
  onAddNote: (noteData: Partial<Note>, autoCategorize: boolean) => Promise<void>;
  onLoadDemoReels: () => void;
  onClearAllNotes: () => void;
  hasNotes: boolean;
}

export const CaptureBar: React.FC<CaptureBarProps> = ({
  onAddNote,
  onLoadDemoReels,
  onClearAllNotes,
  hasNotes,
}) => {
  const [content, setContent] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [activeMode, setActiveMode] = useState<'smart' | 'video' | 'photo'>('smart');
  const [selectedFile, setSelectedFile] = useState<UploadedFileState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusMessage('Voice recognition is not supported in this browser.');
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setStatusMessage('Voice dictation stopped');
      setTimeout(() => setStatusMessage(null), 2000);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
          setStatusMessage('Listening... Speak your notes or questions');
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              currentTranscript += event.results[i][0].transcript + ' ';
            }
          }
          if (currentTranscript) {
            setContent((prev) => (prev ? `${prev} ${currentTranscript.trim()}` : currentTranscript.trim()));
          }
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition error:', e);
          setIsListening(false);
          setStatusMessage('Microphone access was interrupted or denied');
          setTimeout(() => setStatusMessage(null), 3500);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setStatusMessage('Could not start microphone');
        setTimeout(() => setStatusMessage(null), 3000);
      }
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setStatusMessage('Clipboard is empty');
        setTimeout(() => setStatusMessage(null), 2000);
        return;
      }
      if (text.startsWith('http://') || text.startsWith('https://')) {
        setLinkInput(text);
        setStatusMessage('Pasted link from clipboard!');
      } else {
        setContent((prev) => (prev ? `${prev}\n${text}` : text));
        setStatusMessage('Pasted text from clipboard!');
      }
      setTimeout(() => setStatusMessage(null), 2500);
    } catch (e) {
      setStatusMessage('Clipboard access denied');
      setTimeout(() => setStatusMessage(null), 2500);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [content]);

  // Handle URL detection in textarea
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = val.match(urlRegex);
    if (match && !linkInput) {
      setLinkInput(match[0]);
    }
  };

  // High-speed image optimization & attachment
  const processUploadedFile = async (file: File) => {
    setStatusMessage('Optimizing image for fast AI analysis...');
    try {
      const optimized = await optimizeImageFile(file);
      setSelectedFile({
        base64: optimized.base64,
        mimeType: optimized.mimeType,
        previewUrl: optimized.base64,
        filename: optimized.filename,
        fileSize: optimized.fileSize,
        dimensions: optimized.dimensions,
      });
      const savingsInfo =
        optimized.originalSize > optimized.fileSize
          ? ` (${formatFileSize(optimized.fileSize)}, ready for instant AI)`
          : ` (${formatFileSize(optimized.fileSize)})`;
      setStatusMessage(`Attached ${optimized.filename}${savingsInfo}`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.warn('Image optimization fallback:', err);
      // Resilient fallback if canvas is restricted
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setSelectedFile({
          base64: result,
          mimeType: file.type || 'image/jpeg',
          previewUrl: result,
          filename: file.name,
          fileSize: file.size,
        });
        setStatusMessage(`Attached ${file.name} (${formatFileSize(file.size)})`);
        setTimeout(() => setStatusMessage(null), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clipboard paste support (Ctrl+V / Cmd+V with screenshot)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processUploadedFile(file);
            setStatusMessage('Screenshot pasted from clipboard!');
            setTimeout(() => setStatusMessage(null), 2500);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleAnalyzeAndSave = async (
    overrideContent?: string,
    overrideUrl?: string,
    overrideFile?: UploadedFileState
  ) => {
    let textToAnalyze = (overrideContent !== undefined ? overrideContent : content).trim();
    let urlToAnalyze = (overrideUrl !== undefined ? overrideUrl : linkInput).trim();
    const filePayload = overrideFile || selectedFile;

    // If no URL in the link input, check if user pasted a URL in the text box
    if (!urlToAnalyze && textToAnalyze) {
      const urlMatch = textToAnalyze.match(/(https?:\/\/[^\s]+)/i);
      if (urlMatch) {
        urlToAnalyze = urlMatch[0].trim();
        textToAnalyze = textToAnalyze.replace(urlMatch[0], '').trim();
      }
    }

    if (!textToAnalyze && !urlToAnalyze && !filePayload) return;

    setIsProcessing(true);
    setStatusMessage('Analyzing content, fetching metadata & extracting item bio...');

    try {
      let analysis: any = null;

      // 1. If an image/file is attached, run Multimodal AI OCR & Vision
      if (filePayload && filePayload.base64) {
        setStatusMessage('AI analyzing visual gear, text OCR, layout & specs...');
        try {
          const res = await fetch('/api/ai/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: filePayload.base64,
              mimeType: filePayload.mimeType,
              prompt: textToAnalyze || 'Analyze this image, extract text, identify products/gear, specs, and bio.',
            }),
          });
          if (res.ok) {
            analysis = await res.json();
          }
        } catch (ocrErr) {
          console.warn('OCR endpoint error:', ocrErr);
        }
      }

      // 2. If no image or if URL provided, use the URL categorize endpoint
      if (!analysis) {
        setStatusMessage(
          urlToAnalyze ? 'Fetching video metadata, transcript & web info...' : 'Analyzing text notes with AI...'
        );
        const res = await fetch('/api/ai/categorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToAnalyze,
            url: urlToAnalyze,
            source: urlToAnalyze ? 'reel' : filePayload ? 'screenshot' : 'text',
          }),
        });

        if (res.ok) {
          analysis = await res.json();
        }
      }

      if (!analysis) {
        throw new Error('Analysis response was empty');
      }

      const fileMetadata: FileMetadata | undefined = filePayload
        ? {
            fileName: filePayload.filename,
            fileSize: filePayload.fileSize,
            fileType: filePayload.mimeType,
            dimensions: filePayload.dimensions,
            uploadDate: Date.now(),
          }
        : undefined;

      await onAddNote(
        {
          title: analysis.title || (urlToAnalyze ? 'Saved Video Reel' : 'Saved Content Analysis'),
          content: analysis.detailedSummary || analysis.content || analysis.summary || textToAnalyze || 'Video review analysis saved.',
          executiveSummary: analysis.executiveSummary || analysis.summary,
          detailedSummary: analysis.detailedSummary || analysis.content || textToAnalyze,
          keyTakeaways: analysis.keyTakeaways || [],
          keywords: analysis.keywords || [],
          category: analysis.category || (filePayload ? 'Tech Gear' : 'IEM & Audio'),
          mediaType: filePayload ? 'image' : urlToAnalyze ? 'reel' : 'text',
          source: filePayload ? 'image' : urlToAnalyze ? 'reel' : 'text',
          sourceUrl: urlToAnalyze || undefined,
          videoEmbedUrl: analysis.videoEmbedUrl || undefined,
          imageUrl: filePayload?.previewUrl || analysis.imageUrl || analysis.mediaMetadata?.thumbnailUrl,
          fileMetadata: fileMetadata,
          creator: analysis.creator,
          productBio: analysis.productBio,
          keyDetails: analysis.keyDetails || [],
          searchCitations: analysis.searchCitations || [],
          tags: analysis.tags || [],
        },
        false
      );

      // Clear inputs
      setContent('');
      setLinkInput('');
      setSelectedFile(null);
      setStatusMessage('Saved to your Second Brain!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Error in analyze and save:', err);
      // Fallback save note
      await onAddNote(
        {
          title: linkInput ? 'Saved Video Reel' : content.slice(0, 45) || 'Saved Note',
          content: content || 'Saved content.',
          category: 'Tech Gear',
          mediaType: selectedFile ? 'image' : linkInput ? 'reel' : 'text',
          source: selectedFile ? 'image' : linkInput ? 'reel' : 'text',
          sourceUrl: linkInput || undefined,
          imageUrl: selectedFile?.previewUrl || undefined,
          fileMetadata: selectedFile
            ? {
                fileName: selectedFile.filename,
                fileSize: selectedFile.fileSize,
                fileType: selectedFile.mimeType,
                dimensions: selectedFile.dimensions,
                uploadDate: Date.now(),
              }
            : undefined,
        },
        false
      );
      setStatusMessage('Saved locally!');
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePreset = (type: 'omi' | 'waner' | 'chu' | 'design') => {
    if (type === 'omi') {
      const url = 'https://www.instagram.com/reel/C4_Vaibhav_Sisinty_Omi_Wearable_Review_Full/';
      const note = 'Review of Omi AI wearable pendant by Vaibhav Sisinty. $89 device with magnetic necklace, transcription, Bluetooth, memory.';
      setLinkInput(url);
      setContent(note);
      handleAnalyzeAndSave(note, url);
    } else if (type === 'waner') {
      const url = 'https://www.youtube.com/watch?v=TangzuWanerSG';
      const note = 'Tangzu Wan\'er S.G $20 IEM review. 10mm PET driver, 0.78mm 2-pin detachable cable, lush vocals, balanced Harman tuning.';
      setLinkInput(url);
      setContent(note);
      handleAnalyzeAndSave(note, url);
    } else if (type === 'chu') {
      const url = 'https://www.youtube.com/watch?v=MoondropChu2';
      const note = 'Moondrop Chu II budget IEM breakdown. Zinc alloy shell, brass nozzle, 10mm dynamic driver, clean sub-bass.';
      setLinkInput(url);
      setContent(note);
      handleAnalyzeAndSave(note, url);
    } else if (type === 'design') {
      const url = 'https://www.instagram.com/reel/Design_System_Microinteractions/';
      const note = 'Mobile UX design breakdown of smooth bottom navigation and spring gesture interactions.';
      setLinkInput(url);
      setContent(note);
      handleAnalyzeAndSave(note, url);
    }
  };

  const detectedUrl = linkInput.trim() || (content.match(/(https?:\/\/[^\s]+)/i)?.[0] || '');
  const detectedYtThumb = getYouTubeThumbnail(detectedUrl);

  return (
    <section
      aria-label="Share video, image or link"
      className={`w-full mb-6 transition-all ${
        isDragOver ? 'ring-2 ring-[#5B5BF0] ring-offset-2' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden File and Camera Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processUploadedFile(e.target.files[0]);
          }
        }}
        accept="image/*,.pdf,.txt,.md"
        className="hidden"
      />

      <input
        type="file"
        ref={cameraInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            processUploadedFile(e.target.files[0]);
          }
        }}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      <div className="bg-white dark:bg-[#161820] rounded-2xl border border-slate-200/80 dark:border-white/[0.07] shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-slate-300 dark:hover:border-white/[0.12] transition-all p-5 sm:p-6">
        {/* Top Header & Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.06] gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-slate-100 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </span>
            <div>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Capture & Synthesize
              </span>
              <span className="text-slate-400 font-normal text-xs ml-2 hidden sm:inline">
                YouTube, Instagram Reels, Camera, or Files
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-end">
            {statusMessage && (
              <span className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 font-medium truncate max-w-[200px] sm:max-w-none">
                {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                <span className="truncate">{statusMessage}</span>
              </span>
            )}

            {/* Mode segmented control */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200/50 dark:border-white/[0.04]">
              <button
                type="button"
                onClick={() => setActiveMode('smart')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeMode === 'smart'
                    ? 'bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('video')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeMode === 'video'
                    ? 'bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Video className="w-3 h-3 text-red-500" />
                <span>Reels & Links</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('photo')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  activeMode === 'photo'
                    ? 'bg-white dark:bg-[#161820] text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Camera className="w-3 h-3 text-emerald-500" />
                <span>Camera & Files</span>
              </button>
            </div>
          </div>
        </div>

        {/* Video Link Input Field */}
        {(activeMode === 'smart' || activeMode === 'video') && (
          <div className="mb-3">
            <div className="flex items-center gap-2 bg-slate-50/80 dark:bg-white/[0.04] rounded-2xl px-3.5 py-2.5 border border-slate-200/80 dark:border-white/[0.08] focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <Video className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <input
                type="url"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="Paste Video Reel or Link (YouTube, Shorts, Instagram Reel, TikTok, Web)"
                className="w-full bg-transparent text-base sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
              />
              {linkInput ? (
                <button
                  type="button"
                  onClick={() => setLinkInput('')}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full cursor-pointer"
                  title="Clear link"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-slate-100 border border-slate-200/80 dark:border-white/[0.08] rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-2xs shrink-0 active:scale-95"
                  title="Paste link or text from clipboard"
                >
                  <Clipboard className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden xs:inline">Paste</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Live Detected Reel Thumbnail Preview */}
        {detectedYtThumb && !selectedFile && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/40 flex items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <div className="w-14 h-12 rounded-lg overflow-hidden border border-red-200 dark:border-red-800 shrink-0 bg-stone-900 relative">
                <img
                  src={detectedYtThumb}
                  alt="Detected Video Reel"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-white fill-white" />
                </div>
              </div>
              <div className="text-xs">
                <div className="font-semibold text-red-950 dark:text-red-200 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-red-500" />
                  <span>Real Video Reel Thumbnail Loaded</span>
                </div>
                <div className="text-stone-500 dark:text-stone-400 text-[11px]">
                  Click "Analyze & Save" to extract full transcript, keywords, and specs.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sensible File & Image Preview Box */}
        {selectedFile && (
          <div className="mb-3 p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-3">
              {selectedFile.previewUrl ? (
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-indigo-200 dark:border-indigo-800 shrink-0 bg-stone-900 relative shadow-xs">
                  <img
                    src={selectedFile.previewUrl}
                    alt={selectedFile.filename}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-[#5B5BF0] flex items-center justify-center shrink-0">
                  <FileUp className="w-6 h-6" />
                </div>
              )}

              <div className="min-w-0">
                <div className="font-bold text-xs sm:text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 truncate">
                  <ImageIcon className="w-3.5 h-3.5 text-[#5B5BF0] shrink-0" />
                  <span className="truncate">{selectedFile.filename}</span>
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                    {formatFileSize(selectedFile.fileSize)}
                  </span>
                  {selectedFile.dimensions && (
                    <>
                      <span>•</span>
                      <span>{selectedFile.dimensions}</span>
                    </>
                  )}
                  <span>•</span>
                  <span className="uppercase text-[10px] px-1 rounded bg-indigo-100 dark:bg-indigo-900/70 text-indigo-800 dark:text-indigo-200">
                    {selectedFile.mimeType.split('/')[1] || 'FILE'}
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                  AI will extract visible text, recognize gear / IEMs, specs, and create structured bio.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 hover:bg-stone-50 transition cursor-pointer"
              >
                Change File
              </button>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-white dark:hover:bg-stone-800 rounded-lg transition cursor-pointer"
                title="Remove attached file"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Notes / Video description textarea */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                handleAnalyzeAndSave();
              }
            }}
            placeholder={
              selectedFile
                ? 'Add optional notes or prompt about this image (e.g. "Identify the IEM model and impedance", "Extract UI specs")...'
                : 'Add notes about this video or paste any thoughts (e.g., "Tangzu Wan\'er budget IEM under $25 with lush vocal tuning")...'
            }
            rows={2}
            className="w-full bg-transparent border-0 resize-none text-base sm:text-sm text-[#1A1A1A] dark:text-[#F2F2F2] placeholder-stone-400 dark:placeholder-stone-500 leading-relaxed outline-none p-1"
          />
        </div>

        {/* Action Controls & Media Tools */}
        <div className="mt-4 pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 border-t border-slate-100 dark:border-white/[0.06]">
          {/* File, Camera & Quick Presets Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Camera */}
            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-white/[0.08] flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              title="Camera viewfinder"
            >
              <Camera className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Camera</span>
            </button>

            {/* Upload File */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-white/[0.08] flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              title="Upload file or photo"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Upload</span>
            </button>

            {/* Voice Dictation */}
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer active:scale-95 ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-200 border-slate-200/70 dark:border-white/[0.08]'
              }`}
              title={isListening ? 'Stop listening' : 'Voice dictation'}
            >
              {isListening ? (
                <MicOff className="w-3.5 h-3.5" />
              ) : (
                <Mic className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              )}
              <span>{isListening ? 'Listening...' : 'Voice'}</span>
            </button>

            {/* Presets */}
            <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-white/[0.08] ml-1">
              <span className="text-[11px] text-slate-400 font-medium">Examples:</span>
              <button
                type="button"
                onClick={() => handlePreset('omi')}
                disabled={isProcessing}
                className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition cursor-pointer"
              >
                Omi AI
              </button>
              <button
                type="button"
                onClick={() => handlePreset('waner')}
                disabled={isProcessing}
                className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition cursor-pointer"
              >
                Wan'er IEM
              </button>
              <button
                type="button"
                onClick={() => handlePreset('chu')}
                disabled={isProcessing}
                className="px-2 py-0.5 rounded text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition cursor-pointer"
              >
                Chu II
              </button>
            </div>
          </div>

          {/* Analyze & Save Button */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0">
            <span className="text-[11px] text-slate-400 hidden sm:inline font-mono">⌘ + Enter</span>
            <button
              type="button"
              id="capture-submit-btn"
              onClick={() => handleAnalyzeAndSave()}
              disabled={(!content.trim() && !linkInput.trim() && !selectedFile) || isProcessing}
              className={`w-full sm:w-auto min-h-[42px] px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                content.trim() || linkInput.trim() || selectedFile
                  ? 'bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 active:scale-98'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 cursor-not-allowed border border-transparent'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Analyze & Save</span>
                  <ArrowUp className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Live Camera Viewfinder Modal */}
      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(file) => processUploadedFile(file)}
        onFallbackToFilePicker={() => cameraInputRef.current?.click()}
      />
    </section>
  );
};
