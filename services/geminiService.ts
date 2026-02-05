
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const CACHE_STORAGE_KEY = 'trilingua_api_cache_v1';
const MAX_CACHE_SIZE = 100;

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
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Translate the following text into these languages: ${targetLangs.join(', ')}. 
      
      CRITICAL INSTRUCTION:
      - For Japanese (jp): Provide segments with Furigana.
      - For Traditional Chinese (zh): Use natural vocabulary for Taiwan/Hong Kong. DO NOT use Japanese-specific vocabulary. For example, use '任務' or '作業' for 'assignment/task' instead of the Japanese '課題'. Provide segments with Pinyin (phonetic reading).
      
      Text to translate: "${text}"`,
      config: {
        systemInstruction: `You are an expert multilingual educational translator. 
        Accuracy and natural vocabulary are critical. 
        - Distinguish clearly between Japanese and Chinese vocabulary. Even if they share Kanji/Hanzi, use the word that is most natural in that specific language. 
        - For Japanese, provide furigana for all Kanji.
        - For Traditional Chinese, provide Pinyin for the characters.
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

    const jsonStr = response.text.trim();
    const result = JSON.parse(jsonStr) as TranslationResult;
    
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
    return JSON.parse(response.text) as string[];
  } catch (e) {
    return [];
  }
};
