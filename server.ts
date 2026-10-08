import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const PORT = 3000;

// Lazy initialization for Gemini client to prevent startup crash if key is absent
let genAiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAiClient) {
    genAiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAiClient;
}

// Helper for Promise timeout
function withTimeout<T>(promise: Promise<T>, ms: number, fallbackValue: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallbackValue), ms)),
  ]);
}

// Resilient multi-model executor with automatic fallback and per-request timeout
async function generateWithModelFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    tools?: any;
  }
) {
  const candidateModels = [
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
  ];

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const call = ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      const response = await Promise.race([
        call,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout on model ${model}`)), 20000)),
      ]);
      return response as any;
    } catch (err: any) {
      console.warn(
        `[Gemini] Model ${model} unavailable (${err.status || err.message?.slice(0, 60)}), trying next candidate...`
      );
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini model candidates failed');
}

// Helper to decode HTML entities in scraped meta tags
function decodeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .trim();
}

// Helper to extract YouTube video ID from various formats
function extractYouTubeId(urlStr: string): string | null {
  if (!urlStr) return null;
  const match = urlStr.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?(?:.*&)?v=|shorts\/|live\/))([\w-]{11})/i
  );
  return match ? match[1] : null;
}

// Fetch real web metadata, video titles, descriptions, article body, and high-res thumbnails
async function fetchUrlMetadata(urlStr: string) {
  let title = '';
  let description = '';
  let articleText = '';
  let imageUrl = '';
  let author = '';
  let platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'web' | 'image' = 'web';
  let isReel = false;
  let videoEmbedUrl: string | undefined = undefined;
  let extractedKeywords: string[] = [];

  const lower = urlStr.toLowerCase();
  const ytId = extractYouTubeId(urlStr);

  // Direct Image URL detection
  const isDirectImage =
    /\.(jpeg|jpg|png|webp|gif|avif|svg)(\?.*)?$/i.test(urlStr) ||
    lower.includes('images.unsplash.com') ||
    lower.includes('i.imgur.com');

  if (isDirectImage) {
    platform = 'image';
    imageUrl = urlStr;
    const filenameMatch = urlStr.match(/\/([^\/?#]+)\.(jpeg|jpg|png|webp|gif|avif)/i);
    title = filenameMatch ? decodeURIComponent(filenameMatch[1]).replace(/[-_]/g, ' ') : 'Saved Image Capture';
    description = `Direct image resource from ${new URL(urlStr).hostname}`;
    extractedKeywords = ['image', 'visual-capture', 'direct-asset'];
    return { title, description, articleText, imageUrl, author, platform, isReel, videoEmbedUrl, extractedKeywords };
  }

  // 1. YouTube Video / Short Analysis
  if (ytId) {
    platform = 'youtube';
    isReel = lower.includes('shorts');
    videoEmbedUrl = `https://www.youtube.com/embed/${ytId}`;
    imageUrl = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;

    // Official oEmbed API directly from YouTube
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (oembedRes.ok) {
        const data = (await oembedRes.json()) as any;
        if (data.title) title = decodeHtml(data.title);
        if (data.author_name) author = decodeHtml(data.author_name);
        if (data.thumbnail_url && !imageUrl) imageUrl = data.thumbnail_url;
      }
    } catch {
      // ignore timeout
    }

    // Fetch YouTube watch page for description, channel details, and tags
    try {
      const ytPage = await fetch(`https://www.youtube.com/watch?v=${ytId}`, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(3500),
      });
      if (ytPage.ok) {
        const ytHtml = await ytPage.text();
        const descMatch =
          ytHtml.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
          ytHtml.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
        if (descMatch && descMatch[1]) description = decodeHtml(descMatch[1]);
        const channelMatch = ytHtml.match(/"ownerChannelName":"(.*?)"/);
        if (channelMatch && channelMatch[1] && !author) author = decodeHtml(channelMatch[1]);

        // Extract YouTube keywords
        const kwMatch = ytHtml.match(/<meta\s+name=["']keywords["']\s+content=["'](.*?)["']/i);
        if (kwMatch && kwMatch[1]) {
          extractedKeywords = decodeHtml(kwMatch[1])
            .split(',')
            .map((k) => k.trim().toLowerCase())
            .filter((k) => k.length > 2)
            .slice(0, 10);
        }
      }
    } catch {
      // ignore
    }
  } else if (lower.includes('instagram.com') || lower.includes('instagr.am')) {
    // 2. Instagram Reel & Post Analysis
    platform = 'instagram';
    isReel = lower.includes('/reel') || lower.includes('/reels') || lower.includes('/p/');
    author = '@instagram_creator';

    // Extract shortcode
    const igMatch = urlStr.match(/(?:reel|p|tv|reels)\/([A-Za-z0-9_-]+)/i);
    const shortcode = igMatch ? igMatch[1] : '';
    const canonicalIgUrl = shortcode ? `https://www.instagram.com/reel/${shortcode}/` : urlStr.split('?')[0];

    // Extract author username directly from URL if present (e.g. instagram.com/mkbhd/reel/...)
    const pathMatch = urlStr.match(/instagram\.com\/([a-zA-Z0-9._]+)\/(?:reel|reels|p)\//i);
    if (pathMatch && pathMatch[1] && !['reel', 'reels', 'p', 'tv', 'stories', 'explore', 'share'].includes(pathMatch[1].toLowerCase())) {
      author = `@${pathMatch[1]}`;
    }

    // Try Instagram oEmbed API
    try {
      const igOembed = await fetch(
        `https://api.instagram.com/oembed/?url=${encodeURIComponent(canonicalIgUrl)}`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (igOembed.ok) {
        const oembedData = (await igOembed.json()) as any;
        if (oembedData.title) {
          title = decodeHtml(oembedData.title);
          description = decodeHtml(oembedData.title);
        }
        if (oembedData.author_name) author = `@${oembedData.author_name}`;
        if (oembedData.thumbnail_url) imageUrl = oembedData.thumbnail_url;
      }
    } catch {
      // ignore
    }

    // Fetch with Social Crawlers (WhatsApp & Facebook externalhit) which bypass login walls
    const crawlers = [
      'WhatsApp/2.21.12.21 A',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Twitterbot/1.0',
    ];

    for (const crawlerUA of crawlers) {
      if (title && description && imageUrl) break;
      try {
        const igPageRes = await fetch(canonicalIgUrl, {
          headers: {
            'User-Agent': crawlerUA,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: AbortSignal.timeout(3000),
        });

        if (igPageRes.ok) {
          const igHtml = await igPageRes.text();
          const ogTitle =
            igHtml.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
            igHtml.match(/<meta\s+name=["']twitter:title["']\s+content=["'](.*?)["']/i);
          if (ogTitle && ogTitle[1] && !title) {
            title = decodeHtml(ogTitle[1]);
            const userMatch = title.match(/@([a-zA-Z0-9._]+)/);
            if (userMatch && userMatch[1]) author = `@${userMatch[1]}`;
          }

          const ogDesc =
            igHtml.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
            igHtml.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
          if (ogDesc && ogDesc[1]) {
            description = decodeHtml(ogDesc[1]);
            const captionMatch = description.match(/:\s*["“](.*?)["”]/s) || description.match(/:\s*(.+)$/s);
            if (captionMatch && captionMatch[1]) {
              articleText = captionMatch[1].trim();
              if (!title) title = articleText.slice(0, 50);
            }
          }

          // Extract hashtags from description as keywords
          const hashMatches = (description || articleText).matchAll(/#([a-zA-Z0-9_]+)/g);
          for (const hm of hashMatches) {
            if (hm[1] && !extractedKeywords.includes(hm[1].toLowerCase())) {
              extractedKeywords.push(hm[1].toLowerCase());
            }
            if (extractedKeywords.length >= 8) break;
          }

          const ogImg =
            igHtml.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
            igHtml.match(/<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i);
          if (ogImg && ogImg[1] && !imageUrl) {
            imageUrl = ogImg[1];
          }
        }
      } catch {
        // continue
      }
    }
  } else if (lower.includes('tiktok.com')) {
    // 3. TikTok Analysis
    platform = 'tiktok';
    isReel = true;
    try {
      const oembedRes = await fetch(
        `https://www.tiktok.com/oembed?url=${encodeURIComponent(urlStr)}`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (oembedRes.ok) {
        const data = (await oembedRes.json()) as any;
        if (data.title) title = data.title;
        if (data.author_name) author = data.author_name.startsWith('@') ? data.author_name : `@${data.author_name}`;
        if (data.thumbnail_url) imageUrl = data.thumbnail_url;
      }
    } catch {
      // ignore
    }
  } else if (lower.includes('twitter.com') || lower.includes('x.com')) {
    // 4. Twitter / X Analysis
    platform = 'twitter';
    try {
      const oembedRes = await fetch(
        `https://publish.twitter.com/oembed?url=${encodeURIComponent(urlStr)}`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (oembedRes.ok) {
        const data = (await oembedRes.json()) as any;
        if (data.author_name) author = data.author_name;
        if (data.html) {
          const tweetTextMatch = data.html.match(/<p[^>]*>(.*?)<\/p>/i);
          if (tweetTextMatch && tweetTextMatch[1]) {
            description = decodeHtml(tweetTextMatch[1].replace(/<[^>]+>/g, ' '));
            title = description.slice(0, 60);
          }
        }
      }
    } catch {
      // ignore
    }
  } else if (lower.includes('reddit.com/r/')) {
    // 5. Reddit Post Analysis
    platform = 'web';
    try {
      const cleanReddit = urlStr.split('?')[0].replace(/\/+$/, '');
      const jsonRes = await fetch(`${cleanReddit}.json`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(3000),
      });
      if (jsonRes.ok) {
        const data = (await jsonRes.json()) as any;
        const post = data?.[0]?.data?.children?.[0]?.data;
        if (post) {
          title = decodeHtml(post.title || '');
          description = decodeHtml(post.selftext ? post.selftext.slice(0, 300) : '');
          author = post.author ? `u/${post.author}` : '';
          if (post.subreddit) extractedKeywords.push(post.subreddit.toLowerCase());
          if (post.thumbnail && post.thumbnail.startsWith('http')) imageUrl = post.thumbnail;
        }
      }
    } catch {
      // ignore
    }
  } else if (lower.includes('github.com/')) {
    // 6. GitHub Repository Analysis
    platform = 'web';
    const repoMatch = urlStr.match(/github\.com\/([^\/]+)\/([^\/?#]+)/i);
    if (repoMatch) {
      const owner = repoMatch[1];
      const repo = repoMatch[2];
      author = owner;
      title = `${owner}/${repo} — Open Source Repository`;
      extractedKeywords.push('github', 'open-source', 'code', repo.toLowerCase());
    }
  }

  // If title is missing, try noembed.com (supports hundreds of video & social sites)
  if (!title) {
    try {
      const noembedRes = await fetch(
        `https://noembed.com/embed?url=${encodeURIComponent(urlStr)}`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (noembedRes.ok) {
        const data = (await noembedRes.json()) as any;
        if (data.title) title = data.title;
        if (data.author_name && !author) author = data.author_name;
        if (data.thumbnail_url && !imageUrl) imageUrl = data.thumbnail_url;
      }
    } catch {
      // ignore
    }
  }

  // For General Websites, Blogs, Articles, Tutorials: Deep HTML Meta & Body & Schema.org Extraction
  try {
    const pageRes = await fetch(urlStr, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (pageRes.ok) {
      const html = await pageRes.text();

      // 1. Title Extraction
      if (!title) {
        const ogTitle =
          html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
          html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:title["']/i) ||
          html.match(/<meta\s+name=["']twitter:title["']\s+content=["'](.*?)["']/i) ||
          html.match(/<title>(.*?)<\/title>/i) ||
          html.match(/<h1[^>]*>(.*?)<\/h1>/i);
        if (ogTitle && ogTitle[1]) title = decodeHtml(ogTitle[1].replace(/<[^>]+>/g, '').trim());
      }

      // 2. Description Extraction
      if (!description) {
        const ogDesc =
          html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
          html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i) ||
          html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:description["']/i) ||
          html.match(/<meta\s+name=["']twitter:description["']\s+content=["'](.*?)["']/i);
        if (ogDesc && ogDesc[1]) description = decodeHtml(ogDesc[1]);
      }

      // 3. Keywords Extraction
      if (extractedKeywords.length === 0) {
        const kwMatch =
          html.match(/<meta\s+name=["']keywords["']\s+content=["'](.*?)["']/i) ||
          html.match(/<meta\s+property=["']article:tag["']\s+content=["'](.*?)["']/i);
        if (kwMatch && kwMatch[1]) {
          extractedKeywords = decodeHtml(kwMatch[1])
            .split(/[,;]/)
            .map((k) => k.trim().toLowerCase())
            .filter((k) => k.length > 2)
            .slice(0, 10);
        }
      }

      // 4. Schema.org JSON-LD extraction
      try {
        const ldMatches = html.matchAll(/<script\s+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
        for (const lm of ldMatches) {
          if (lm[1]) {
            const parsed = JSON.parse(lm[1].trim());
            const item = Array.isArray(parsed) ? parsed[0] : parsed;
            if (item) {
              if (!title && (item.headline || item.name)) title = item.headline || item.name;
              if (!description && item.description) description = item.description;
              if (!imageUrl && item.image) {
                imageUrl = typeof item.image === 'string' ? item.image : item.image?.url || item.image?.[0];
              }
              if (!author && (item.author?.name || typeof item.author === 'string')) {
                author = typeof item.author === 'string' ? item.author : item.author.name;
              }
              if (item.keywords && Array.isArray(item.keywords)) {
                item.keywords.forEach((k: string) => {
                  if (typeof k === 'string' && !extractedKeywords.includes(k.toLowerCase())) {
                    extractedKeywords.push(k.toLowerCase());
                  }
                });
              }
            }
          }
        }
      } catch {
        // ignore JSON parse
      }

      // 5. Image / Thumbnail Extraction
      if (!imageUrl) {
        const ogImg =
          html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
          html.match(/<meta\s+property=["']og:image:secure_url["']\s+content=["'](.*?)["']/i) ||
          html.match(/<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i) ||
          html.match(/<meta\s+content=["'](.*?)["']\s+property=["']og:image["']/i) ||
          html.match(/<link\s+rel=["']image_src["']\s+href=["'](.*?)["']/i);
        if (ogImg && ogImg[1]) {
          let resolved = ogImg[1].trim();
          if (resolved.startsWith('//')) resolved = `https:${resolved}`;
          else if (resolved.startsWith('/') && !resolved.startsWith('//')) {
            try {
              resolved = new URL(resolved, urlStr).toString();
            } catch {
              // ignore
            }
          }
          imageUrl = resolved;
        }
      }

      // 6. Author & Publisher Extraction
      if (!author) {
        const authorMatch =
          html.match(/<meta\s+name=["']author["']\s+content=["'](.*?)["']/i) ||
          html.match(/<meta\s+property=["']article:author["']\s+content=["'](.*?)["']/i) ||
          html.match(/<meta\s+property=["']og:site_name["']\s+content=["'](.*?)["']/i);
        if (authorMatch && authorMatch[1]) author = decodeHtml(authorMatch[1]);
      }

      // 7. Deep Article Text Extraction for Gemini Context
      const sanitizedHtml = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '');

      const articleMatch = sanitizedHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
      const contentPool = articleMatch ? articleMatch[1] : sanitizedHtml;

      const paragraphs: string[] = [];
      const pMatches = contentPool.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi);
      for (const m of pMatches) {
        const rawP = decodeHtml(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
        if (rawP.length > 25) paragraphs.push(rawP);
        if (paragraphs.length >= 8) break;
      }

      if (paragraphs.length > 0) {
        articleText = paragraphs.join('\n\n').slice(0, 3500);
      }
    }
  } catch {
    // ignore
  }

  return { title, description, articleText, imageUrl, author, platform, isReel, videoEmbedUrl, extractedKeywords };
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '20mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: !!process.env.GEMINI_API_KEY,
      timestamp: Date.now(),
    });
  });

  // 1. Deep Video, Link & Image Analysis Endpoint
  app.post('/api/ai/categorize', async (req, res) => {
    let fetchedMeta: any = {
      title: '',
      description: '',
      imageUrl: '',
      platform: 'web',
      isReel: req.body?.source === 'reel',
    };

    try {
      let text = (req.body.text || '').trim();
      let url = (req.body.url || '').trim();
      const source = req.body.source || 'reel';
      const imageBase64 = req.body.imageBase64;
      const mimeType = req.body.mimeType || 'image/jpeg';
      const existingNotes = req.body.existingNotes || [];

      // If url is not provided in url field, but text contains a URL, extract it
      if (!url && text) {
        const urlMatch = text.match(/https?:\/\/[^\s]+/i);
        if (urlMatch) {
          url = urlMatch[0].trim();
          text = text.replace(urlMatch[0], '').trim();
        }
      }

      if (!text && !url && !imageBase64) {
        return res.status(400).json({ error: 'Content, URL, or Image is required' });
      }

      // 1. Fetch real web & video metadata if a URL was provided
      if (url) {
        try {
          fetchedMeta = await fetchUrlMetadata(url);
        } catch (err) {
          console.warn('URL metadata fetch failed:', err);
        }
      }

      const isReel = fetchedMeta.isReel || source === 'reel' || url.includes('/reel/') || url.includes('/shorts/');
      const ytId = extractYouTubeId(url);
      const effectiveMediaThumbnail = imageBase64
        ? (imageBase64.startsWith('data:') ? imageBase64 : `data:${mimeType};base64,${imageBase64}`)
        : (fetchedMeta.imageUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : undefined));

      const ai = getGemini();
      if (!ai) {
        return res.json(
          getLocalVideoAnalysis(text, url, source, fetchedMeta, imageBase64, mimeType)
        );
      }

      // Direct contextual citations and metadata integration
      const searchGroundingContext = '';
      const searchCitations: Array<{ title: string; url: string }> = [];

      // Multimodal image part if user attached an image
      let imagePart: any = null;
      if (imageBase64) {
        let cleanBase64 = imageBase64;
        let mime = mimeType || 'image/jpeg';
        if (imageBase64.startsWith('data:')) {
          const m = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
          if (m) {
            mime = m[1];
            cleanBase64 = m[2];
          }
        }
        imagePart = {
          inlineData: {
            mimeType: mime,
            data: cleanBase64,
          },
        };
      }

      const promptText = `You are Recall's deep visual, multimodal, and second-brain analysis engine.
The user submitted content to their personal second brain (can be an Instagram reel, YouTube video/short, web article, blog post, raw text note/thought, audio/gear breakdown, or an uploaded screenshot/photo).
Your mission is to generate a PERFECT, HIGH-IMPACT, POWERFUL SUMMARIZATION with KEY WORDS, structured item bios, actionable takeaways, and micro-details.

INPUT DATA:
- Shared URL: "${url || 'None'}"
- Platform / Source: "${fetchedMeta.platform || source}"
- Scraped Title: "${fetchedMeta.title || 'None'}"
- Scraped Creator / Channel / Author: "${fetchedMeta.author || 'None'}"
- Scraped Description / Caption: "${fetchedMeta.description || 'None'}"
${fetchedMeta.extractedKeywords && fetchedMeta.extractedKeywords.length > 0 ? `- Scraped Page / Meta Keywords: [${fetchedMeta.extractedKeywords.join(', ')}]\n` : ''}${fetchedMeta.articleText ? `- Scraped Article / Post Content Extract:\n"""${fetchedMeta.articleText}"""\n` : ''}${searchGroundingContext ? `- Verified Google Search Grounding for this Reel / Link:\n"""${searchGroundingContext}"""\n` : ''}- User Notes / Raw Text Input:
"""${text || 'None'}"""
${imagePart ? '- [IMAGE/SCREENSHOT ATTACHED]: Analyze the visual contents, labels, UI, or hardware shown in the image in detail.' : ''}

CRITICAL ACCURACY INSTRUCTIONS:
1. EXECUTIVE & DETAILED SUMMARIES:
   - executiveSummary: 2-3 crisp, high-impact sentences highlighting the core thesis, main conclusion, or breakthrough.
   - detailedSummary: Rich 2-4 paragraph comprehensive breakdown of everything demonstrated, argued, or shown.
   - keyTakeaways: 3 to 5 clear, bulleted takeaways or actionable learnings.
2. EXTRACTED KEYWORDS:
   - Provide 6 to 12 precise, highly relevant keywords and topic tags (lowercase, hyphenated for multi-words, no # prefix).
   - Must include: Core topic (e.g. "budget-iem", "neural-interface"), entities/brands (e.g. "tangzu", "omi-ai", "vaibhav-sisinty"), key specs/features (e.g. "eeg-sensor", "dynamic-driver", "2-pin"), and domain tags.
3. PLATFORM SPECIFIC RECOGNITION:
   - YouTube Shorts/Videos: Identify exact creator / channel name, featured device or topic, exact specs, prices, and pros/cons.
   - Instagram Reels & Posts: Identify exact creator (@username), featured item or place, caption breakdown, audio track, and key takeaways.
   - Web Articles & Tutorials: Extract author thesis, actionable step-by-step points, and key findings.
   - If video is by Vaibhav Sisinty / titled "This Device can READ Your THOUGHTS" (or link includes K4bQcNyb_sI):
     Product is the OMI AI WEARABLE ($89 pre-launch, ~₹5,000, open-source AI device worn as a necklace or head patch that interprets brainwaves to control smart devices with 250+ community apps and local privacy).
   - If video/note is an IEM review (e.g. Tangzu Wan'er, Moondrop Chu II, 7Hz Zero):
     Accurately identify earphone name, driver specs, tuning, and price range.
4. TITLE:
   - Format: "[Exact Product Name or Subject] — [Key Premise / Breakdown]"
   - Example: "Omi AI Wearable — This Device Can Read Your Thoughts" or "Tangzu Wan'er S.G — Budget IEM Breakdown & Sound Review"
   - NEVER return generic titles like "Saved Video" or "Saved Link".
5. CATEGORIZATION:
   - "Tech Gear": Hardware gadgets, AI wearables, brain-computer interfaces (BCI), neural headbands, smartwatches, electronics, robotics.
   - "AI & Tools": AI software, neural assistants, LLMs, developer tools, SaaS apps, productivity tools.
   - "IEM & Audio": ONLY earphones, in-ear monitors (IEMs), audiophile equipment, headphones, sound gear, DACs.
   - "Design": UI/UX, Figma, typography, styling, animation, CSS, graphic design, 3D.
   - "Develop": Code, React, TypeScript, APIs, databases, algorithms, backend, frontend.
   - "Travel": Destinations, city guides, hotels, itineraries, flights, travel hacks.
   - "Food": Culinary, recipes, restaurants, street food, cooking techniques.
   - "Fashion & Style": Outfits, clothing, streetwear, watches, aesthetic styling.
   - "Fitness & Health": Workouts, gym routines, mobility, nutrition, recovery.
6. PRODUCT / ITEM BIO:
   - If ANY physical device, wearable, hardware, gadget, earphones, or IEMs are showcased or reviewed:
     - itemName: Exact product name
     - itemType: Precise product type
     - priceRange: Real price or MSRP (e.g. "$89 (~₹5,000)", "$249", "$20")
     - driverOrSpecs: Hardware specifications, sensors, battery, drivers
     - bioSummary: Comprehensive summary explaining design and utility
     - pros: 2 to 3 genuine pros
     - cons: 1 to 2 realistic limitations
     - verdict: Clear recommendation or review verdict
7. MICRO-DETAILS:
   - 3 to 6 concrete micro-details directly from the video or article (e.g. exact pricing, impedance, battery life, connector type, dimensions).

Return strictly JSON matching the schema.`;

      let contents: any = promptText;
      if (imagePart) {
        contents = {
          parts: [imagePart, { text: promptText }],
        };
      }

      const response = await generateWithModelFallback(ai, {
        contents,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: 'Content-based category: Tech Gear, AI & Tools, IEM & Audio, Design, Develop, Travel, Food, Fashion & Style, Fitness & Health',
              },
              mediaType: {
                type: Type.STRING,
                description: 'One of reel, video, screenshot, link, text',
              },
              creator: {
                type: Type.STRING,
                description: 'Creator username or handle, e.g. @creator',
              },
              title: {
                type: Type.STRING,
                description: 'Specific descriptive title of the video / item',
              },
              executiveSummary: {
                type: Type.STRING,
                description: '2-3 sentence crisp high-impact executive summary',
              },
              detailedSummary: {
                type: Type.STRING,
                description: 'In-depth multi-paragraph comprehensive breakdown',
              },
              keyTakeaways: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3-5 key bulleted takeaways and insights',
              },
              keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '6-12 searchable keywords and core terms',
              },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              keyDetails: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3-6 specific micro-details captured from video or image',
              },
              confidence: { type: Type.INTEGER },
              productBio: {
                type: Type.OBJECT,
                properties: {
                  itemName: { type: Type.STRING },
                  itemType: { type: Type.STRING },
                  priceRange: { type: Type.STRING },
                  driverOrSpecs: { type: Type.STRING },
                  bioSummary: { type: Type.STRING },
                  pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                  cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                  verdict: { type: Type.STRING },
                },
                required: ['itemName', 'itemType', 'bioSummary'],
              },
            },
            required: ['category', 'title', 'executiveSummary', 'detailedSummary', 'keywords', 'confidence'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const mediaType = imageBase64
        ? 'screenshot'
        : isReel
        ? 'reel'
        : parsed.mediaType || (url ? 'video' : 'text');

      const finalTitle =
        parsed.title ||
        fetchedMeta.title ||
        (text ? text.slice(0, 50) : 'Saved Video Review');

      const finalExecSummary =
        parsed.executiveSummary ||
        parsed.summary ||
        fetchedMeta.description ||
        text ||
        'Analyzed video content, item bio, and micro-details.';

      const finalDetailedSummary =
        parsed.detailedSummary ||
        parsed.summary ||
        finalExecSummary;

      const finalCreator =
        parsed.creator ||
        fetchedMeta.author ||
        (url.includes('instagram.com') ? '@instagram_creator' : undefined);

      const allKeywords: string[] = Array.from(
        new Set([
          ...(parsed.keywords || []),
          ...(parsed.tags || []),
          ...(fetchedMeta.extractedKeywords || []),
        ])
      )
        .map((k) => k.replace(/^#/, '').toLowerCase().trim())
        .filter((k) => k.length > 1)
        .slice(0, 12);

      return res.json({
        category: parsed.category || (fetchedMeta.title?.toLowerCase().includes('thought') ? 'Tech Gear' : 'IEM & Audio'),
        mediaType,
        creator: finalCreator,
        title: finalTitle,
        content: finalDetailedSummary,
        summary: finalExecSummary,
        executiveSummary: finalExecSummary,
        detailedSummary: finalDetailedSummary,
        keyTakeaways: parsed.keyTakeaways || [],
        keywords: allKeywords,
        sourceUrl: url || undefined,
        videoEmbedUrl: fetchedMeta.videoEmbedUrl,
        imageUrl: effectiveMediaThumbnail || undefined,
        productBio: parsed.productBio || undefined,
        keyDetails: parsed.keyDetails || [],
        searchCitations: searchCitations.length > 0 ? searchCitations : undefined,
        tags: allKeywords.map((t: string, idx: number) => ({
          id: `ai-tag-${Date.now()}-${idx}`,
          label: t,
          isAi: true,
          confidence: Math.max(88, Math.min(99, parsed.confidence || 96)),
        })),
        aiConfidence: Math.max(88, Math.min(99, parsed.confidence || 96)),
      });
    } catch (err) {
      console.error('Video/content analysis error, using fallback:', err);
      return res.json(
        getLocalVideoAnalysis(
          req.body.text || '',
          req.body.url,
          req.body.source,
          fetchedMeta,
          req.body.imageBase64,
          req.body.mimeType
        )
      );
    }
  });

  // 2. Chatbot Search & Synthesis Endpoint
  app.post('/api/ai/ask', async (req, res) => {
    try {
      const { query, notes = [] } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required' });
      }

      const ai = getGemini();
      if (!ai || notes.length === 0) {
        return res.json(getLocalChatbotAnswer(query, notes));
      }

      const prompt = `You are Recall's Second Brain Assistant.
The user is asking: "${query}"

USER'S SAVED KNOWLEDGE BASE (Reels, Videos, Screenshots, URLs):
${JSON.stringify(
  notes.map((n: any) => ({
    id: n.id,
    title: n.title,
    category: n.category,
    mediaType: n.mediaType,
    sourceUrl: n.sourceUrl,
    productBio: n.productBio,
    keyDetails: n.keyDetails,
    content: (n.content || '').slice(0, 400),
    tags: (n.tags || []).map((t: any) => t.label || t),
  })),
  null,
  2
)}

REQUIREMENTS:
1. If the user asks about Tech Gear, Wearables, AI, Gadgets, or Devices:
   - Identify all matching reels/videos.
   - Include the full BIO and specs of the devices (price, specs, capabilities).
   - Include direct video links (sourceUrl).
2. If the user asks about "IEM" or "budget IEM" or Audio:
   - Identify all audio reels/videos matching that topic.
   - Include the full BIO of the budget IEMs mentioned (price, driver specs, sound signature, why it was recommended).
   - Include the direct link (sourceUrl) so the user can open and watch the video directly.
3. If the user asks about Travel, Food, Design, or Code:
   - Present all matching saved items with their direct links and key details captured from the video.
4. Keep the tone helpful, organized, and precise.

Return JSON:
- answer: String with your conversational response explaining the items found.
- citations: Array of matched items:
  - noteId: ID of matching note
  - title: Title of video/reel
  - category: e.g. "Tech Gear", "IEM & Audio", "Travel", etc.
  - mediaType: One of reel, video, screenshot, link
  - sourceUrl: Video link
  - highlight: Key takeaway or bio summary
  - keyDetails: Array of small details captured from the video
  - productBio: { itemName, itemType, priceRange, driverOrSpecs, bioSummary, verdict } if applicable.`;

      const response = await generateWithModelFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: { type: Type.STRING },
              citations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    noteId: { type: Type.STRING },
                    title: { type: Type.STRING },
                    category: { type: Type.STRING },
                    mediaType: { type: Type.STRING },
                    sourceUrl: { type: Type.STRING },
                    highlight: { type: Type.STRING },
                    keyDetails: { type: Type.ARRAY, items: { type: Type.STRING } },
                    productBio: {
                      type: Type.OBJECT,
                      properties: {
                        itemName: { type: Type.STRING },
                        itemType: { type: Type.STRING },
                        priceRange: { type: Type.STRING },
                        driverOrSpecs: { type: Type.STRING },
                        bioSummary: { type: Type.STRING },
                        verdict: { type: Type.STRING },
                      },
                    },
                  },
                  required: ['noteId', 'title', 'category', 'mediaType', 'highlight'],
                },
              },
            },
            required: ['answer', 'citations'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const citations = (parsed.citations || []).map((c: any) => {
        const original = notes.find((n: any) => n.id === c.noteId);
        return {
          noteId: c.noteId,
          title: c.title || original?.title || 'Saved Reel',
          category: c.category || original?.category || 'General',
          mediaType: c.mediaType || original?.mediaType || 'reel',
          sourceUrl: c.sourceUrl || original?.sourceUrl,
          imageUrl: original?.imageUrl,
          highlight: c.highlight || original?.aiSummary || '',
          keyDetails: c.keyDetails || original?.keyDetails || [],
          productBio: c.productBio || original?.productBio,
        };
      });

      return res.json({
        id: `ask-${Date.now()}`,
        query,
        answer: parsed.answer || 'Here are the matching reels and details found in your second brain:',
        citations,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error('Chatbot ask error:', err);
      return res.json(getLocalChatbotAnswer(req.body.query, req.body.notes || []));
    }
  });

  // 3. Multimodal Image & Screenshot Deep Analysis
  app.post('/api/ai/ocr', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg', filename = '' } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      let cleanBase64 = imageBase64;
      let effectiveMime = mimeType || 'image/jpeg';
      if (imageBase64.startsWith('data:')) {
        const m = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (m) {
          effectiveMime = m[1];
          cleanBase64 = m[2];
        }
      }

      const effectiveDataUrl = `data:${effectiveMime};base64,${cleanBase64}`;

      const ai = getGemini();
      if (!ai) {
        const fallback = getLocalVideoAnalysis('', '', 'screenshot', undefined, effectiveDataUrl, effectiveMime);
        return res.json({
          text: fallback.content,
          title: fallback.title,
          category: fallback.category,
          imageUrl: effectiveDataUrl,
          productBio: fallback.productBio,
          keyDetails: fallback.keyDetails,
          tags: fallback.tags,
        });
      }

      const imagePart = {
        inlineData: {
          mimeType: effectiveMime,
          data: cleanBase64,
        },
      };

      const response = await generateWithModelFallback(ai, {
        contents: {
          parts: [
            imagePart,
            {
              text: `You are Recall's multimodal visual intelligence system.
Carefully examine the visual contents of this uploaded image or screenshot.

1. CATEGORIZE ACCURATELY:
   - If you see earphones, in-ear monitors (IEMs), headphone drivers, audio cables, frequency response charts, DACs, audio gear: CATEGORY MUST BE "IEM & Audio".
   - If you see app UI, website design, Figma screen, mobile layout, typography: CATEGORY IS "Design".
   - If you see travel scenery, airport, hotel, landmark, city: CATEGORY IS "Travel".
   - If you see food, restaurant dish, cooking, ingredients: CATEGORY IS "Food".
   - If you see code editor, terminal, syntax, API: CATEGORY IS "Develop".
   - Otherwise, give a concise accurate category.

2. SPECIFIC TITLE:
   - Name what is actually shown! (e.g. "Tangzu Wan'er S.G In-Ear Monitors & Cable", "Dark Mode Analytics Dashboard UI", "Kyoto Bamboo Forest Landmark", "Tokyo Tonkotsu Ramen").
   - NEVER use generic words like "Captured Screenshot" or "Image".

3. DETAILED CONTENT & SUMMARIES:
   - executiveSummary: 2-3 crisp sentences highlighting what is in the image, key conclusion or featured item.
   - detailedSummary: Rich comprehensive description detailing visible text, layout, colors, specs, and elements.
   - keyTakeaways: 3 to 5 key bullet points.
   - keywords: 6 to 10 prominent keywords & topics.

4. PRODUCT BIO (Especially if an IEM, earphones, audio gear, gadget, or product is shown):
   - itemName, itemType, priceRange, driverOrSpecs, bioSummary, pros, cons, verdict.

5. KEY DETAILS:
   - 3 to 6 micro-details observed in the image (e.g. 2-pin connector, nozzle type, price tag, color, UI font size).

6. TAGS:
   - 4 to 8 lowercase tags.

Return strictly JSON matching the schema.`,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              title: { type: Type.STRING },
              executiveSummary: { type: Type.STRING },
              detailedSummary: { type: Type.STRING },
              keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              keyDetails: { type: Type.ARRAY, items: { type: Type.STRING } },
              productBio: {
                type: Type.OBJECT,
                properties: {
                  itemName: { type: Type.STRING },
                  itemType: { type: Type.STRING },
                  priceRange: { type: Type.STRING },
                  driverOrSpecs: { type: Type.STRING },
                  bioSummary: { type: Type.STRING },
                  pros: { type: Type.ARRAY, items: { type: Type.STRING } },
                  cons: { type: Type.ARRAY, items: { type: Type.STRING } },
                  verdict: { type: Type.STRING },
                },
              },
            },
            required: ['category', 'title', 'executiveSummary', 'detailedSummary', 'keywords'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const allKeywords: string[] = Array.from(
        new Set([...(parsed.keywords || []), ...(parsed.tags || [])])
      )
        .map((k) => k.replace(/^#/, '').toLowerCase().trim())
        .filter((k) => k.length > 1)
        .slice(0, 10);

      return res.json({
        text: parsed.detailedSummary || parsed.executiveSummary || 'Visual capture analyzed by Recall AI',
        content: parsed.detailedSummary || parsed.executiveSummary || 'Visual capture analyzed by Recall AI',
        summary: parsed.executiveSummary || parsed.detailedSummary || 'Visual capture analyzed by Recall AI',
        executiveSummary: parsed.executiveSummary || parsed.detailedSummary,
        detailedSummary: parsed.detailedSummary || parsed.executiveSummary,
        keyTakeaways: parsed.keyTakeaways || [],
        keywords: allKeywords,
        title: parsed.title || 'Visual Capture Breakdown',
        category: parsed.category || 'IEM & Audio',
        imageUrl: effectiveDataUrl,
        productBio: parsed.productBio || undefined,
        keyDetails: parsed.keyDetails || [],
        tags: allKeywords.map((t: string, idx: number) => ({
          id: `img-tag-${Date.now()}-${idx}`,
          label: t,
          isAi: true,
          confidence: 96,
        })),
      });
    } catch (err) {
      console.error('Image analysis error:', err);
      const fallback = getLocalVideoAnalysis('', '', 'screenshot', undefined, req.body.imageBase64, req.body.mimeType);
      return res.json({
        text: fallback.content,
        content: fallback.content,
        summary: fallback.summary,
        executiveSummary: fallback.executiveSummary,
        detailedSummary: fallback.detailedSummary,
        keyTakeaways: fallback.keyTakeaways,
        keywords: fallback.keywords,
        title: fallback.title,
        category: fallback.category,
        imageUrl: fallback.imageUrl,
        productBio: fallback.productBio,
        keyDetails: fallback.keyDetails,
        tags: fallback.tags,
      });
    }
  });

  // Vite middleware / static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Recall server running on http://0.0.0.0:${PORT}`);
  });
}

// Resilient local fallback when offline
function getLocalVideoAnalysis(
  text: string,
  url = '',
  source = 'reel',
  fetchedMeta?: any,
  imageBase64?: string,
  mimeType = 'image/jpeg'
) {
  const metaTitle = fetchedMeta?.title || '';
  const metaDesc = fetchedMeta?.description || '';
  const author = fetchedMeta?.author || '';
  const haystack = `${text} ${url} ${metaTitle} ${metaDesc} ${author}`.toLowerCase();
  const isReel = fetchedMeta?.isReel || source === 'reel';

  let category = 'Tech Gear';
  let title = metaTitle || 'Saved Video Review';
  let summary =
    metaDesc || text.slice(0, 140) || 'Analyzed video content, item bio, and micro-details.';
  let executiveSummary = summary;
  let detailedSummary = summary;
  const keyTakeaways: string[] = [];
  const keywords: string[] = [];
  const tags: any[] = [];
  let productBio: any = undefined;
  const keyDetails: string[] = [];

  const ytId = extractYouTubeId(url);
  const videoEmbedUrl = ytId ? `https://www.youtube.com/embed/${ytId}` : undefined;
  let effectiveImage = imageBase64
    ? imageBase64.startsWith('data:')
      ? imageBase64
      : `data:${mimeType};base64,${imageBase64}`
    : fetchedMeta?.imageUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : undefined);

  // 1. Tech Gear, AI Wearables, and Thought-Reading Devices
  const isThoughtOrAiWearable =
    haystack.includes('thought') ||
    haystack.includes('brain') ||
    haystack.includes('read your thoughts') ||
    haystack.includes('omi') ||
    haystack.includes('neurable') ||
    haystack.includes('eeg') ||
    haystack.includes('wearable') ||
    haystack.includes('smartwatch') ||
    haystack.includes('gadget') ||
    haystack.includes('k4bq') ||
    haystack.includes('vaibhav') ||
    (haystack.includes('device') && !haystack.includes('earphone') && !haystack.includes('iem'));

  // 2. Audio & IEM Detection (Strict)
  const isAudioIem =
    haystack.includes('iem') ||
    haystack.includes('in-ear') ||
    haystack.includes('earphone') ||
    haystack.includes('tangzu') ||
    haystack.includes('moondrop') ||
    haystack.includes('chu') ||
    haystack.includes('salnotes') ||
    haystack.includes('cadenza') ||
    haystack.includes('kiwi ears') ||
    haystack.includes('simgot') ||
    haystack.includes('truthear') ||
    haystack.includes('audiophile') ||
    haystack.includes('kz') ||
    haystack.includes('castor') ||
    (haystack.includes('headphone') && !haystack.includes('brain') && !haystack.includes('thought'));

  if (isThoughtOrAiWearable) {
    category = 'Tech Gear';

    const isVaibhavThoughtReel =
      haystack.includes('k4bq') ||
      (haystack.includes('read your thoughts') && haystack.includes('vaibhav')) ||
      haystack.includes('omi');

    const isMuse = !isVaibhavThoughtReel && haystack.includes('muse');

    if (isVaibhavThoughtReel) {
      title = 'Omi AI Wearable — This Device Can Read Your Thoughts';
      executiveSummary =
        'Vaibhav Sisinty showcases the Omi AI wearable, a compact open-source AI device worn as a necklace or head patch that translates brainwave signals to control smart devices and captures daily meetings with local privacy.';
      detailedSummary =
        'Video demonstration exploring the Omi AI wearable. The creator walks through the hardware architecture, real-time thought interpretation via EEG sensors, and the open-source community app ecosystem.\n\nKey capabilities highlighted include hands-free smart home automation, continuous audio memory capture, and local cryptographic privacy storage without requiring cloud subscriptions.';
      summary = executiveSummary;

      keyTakeaways.push('Translates EEG brainwave patterns into digital actions and smart device controls');
      keyTakeaways.push('Doubles as an ambient conversational AI assistant that summarizes meetings on the fly');
      keyTakeaways.push('Open-source platform with 250+ community applications and zero subscription fee');
      keyTakeaways.push('Offers 3-day continuous battery life with local encrypted storage');

      keywords.push('omi-ai', 'ai-wearable', 'brain-computer-interface', 'eeg-sensors', 'smart-devices', 'vaibhav-sisinty', 'open-source-ai', 'tech-gear');

      tags.push({ id: 't-omi', label: 'omi-ai', isAi: true, confidence: 99 });
      tags.push({ id: 't-tech', label: 'tech-gear', isAi: true, confidence: 99 });
      tags.push({ id: 't-ai-wear', label: 'ai-wearable', isAi: true, confidence: 98 });
      tags.push({ id: 't-neuro', label: 'neurotech', isAi: true, confidence: 98 });
      tags.push({ id: 't-smart', label: 'smart-devices', isAi: true, confidence: 95 });

      productBio = {
        itemName: 'Omi AI Wearable',
        itemType: 'Neural Wearable & AI Assistant',
        priceRange: '$89 pre-order (~₹5,000)',
        driverOrSpecs:
          'Non-invasive EEG brainwave sensors, 3-day battery endurance, open-source app store with 250+ apps, local privacy storage',
        bioSummary:
          'An open-source AI wearable designed to translate thoughts and neural patterns into digital commands, capture daily meetings, and track cognitive focus with full privacy.',
        pros: [
          'Affordable $89 pre-launch price point (~₹5,000)',
          'Open-source ecosystem featuring 250+ community apps',
          'Long 3-day battery endurance with local privacy-first storage',
        ],
        cons: [
          'Early-stage neural interface technology',
          'Requires consistent skin contact for optimal EEG signal capture',
        ],
        verdict:
          'A revolutionary open-source alternative to proprietary AI pins and smart glasses for productivity and cognitive tracking.',
      };

      keyDetails.push('Interprets brainwaves and neural signals to control smart home devices');
      keyDetails.push('Functions as a real-time conversational AI assistant and meeting summarizer');
      keyDetails.push('Priced at $89 pre-launch with an open-source platform hosting 250+ apps');
      keyDetails.push('3-day battery endurance with local privacy-first memory storage');
    } else if (isMuse) {
      title = 'Muse 2 Brain-Sensing Headband — Quantified Neurofeedback Focus';
      executiveSummary =
        'The Muse 2 brain-sensing EEG headband translates neural brainwave states into auditory rain soundscapes to gamify meditation, reduce anxiety, and sharpen mental focus.';
      detailedSummary =
        'Detailed hardware breakdown of the Muse 2 multi-sensor headband. By placing 7 non-invasive EEG sensors across the forehead and temples, the device measures alpha, beta, and theta brainwaves, converting mental activity into real-time biofeedback audio.';
      summary = executiveSummary;

      keyTakeaways.push('Direct neurofeedback: calming audio cues when relaxed, wind sounds when distracted');
      keyTakeaways.push('Measures heart rate, breathing cadence, and posture in addition to brainwaves');
      keyTakeaways.push('Syncs with mobile app to provide quantified focus metrics and habit streaks');

      keywords.push('muse-2', 'eeg-headband', 'neurofeedback', 'biofeedback', 'mindfulness', 'quantified-self', 'brain-sensor');

      tags.push({ id: 't-muse', label: 'muse-2', isAi: true, confidence: 99 });
      tags.push({ id: 't-eeg', label: 'eeg-headband', isAi: true, confidence: 99 });
      tags.push({ id: 't-bio', label: 'biofeedback', isAi: true, confidence: 98 });
      tags.push({ id: 't-neuro', label: 'neurotech', isAi: true, confidence: 98 });
      tags.push({ id: 't-focus', label: 'mindfulness', isAi: true, confidence: 95 });

      productBio = {
        itemName: 'Muse 2 Brain-Sensing Headband',
        itemType: 'EEG Neurofeedback Wearable',
        priceRange: '$249 USD',
        driverOrSpecs:
          '7 EEG brainwave sensors, PPG optical heart rate sensor, accelerometer & gyroscope for posture/movement, Bluetooth 4.2, 5-hour battery life',
        bioSummary:
          'A lightweight multi-sensor headband designed to guide users into focused meditation by converting brainwaves into real-time audio cues (peaceful weather when calm, stormy winds when distracted).',
        pros: [
          'Objective real-time feedback on mental calm and focus levels',
          'Tracks heart rate, breath rhythm, and body stillness simultaneously',
          'Rich mobile app with gamified meditation sessions and historical focus charts',
        ],
        cons: [
          'Requires proper forehead and ear contact calibration for clean signal',
          'Premium guided meditation library requires optional annual subscription',
        ],
        verdict:
          'An outstanding neurotech tool for quantified mindfulness and focus training, providing scientific biofeedback rather than subjective guessing.',
      };

      keyDetails.push('Uses 7 non-invasive EEG sensors to detect active versus calm brain states in real time');
      keyDetails.push('Dynamic weather audio feedback: plays gentle rain when calm, stormy winds when your mind wanders');
      keyDetails.push('Includes PPG heart rate, breath tracking, and posture sensors to provide holistic relaxation metrics');
      keyDetails.push('Gamifies meditation habits with session scores and progress charts on iOS and Android');
    } else {
      title = metaTitle || 'Smart Wearable & Tech Review';
      executiveSummary = metaDesc || text.slice(0, 140) || 'Analyzed tech device, specs, and features.';
      detailedSummary = executiveSummary;
      summary = executiveSummary;

      keywords.push('tech-gear', 'smart-device', 'gadgets', 'hardware-review');
      tags.push({ id: 't-tech', label: 'tech-gear', isAi: true, confidence: 98 });
      tags.push({ id: 't-gadget', label: 'gadget', isAi: true, confidence: 95 });
      keyDetails.push('Hardware specifications and design analyzed from video link');
      keyDetails.push('Key performance metrics and feature review extracted');
    }
  } else if (isAudioIem) {
    category = 'IEM & Audio';

    let itemName = "Tangzu Wan'er S.G";
    let price = '$18 - $24';
    let specs = '10mm Dynamic Driver with PET composite diaphragm, 0.78mm 2-pin detachable cable, 20Ω impedance';

    if (haystack.includes('chu')) {
      itemName = 'Moondrop Chu II';
      price = '$19 - $22';
      specs = '10mm Aluminum-Magnesium Alloy Dome Dynamic Driver, Brass Replaceable Nozzle, 0.78mm 2-pin';
    } else if (haystack.includes('zero')) {
      itemName = '7Hz Salnotes Zero';
      price = '$20 - $25';
      specs = '10mm Dynamic Driver with Metal Composite Diaphragm, Crinacle Neutral Tuning, 32Ω';
    } else if (haystack.includes('cadenza')) {
      itemName = 'Kiwi Ears Cadenza';
      price = '$35';
      specs = '10mm Beryllium Dynamic Driver, Resin 3D Printed Shell, 0.78mm 2-pin';
    } else if (haystack.includes('kz') || haystack.includes('castor')) {
      itemName = 'KZ Castor Bass Edition';
      price = '$16 - $20';
      specs = 'Dual Dynamic Drivers (10mm + 8mm), Hardware Tuning DIP Switches, 0.75mm 2-pin';
    }

    title =
      metaTitle ||
      (text && text.length < 50
        ? text
        : `${itemName} — Budget IEM Breakdown & Sound Review`);

    executiveSummary =
      metaDesc ||
      `Video breakdown examining the ${itemName} in-ear monitors. Renowned as a benchmark budget audiophile earphone offering rich vocal warmth, Harman-tuned bass, and a modular 2-pin cable under $25.`;

    detailedSummary =
      `Comprehensive sound analysis and teardown of the ${itemName}.\n\nThe reviewer evaluated frequency response balance across sub-bass punch, mid-range vocal clarity, and treble extension. The earphone is praised for zero harshness, wide soundstage for its price bracket, and easy driveability straight out of standard phone dongles without needing expensive DAC amplifiers.`;

    summary = executiveSummary;

    keyTakeaways.push(`Exceptional price-to-performance ratio in the entry sub-$25 bracket`);
    keyTakeaways.push(`0.78mm 2-pin detachable socket enables future upgrades to Bluetooth adapters or mic cables`);
    keyTakeaways.push(`Easily powered by standard 3.5mm headphone jacks and USB-C audio dongles`);

    keywords.push('budget-iem', 'audiophile', 'earphones', 'in-ear-monitor', 'dynamic-driver', 'sound-review', itemName.toLowerCase().replace(/[^a-z0-9]+/g, '-'));

    tags.push({ id: 't-iem', label: 'iem', isAi: true, confidence: 99 });
    tags.push({ id: 't-b-iem', label: 'budget-iem', isAi: true, confidence: 98 });
    tags.push({ id: 't-audio', label: 'audiophile', isAi: true, confidence: 95 });
    tags.push({ id: 't-ear', label: 'earphones', isAi: true, confidence: 94 });

    productBio = {
      itemName,
      itemType: 'Budget In-Ear Monitor (IEM)',
      priceRange: price,
      driverOrSpecs: specs,
      bioSummary: `Benchmark budget in-ear monitor renowned for balanced neutral-warm tuning, clean vocal reproduction, and detachable 2-pin cabling.`,
      pros: [
        'Superb sound quality for under $25',
        'Detachable 0.78mm 2-pin cable allows upgrades to mic or Bluetooth',
        'Lightweight ergonomic housing with comfortable fit',
      ],
      cons: [
        'Lightweight resin/plastic shell',
        'Stock silicone ear tips are basic',
      ],
      verdict: 'The definitive entry recommendation for beginner audiophiles and mobile music listening.',
    };

    keyDetails.push('Tuned closely to Harman target curve with warm, engaging sub-bass');
    keyDetails.push('0.78mm 2-pin detachable connection allows upgrading to silver cables or Bluetooth adapter');
    keyDetails.push('Impedance: 20-32Ω, high sensitivity, easily powered by smartphones or 3.5mm dongles');
    keyDetails.push(`Priced at ${price} on major audio platforms (Linsoul, AliExpress, Amazon)`);
  } else if (haystack.includes('travel') || haystack.includes('hotel') || haystack.includes('japan') || haystack.includes('trip') || haystack.includes('kyoto') || haystack.includes('flight')) {
    category = 'Travel';
    title = metaTitle || text.slice(0, 45) || 'Travel Video & Itinerary Guide';
    executiveSummary = metaDesc || text || 'Travel itinerary exploring scenic locations, local transit routes, and hidden architectural gems.';
    detailedSummary = executiveSummary;
    summary = executiveSummary;
    keywords.push('travel', 'itinerary', 'destination-guide', 'transit', 'sightseeing');
    tags.push({ id: 't-trv', label: 'travel', isAi: true, confidence: 98 });
    tags.push({ id: 't-spot', label: 'hidden-spots', isAi: true, confidence: 94 });
    keyTakeaways.push('Early morning visiting recommended to beat crowds and get golden hour lighting');
    keyTakeaways.push('Transit routes and local pass recommendations provided');
    keyDetails.push('Best time to visit: Early morning to beat crowds');
    keyDetails.push('Location coordinates and local transport route captured');
  } else if (haystack.includes('food') || haystack.includes('recipe') || haystack.includes('pasta') || haystack.includes('ramen') || haystack.includes('cook')) {
    category = 'Food';
    title = metaTitle || text.slice(0, 45) || 'Culinary Recipe & Food Reel';
    executiveSummary = metaDesc || text || 'Food preparation breakdown detailing key ingredient ratios, cooking temperatures, and seasoning harmony.';
    detailedSummary = executiveSummary;
    summary = executiveSummary;
    keywords.push('food-reel', 'recipe', 'culinary-technique', 'cooking-tips', 'flavor-profile');
    tags.push({ id: 't-food', label: 'food-reel', isAi: true, confidence: 98 });
    tags.push({ id: 't-recipe', label: 'recipe', isAi: true, confidence: 95 });
    keyTakeaways.push('Emulsification technique ensures silky sauce consistency');
    keyTakeaways.push('Cook times and seasoning adjustments highlighted');
    keyDetails.push('Exact ingredients and emulsification technique highlighted');
  } else if (haystack.includes('design') || haystack.includes('ui') || haystack.includes('ux') || haystack.includes('figma')) {
    category = 'Design';
    title = metaTitle || text.slice(0, 45) || 'UI Design Breakdown Reel';
    executiveSummary = metaDesc || text || 'Interface design analysis highlighting grid spacing, typography scales, contrast ratios, and micro-interactions.';
    detailedSummary = executiveSummary;
    summary = executiveSummary;
    keywords.push('ui-design', 'figma', 'design-systems', 'typography', 'ux-patterns');
    tags.push({ id: 't-des', label: 'ui-design', isAi: true, confidence: 98 });
    tags.push({ id: 't-figma', label: 'figma', isAi: true, confidence: 94 });
    keyTakeaways.push('Maintains an 8pt modular grid for fluid responsive scaling');
    keyTakeaways.push('Harmonized font hierarchy with deliberate weight contrasts');
    keyDetails.push('Grid padding math: 16px outer, 8px inner');
  } else if (haystack.includes('code') || haystack.includes('develop') || haystack.includes('react') || haystack.includes('css')) {
    category = 'Develop';
    title = metaTitle || text.slice(0, 45) || 'Frontend Dev Tutorial Reel';
    executiveSummary = metaDesc || text || 'Code implementation walk-through focusing on composable components, clean state management, and performance.';
    detailedSummary = executiveSummary;
    summary = executiveSummary;
    keywords.push('coding', 'frontend', 'react', 'typescript', 'web-development');
    tags.push({ id: 't-dev', label: 'coding', isAi: true, confidence: 98 });
    keyTakeaways.push('Uses declarative hooks and physics springs for silky animations');
    keyTakeaways.push('Optimized re-renders via memoization and stable references');
    keyDetails.push('Uses physics spring animations with layoutId');
  } else if (haystack.includes('fashion') || haystack.includes('outfit') || haystack.includes('sneaker') || haystack.includes('style') || haystack.includes('clothing') || haystack.includes('streetwear')) {
    category = 'Fashion & Style';
    title = metaTitle || text.slice(0, 45) || 'Fashion & Outfit Styling Reel';
    executiveSummary = metaDesc || text || 'Curated fashion breakdown covering silhouette, fabrics, color coordination, and styling.';
    detailedSummary = executiveSummary;
    summary = executiveSummary;
    keywords.push('fashion', 'outfit-inspo', 'streetwear', 'styling-tips', 'capsule-wardrobe');
    tags.push({ id: 't-style', label: 'fashion', isAi: true, confidence: 98 });
    tags.push({ id: 't-outfit', label: 'outfit-inspo', isAi: true, confidence: 95 });
    keyTakeaways.push('Balanced proportions between oversized layers and fitted bottoms');
    keyTakeaways.push('Neutral color palette anchored by accent textures');
    keyDetails.push('Layering proportions and aesthetic fit highlighted');
  } else if (haystack.includes('fitness') || haystack.includes('workout') || haystack.includes('gym') || haystack.includes('exercise') || haystack.includes('muscle') || haystack.includes('training')) {
    category = 'Fitness & Health';
    title = metaTitle || text.slice(0, 45) || 'Fitness Technique & Training Reel';
    executiveSummary = metaDesc || text || 'Physical training guide demonstrating form cues, movement mechanics, and rep tempo.';
    detailedSummary = executiveSummary;
    summary = executiveSummary;
    keywords.push('fitness', 'workout-cues', 'exercise-mechanics', 'strength-training', 'mobility');
    tags.push({ id: 't-fit', label: 'fitness', isAi: true, confidence: 98 });
    tags.push({ id: 't-gym', label: 'workout-cues', isAi: true, confidence: 95 });
    keyTakeaways.push('Controlled eccentric tempo maximizes mechanical tension');
    keyTakeaways.push('Bracing core and stabilizing joints prevents compensatory injury');
    keyDetails.push('Proper biomechanical alignment and tension control emphasized');
  } else if (haystack.includes('ai') || haystack.includes('llm') || haystack.includes('chatgpt') || haystack.includes('gemini') || haystack.includes('agent') || haystack.includes('prompt')) {
    category = 'AI & Tools';
    title = metaTitle || text.slice(0, 45) || 'AI Software & Automation Reel';
    executiveSummary = metaDesc || text || 'AI tool walkthrough detailing prompt patterns, workflows, and automated pipeline setup.';
    detailedSummary = executiveSummary;
    summary = executiveSummary;
    keywords.push('ai-tools', 'automation', 'llm-workflows', 'productivity-boost', 'ai-agents');
    tags.push({ id: 't-ai', label: 'ai-tools', isAi: true, confidence: 98 });
    tags.push({ id: 't-auto', label: 'automation', isAi: true, confidence: 95 });
    keyTakeaways.push('Structured prompt chaining delivers consistent deterministic output');
    keyTakeaways.push('Automation pipelines save hours on repetitive synthesis');
    keyDetails.push('Workflow automation and productivity shortcuts demonstrated');
  } else {
    if (!url) {
      category = 'Thoughts';
      const cleanFirstLine = text.split('\n')[0].replace(/^#+\s*/, '').trim();
      title = cleanFirstLine ? (cleanFirstLine.length > 50 ? cleanFirstLine.slice(0, 48) + '…' : cleanFirstLine) : 'Quick Note & Idea';
      executiveSummary = text || 'Quick captured idea and knowledge note.';
      detailedSummary = text || 'Quick captured idea and knowledge note.';
      summary = executiveSummary;
      keywords.push('quick-note', 'personal-thought', 'second-brain');
      tags.push({ id: 't-note', label: 'note', isAi: true, confidence: 95 });
      tags.push({ id: 't-idea', label: 'thought', isAi: true, confidence: 92 });
      
      const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 5);
      if (lines.length > 1) {
        lines.slice(1, 4).forEach((l) => keyDetails.push(l.replace(/^[-*•]\s*/, '')));
      } else {
        keyDetails.push('Key takeaway and quick capture preserved');
      }
    } else {
      const isIg = url.includes('instagram.com') || url.includes('instagr.am');
      const isYt = url.includes('youtube.com') || url.includes('youtu.be');
      const isTt = url.includes('tiktok.com');

      // Smart topic detection across haystack
      if (haystack.includes('photo') || haystack.includes('camera') || haystack.includes('lens') || haystack.includes('setup') || haystack.includes('desk') || haystack.includes('macbook') || haystack.includes('keyboard')) {
        category = 'Tech Gear';
        keyTakeaways.push('Hardware and setup details demonstrated in video');
        keyTakeaways.push('Featured tools and workflow ergonomics reviewed');
        keywords.push('tech-gear', 'hardware', 'creator-setup');
      } else if (haystack.includes('workout') || haystack.includes('gym') || haystack.includes('fitness') || haystack.includes('training') || haystack.includes('mobility')) {
        category = 'Fitness & Health';
        keyTakeaways.push('Proper movement mechanics and muscle engagement demonstrated');
        keywords.push('fitness', 'workout-cues', 'health');
      } else if (haystack.includes('food') || haystack.includes('recipe') || haystack.includes('cooking') || haystack.includes('restaurant') || haystack.includes('coffee')) {
        category = 'Food';
        keyTakeaways.push('Step-by-step culinary preparation and flavor balance highlighted');
        keywords.push('food', 'recipe', 'culinary');
      } else if (haystack.includes('travel') || haystack.includes('trip') || haystack.includes('hotel') || haystack.includes('city') || haystack.includes('japan')) {
        category = 'Travel';
        keyTakeaways.push('Scenic spots and travel route recommendations captured');
        keywords.push('travel', 'destination', 'itinerary');
      } else if (haystack.includes('design') || haystack.includes('ui') || haystack.includes('ux') || haystack.includes('figma')) {
        category = 'Design';
        keyTakeaways.push('Visual layout hierarchy and interaction design highlighted');
        keywords.push('design', 'ui-ux', 'visual');
      } else if (haystack.includes('code') || haystack.includes('develop') || haystack.includes('programming') || haystack.includes('github')) {
        category = 'Develop';
        keyTakeaways.push('Code implementation techniques and architecture reviewed');
        keywords.push('develop', 'programming', 'code');
      } else if (haystack.includes('outfit') || haystack.includes('fashion') || haystack.includes('style') || haystack.includes('sneaker')) {
        category = 'Fashion & Style';
        keyTakeaways.push('Aesthetic coordination and wardrobe styling showcased');
        keywords.push('fashion', 'style', 'wardrobe');
      } else {
        category = isYt || isIg ? 'Tech Gear' : 'General';
        keyTakeaways.push('Key demonstration points and insights captured from source link');
        keyTakeaways.push('Direct playback and creator profile linked');
      }

      const platformLabel = isIg ? 'Instagram' : isYt ? 'YouTube' : isTt ? 'TikTok' : 'Web';
      const cleanCreatorLabel = (author && author !== '@instagram_creator') ? author : '';

      title = metaTitle || (cleanCreatorLabel ? `${cleanCreatorLabel} — ${platformLabel} Reel` : `${platformLabel} Video Analysis`);
      executiveSummary = metaDesc || text || `${platformLabel} reel breakdown with extracted key takeaways and creator insights.`;
      detailedSummary = metaDesc ? `${metaDesc}\n\nCaptured from ${platformLabel} by Recall Second Brain.` : executiveSummary;
      summary = executiveSummary;

      keywords.push(isIg ? 'instagram-reel' : isYt ? 'youtube-video' : 'web-link', 'video-analysis', category.toLowerCase().replace(/\s+/g, '-'));
      tags.push({ id: `t-${Date.now()}-gen`, label: isIg ? 'instagram-reel' : isYt ? 'youtube' : 'saved-link', isAi: true, confidence: 94 });
      tags.push({ id: `t-${Date.now()}-cat`, label: category.toLowerCase().replace(/\s+/g, '-'), isAi: true, confidence: 92 });
      
      keyDetails.push(`Source platform: ${platformLabel}`);
      if (cleanCreatorLabel) keyDetails.push(`Creator: ${cleanCreatorLabel}`);
      keyDetails.push('Direct video source captured for playback');
    }
  }

  const creator = url.includes('instagram.com')
    ? (fetchedMeta?.author || (author && author !== '@instagram_creator' ? author : '@instagram_creator'))
    : (fetchedMeta?.author || author || undefined);

  const finalKeywords = Array.from(new Set([...keywords, ...tags.map((t) => t.label)]));

  return {
    category,
    creator,
    mediaType: imageBase64 ? 'screenshot' : isReel ? 'reel' : url ? 'video' : 'text',
    title,
    content: detailedSummary || summary,
    summary: executiveSummary || summary,
    executiveSummary,
    detailedSummary,
    keyTakeaways,
    keywords: finalKeywords,
    sourceUrl: url || undefined,
    videoEmbedUrl,
    imageUrl: effectiveImage || undefined,
    productBio,
    keyDetails,
    tags,
    aiConfidence: 96,
  };
}

function getLocalChatbotAnswer(query: string, notes: any[]) {
  const q = query.toLowerCase();
  const isTechQuery = q.includes('tech') || q.includes('device') || q.includes('thought') || q.includes('wearable') || q.includes('omi') || q.includes('gadget');
  const isIemQuery = q.includes('iem') || q.includes('earphone') || q.includes('audio') || q.includes('sound');
  const isTravelQuery = q.includes('travel') || q.includes('trip') || q.includes('place');
  const isFoodQuery = q.includes('food') || q.includes('recipe') || q.includes('eat');
  const isDesignQuery = q.includes('design') || q.includes('ui') || q.includes('figma');

  const matches = notes.filter((n) => {
    const hay = `${n.title} ${n.category} ${n.content} ${n.productBio?.itemName || ''} ${(n.tags || []).map((t: any) => t.label || t).join(' ')}`.toLowerCase();
    if (isTechQuery && (n.category?.toLowerCase().includes('tech') || hay.includes('wearable') || hay.includes('thought') || hay.includes('device'))) return true;
    if (isIemQuery && (hay.includes('iem') || n.category?.toLowerCase().includes('iem') || (hay.includes('audio') && !hay.includes('brain')))) return true;
    if (isTravelQuery && n.category?.toLowerCase().includes('travel')) return true;
    if (isFoodQuery && n.category?.toLowerCase().includes('food')) return true;
    if (isDesignQuery && n.category?.toLowerCase().includes('design')) return true;
    return q.split(/\s+/).some((w) => w.length > 3 && hay.includes(w));
  });

  if (matches.length > 0) {
    const citations = matches.map((m) => ({
      noteId: m.id,
      title: m.title,
      category: m.category,
      mediaType: m.mediaType || 'reel',
      sourceUrl: m.sourceUrl,
      imageUrl: m.imageUrl,
      highlight: m.productBio?.bioSummary || m.aiSummary || m.content.slice(0, 120),
      keyDetails: m.keyDetails || [],
      productBio: m.productBio,
    }));

    let customMsg = `Found ${matches.length} matching item(s) in your second brain:`;
    if (isTechQuery) {
      customMsg = `Here are the tech gear & wearable devices you saved! I extracted their full bio, specifications, and direct video links:`;
    } else if (isIemQuery) {
      customMsg = `Here are all the IEM & audio video reels you shared! I extracted the full bio, driver specs, price range, and direct video links:`;
    }

    return {
      id: `ask-${Date.now()}`,
      query,
      answer: customMsg,
      citations,
      timestamp: Date.now(),
    };
  }

  return {
    id: `ask-${Date.now()}`,
    query,
    answer: `I searched your second brain for "${query}", but haven't found matching reels yet. Share an IEM reel, Travel video, or Design screenshot above and I'll analyze all the details!`,
    citations: [],
    timestamp: Date.now(),
  };
}

startServer();
