
export type Language = 'en' | 'jp' | 'mm' | 'vi';

export interface JapaneseSegment {
  text: string;
  ruby?: string;
}

export interface TranslationResult {
  en?: string;
  jp?: JapaneseSegment[];
  mm?: string;
  vi?: string;
  detectedLanguage: Language;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  originalText: string;
  sourceLang: Language;
  results: TranslationResult;
}
