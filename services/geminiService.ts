
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const translateAndAnalyze = async (text: string, targetLangs: Language[]): Promise<TranslationResult> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Translate the following text into these specific languages: ${targetLangs.join(', ')}. 
    
    For the Japanese translation (if requested), provide it as a structured array of segments where each segment represents a word or phrase, and include furigana (hiragana reading) for any Kanji used.
    
    Text to translate: "${text}"`,
    config: {
      systemInstruction: `You are an expert multilingual educational translator specializing in English, Japanese, Myanmar, and Vietnamese. 
      Accuracy is critical for educational purposes. 
      Ensure Japanese Furigana (ruby) uses the standard modern readings. 
      Common Mistake Check: The kanji '椅子' (chair) must ALWAYS have the furigana 'いす' (isu), NEVER 'いし' (ishi). 
      For Vietnamese, ensure proper diacritics and formal tone.
      Return ONLY the translations for the languages explicitly requested in the prompt.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detectedLanguage: {
            type: Type.STRING,
            description: "The ISO code of the detected language (en, jp, mm, or vi)",
            enum: ["en", "jp", "mm", "vi"]
          },
          en: { type: Type.STRING },
          jp: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                ruby: { type: Type.STRING }
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
  return JSON.parse(jsonStr) as TranslationResult;
};

export const recognizeHandwriting = async (base64Image: string): Promise<string[]> => {
  const imagePart = {
    inlineData: {
      mimeType: 'image/png',
      data: base64Image.split(',')[1],
    },
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        imagePart,
        { text: "Identify the handwritten Kanji in this image. Provide the top 5 most likely characters as a simple JSON array of strings. Return ONLY the JSON." }
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

  try {
    return JSON.parse(response.text) as string[];
  } catch (e) {
    console.error("Failed to parse recognition results", e);
    return [];
  }
};
