import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  UploadCloud,
  Video,
  Sparkles,
  ArrowUp,
  Loader2,
  FileText,
  Image as ImageIcon,
  Mic,
  MicOff,
  Clipboard,
} from 'lucide-react';
import { Note } from '../types';
import { CameraModal } from './CameraModal';
import { optimizeImageFile } from '../lib/imageOptimizer';

interface MobileCaptureSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAddNote: (noteData: Partial<Note>, autoCategorize: boolean) => Promise<void>;
}

export const MobileCaptureSheet: React.FC<MobileCaptureSheetProps> = ({
  isOpen,
  onClose,
  onAddNote,
}) => {
  if (!isOpen) return null;

  const [link, setLink] = useState('');
  const [noteText, setNoteText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    base64: string;
    mimeType: string;
    previewUrl: string;
    filename: string;
    fileSize: number;
    dimensions?: string;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice dictation is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              currentTranscript += event.results[i][0].transcript + ' ';
            }
          }
          if (currentTranscript) {
            setNoteText((prev) => (prev ? `${prev} ${currentTranscript.trim()}` : currentTranscript.trim()));
          }
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
        recognition.start();
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;
      if (text.startsWith('http://') || text.startsWith('https://')) {
        setLink(text);
      } else {
        setNoteText((prev) => (prev ? `${prev}\n${text}` : text));
      }
    } catch (e) {
      console.warn('Clipboard read error:', e);
    }
  };

  const handleProcessFile = async (file: File) => {
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
    } catch {
      // Fallback
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
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!link.trim() && !noteText.trim() && !selectedFile) return;

    setIsProcessing(true);
    try {
      let analysis: any = null;

      if (selectedFile?.base64) {
        try {
          const res = await fetch('/api/ai/ocr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: selectedFile.base64,
              mimeType: selectedFile.mimeType,
              prompt: noteText || 'Identify gear/items, extract text, specs, and product bio.',
            }),
          });
          if (res.ok) analysis = await res.json();
        } catch (e) {
          console.warn('Mobile OCR error:', e);
        }
      }

      if (!analysis) {
        try {
          const res = await fetch('/api/ai/categorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: noteText,
              url: link,
              source: link ? 'reel' : selectedFile ? 'screenshot' : 'text',
            }),
          });
          if (res.ok) analysis = await res.json();
        } catch (e) {
          console.warn('Mobile categorize error:', e);
        }
      }

      await onAddNote(
        {
          title: analysis?.title || (link ? 'Saved Mobile Video' : 'Mobile Capture'),
          content: analysis?.detailedSummary || analysis?.content || noteText || 'Saved from mobile capture',
          executiveSummary: analysis?.executiveSummary || analysis?.summary,
          detailedSummary: analysis?.detailedSummary || noteText,
          keyTakeaways: analysis?.keyTakeaways || [],
          keywords: analysis?.keywords || [],
          category: analysis?.category || (selectedFile ? 'Tech Gear' : 'IEM & Audio'),
          mediaType: selectedFile ? 'image' : link ? 'reel' : 'text',
          source: selectedFile ? 'image' : link ? 'reel' : 'text',
          sourceUrl: link || undefined,
          videoEmbedUrl: analysis?.videoEmbedUrl,
          imageUrl: selectedFile?.previewUrl || analysis?.imageUrl,
          fileMetadata: selectedFile
            ? {
                fileName: selectedFile.filename,
                fileSize: selectedFile.fileSize,
                fileType: selectedFile.mimeType,
                dimensions: selectedFile.dimensions,
                uploadDate: Date.now(),
              }
            : undefined,
          creator: analysis?.creator,
          productBio: analysis?.productBio,
          keyDetails: analysis?.keyDetails || [],
          tags: analysis?.tags || [],
        },
        false
      );

      onClose();
    } catch (err) {
      console.error('Failed to save mobile capture:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Mobile quick capture sheet"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end md:hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <input
        type="file"
        ref={cameraInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) handleProcessFile(e.target.files[0]);
        }}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) handleProcessFile(e.target.files[0]);
        }}
        accept="image/*,.pdf,.txt,.md"
        className="hidden"
      />

      <div
        className="w-full bg-white dark:bg-[#12151E] rounded-t-3xl border-t border-slate-200 dark:border-white/[0.08] p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 24px), 24px)' }}
      >
        {/* Grab Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mb-4" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Quick Capture & AI Analysis
              </h3>
              <p className="text-[11px] text-slate-400">Snap photos, paste reels, or attach files</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Mobile Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 mb-3.5">
          <button
            type="button"
            onClick={() => setIsCameraModalOpen(true)}
            className="min-h-[48px] p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center gap-2.5 text-xs font-bold text-emerald-800 dark:text-emerald-200 cursor-pointer active:scale-98 transition shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div>Camera Snap</div>
              <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400">Live Photo & IEM</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[48px] p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center gap-2.5 text-xs font-bold text-indigo-800 dark:text-indigo-200 cursor-pointer active:scale-98 transition shadow-xs"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div>Upload File</div>
              <span className="text-[10px] font-normal text-indigo-600 dark:text-indigo-400">Photo / Document</span>
            </div>
          </button>
        </div>

        {/* Attached File Preview */}
        {selectedFile && (
          <div className="mb-3 p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {selectedFile.previewUrl ? (
                <img
                  src={selectedFile.previewUrl}
                  alt={selectedFile.filename}
                  className="w-10 h-10 rounded-lg object-cover border border-indigo-200"
                />
              ) : (
                <FileText className="w-8 h-8 text-indigo-500" />
              )}
              <div className="min-w-0 text-xs">
                <div className="font-bold truncate text-indigo-950 dark:text-indigo-200">
                  {selectedFile.filename}
                </div>
                <div className="text-[10px] text-stone-500">
                  {(selectedFile.fileSize / 1024).toFixed(0)} KB {selectedFile.dimensions && `• ${selectedFile.dimensions}`}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="p-1 text-stone-400 hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Video Link Input */}
        <div className="mb-2.5">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Video or Web Link:
            </label>
            <button
              type="button"
              onClick={handlePasteClipboard}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Clipboard className="w-3 h-3" />
              <span>Paste Clipboard</span>
            </button>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 rounded-xl px-3 py-2 border border-slate-200 dark:border-white/[0.08] focus-within:border-indigo-500">
            <Video className="w-4 h-4 text-indigo-500 shrink-0" />
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Paste YouTube, Instagram Reel, TikTok link..."
              className="w-full bg-transparent text-base sm:text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
            />
            {link && (
              <button
                type="button"
                onClick={() => setLink('')}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Note / Prompt Textarea with Voice Dictation */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Notes or Questions:
            </label>
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800'
              }`}
            >
              {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              <span>{isListening ? 'Listening...' : 'Dictate'}</span>
            </button>
          </div>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add context or what to analyze (e.g. 'Tangzu Wan'er budget IEM specs under $25')..."
            rows={2}
            className="w-full bg-slate-50 dark:bg-slate-900/60 rounded-xl p-3 text-base sm:text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-white/[0.08] placeholder-slate-400 outline-none resize-none focus:border-indigo-500"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSave}
          disabled={(!link.trim() && !noteText.trim() && !selectedFile) || isProcessing}
          className={`w-full min-h-[48px] py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md ${
            link.trim() || noteText.trim() || selectedFile
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25 active:scale-98 cursor-pointer'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing with AI Vision & Search...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Analyze & Save to Brain</span>
              <ArrowUp className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Live Camera Viewfinder Modal */}
      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(file) => handleProcessFile(file)}
        onFallbackToFilePicker={() => cameraInputRef.current?.click()}
      />
    </div>
  );
};
