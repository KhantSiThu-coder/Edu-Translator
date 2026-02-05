
export type Language = 'en' | 'jp' | 'mm' | 'vi' | 'zh';

export interface PhoneticSegment {
  text: string;
  ruby?: string; // Furigana for JP, Pinyin for ZH
}

export interface TranslationResult {
  en?: string;
  jp?: PhoneticSegment[];
  mm?: string;
  vi?: string;
  zh?: PhoneticSegment[];
  detectedLanguage: Language;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  originalText: string;
  sourceLang: Language;
  results: TranslationResult;
}
