
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult, Language } from "../types";

const CACHE_STORAGE_KEY = 'trilingua_api_cache_v2';
const MAX_CACHE_SIZE = 100;

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set. Please configure it in the environment.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

// Helper to manage persistent cache
const getCache = (): Record<string, { result: TranslationResult; timestamp: number }> => {
  try {
    return JSON.parse(localStorage.getItem(CACHE_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const setCache = (key: string, result: TranslationResult) => {
  try {
    const cache = getCache();
    cache[key] = { result, timestamp: Date.now() };
    
    // Simple LRU: if cache too big, remove oldest
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_SIZE) {
      const oldestKey = keys.reduce((a, b) => cache[a].timestamp < cache[b].timestamp ? a : b);
      delete cache[oldestKey];
    }
    
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn("Cache save failed", e);
  }
};

const generateCacheKey = (text: string, langs: Language[]) => {
  const normalizedText = text.trim().toLowerCase();
  const sortedLangs = [...langs].sort().join(',');
  return `${normalizedText}_to_${sortedLangs}`;
};

export const translateAndAnalyze = async (
  text: string, 
  targetLangs: Language[]
): Promise<{ result: TranslationResult; fromCache: boolean }> => {
  const cacheKey = generateCacheKey(text, targetLangs);
  const cache = getCache();

  // 1. Check Cache First
  if (cache[cacheKey]) {
    console.log("Serving from cache:", cacheKey);
    return { result: cache[cacheKey].result, fromCache: true };
  }

  // 2. Call API if not in cache
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate the following text into these languages: ${targetLangs.join(', ')}. 
      
      CRITICAL INSTRUCTION:
      - For Japanese (jp): Provide segments with Furigana.
      - For Traditional Chinese (zh): Ensure the vocabulary is natural for Taiwan/Hong Kong. DO NOT simply reuse Japanese Kanji. 
      - The 'text' property MUST ONLY contain the original characters. DO NOT include readings in brackets like "日本語(にほんご)" in the 'text' property.
      - Provide Traditional Chinese segments with Pinyin (phonetic reading).
      
      Text to translate: "${text}"`,
      config: {
        systemInstruction: `You are an expert multilingual educational translator specializing in the nuances between Japanese (Kanji) and Traditional Chinese (Hanzi). 
        Accuracy and regional naturalness are critical. 
        - DO NOT allow Japanese "Wasei-Kango" (Japanese-made Chinese words) to bleed into the Traditional Chinese translation. 
        - For Traditional Chinese (Taiwan/HK), use terms that native speakers use. For example, use '產業' for the general concept of 'Industry' instead of '工業'.
        - For Japanese, provide furigana (ruby) for all Kanji.
        - For Traditional Chinese, provide Pinyin for the characters in the ruby property.
        - IMPORTANT: The 'text' property should contain ONLY the characters to be displayed. NEVER include phonetic readings in brackets (e.g., "漢字(かんじ)") inside the 'text' property. The reading goes exclusively in the 'ruby' property.
        - For Vietnamese, ensure proper diacritics.
        - For Myanmar, ensure correct Burmese script usage.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedLanguage: {
              type: Type.STRING,
              enum: ["en", "jp", "mm", "vi", "zh"]
            },
            en: { type: Type.STRING },
            jp: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  ruby: { type: Type.STRING, description: "Furigana" }
                },
                required: ["text"]
              }
            },
            zh: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  ruby: { type: Type.STRING, description: "Pinyin" }
                },
                required: ["text"]
              }
            },
            mm: { type: Type.STRING },
            vi: { type: Type.STRING }
          },
          required: ["detectedLanguage"]
        }
      }
    });

    const jsonStr = response.text?.trim() || "{}";
    const result = JSON.parse(jsonStr) as TranslationResult;
    
    // Client-side cleanup: Remove readings in brackets if the model included them in 'text'
    const bracketRegex = /[\(\（][^\)\）]+[\)\）]/g;
    if (result.jp) {
      result.jp = result.jp.map(s => ({
        ...s,
        text: s.text.replace(bracketRegex, '')
      }));
    }
    if (result.zh) {
      result.zh = result.zh.map(s => ({
        ...s,
        text: s.text.replace(bracketRegex, '')
      }));
    }
    
    // 3. Save to Cache
    setCache(cacheKey, result);
    
    return { result, fromCache: false };
  } catch (error: any) {
    const msg = error.message?.toLowerCase() || "";
    if (msg.includes("quota") || msg.includes("429") || msg.includes("limit")) {
      throw new Error("RATE_LIMIT");
    }
    throw error;
  }
};

export const recognizeHandwriting = async (base64Image: string): Promise<string[]> => {
  const imagePart = {
    inlineData: {
      mimeType: 'image/png',
      data: base64Image.split(',')[1],
    },
  };

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          imagePart,
          { text: "Identify the handwritten character. Return top 5 likely characters as a JSON array of strings." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    const text = response.text || "[]";
    return JSON.parse(text) as string[];
  } catch (e) {
    return [];
  }
};
