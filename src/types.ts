export type NoteMediaType = 'reel' | 'video' | 'screenshot' | 'image' | 'file' | 'document' | 'link' | 'text' | 'voice';

export interface FileMetadata {
  fileName?: string;
  fileSize?: number; // Size in bytes
  fileType?: string; // MIME type or extension, e.g. "image/png"
  dimensions?: string; // e.g. "1920x1080"
  uploadDate?: number;
}

export interface ProductBio {
  itemName: string;
  itemType: string;
  priceRange?: string;
  driverOrSpecs?: string;
  bioSummary: string;
  pros?: string[];
  cons?: string[];
  verdict?: string;
}

export interface VideoDetail {
  platform?: 'instagram' | 'tiktok' | 'youtube' | 'web' | 'other';
  author?: string;
  thumbnailUrl?: string;
  keyTimestamps?: string[];
  quotesOrTips?: string[];
}

export interface NoteTag {
  id: string;
  label: string;
  isAi: boolean;
  confidence?: number;
}

export interface Note {
  id: string;
  userId?: string;
  title: string;
  content: string; // High-level rich summary
  category: string; // e.g. "Tech Gear", "IEM & Audio", "AI & Tools", "Design", "Develop", "Travel", "Food", "Fashion & Style", "Fitness & Health", etc.
  mediaType: NoteMediaType;
  tags: NoteTag[];
  keywords?: string[]; // Extracted searchable keywords & core terms
  executiveSummary?: string; // Crisp executive takeaway
  detailedSummary?: string; // In-depth section-by-section or step-by-step breakdown
  keyTakeaways?: string[]; // 3-5 high-impact bulleted insights
  source: 'reel' | 'video' | 'screenshot' | 'image' | 'file' | 'document' | 'link' | 'text' | 'voice';
  sourceUrl?: string;
  videoEmbedUrl?: string; // Direct YouTube embed URL if applicable
  imageUrl?: string;
  fileMetadata?: FileMetadata; // Sensible file metadata (size, format, dimensions, filename)
  creator?: string; // e.g. "@creator"
  productBio?: ProductBio;
  videoDetail?: VideoDetail;
  keyDetails?: string[];
  searchCitations?: Array<{ title: string; url: string }>;
  audioDuration?: number;
  createdAt: number;
  updatedAt: number;
  lastResurfacedAt?: number;
  snoozedUntil?: number;
  isArchived?: boolean;
  isPinned?: boolean;
  aiSummary?: string;
  aiConfidence: number;
  connections?: string[];
  connectionReason?: string;
}

export interface AskCitation {
  noteId: string;
  title: string;
  category: string;
  mediaType: NoteMediaType;
  sourceUrl?: string;
  imageUrl?: string;
  productBio?: ProductBio;
  highlight: string;
  keyDetails?: string[];
}

export interface AskAnswer {
  id: string;
  query: string;
  answer: string;
  citations: AskCitation[];
  timestamp: number;
}
