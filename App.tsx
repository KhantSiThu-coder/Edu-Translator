
import React, { useState, useEffect } from 'react';
import { Languages, Send, Loader2, Sparkles, History as HistoryIcon, GraduationCap, User, CheckCircle2, Pencil } from 'lucide-react';
import { HistoryItem, TranslationResult, Language } from './types';
import { translateAndAnalyze } from './services/geminiService';
import { FuriganaText } from './components/FuriganaText';
import { KanjiKeyboard } from './components/KanjiKeyboard';
import HistorySidebar from './components/HistorySidebar';

const STORAGE_KEY = 'trilingua_history';

const LANGUAGES_CONFIG: { code: Language; label: string; native: string; color: string; bg: string }[] = [
  { code: 'en', label: 'English', native: 'English', color: 'text-blue-600', bg: 'bg-blue-50' },
  { code: 'jp', label: 'Japanese', native: '日本語', color: 'text-rose-600', bg: 'bg-rose-50' },
  { code: 'mm', label: 'Myanmar', native: 'မြန်မာ', color: 'text-amber-600', bg: 'bg-amber-50' },
  { code: 'vi', label: 'Vietnamese', native: 'Tiếng Việt', color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<TranslationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isKanjiKeyboardOpen, setIsKanjiKeyboardOpen] = useState(false);
  const [selectedLangs, setSelectedLangs] = useState<Language[]>(['en', 'jp', 'mm']);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  // Save history whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const toggleLanguage = (code: Language) => {
    setSelectedLangs(prev => {
      if (prev.includes(code)) {
        if (prev.length <= 2) return prev; // Min 2
        return prev.filter(l => l !== code);
      } else {
        if (prev.length >= 3) {
          return [...prev.slice(1), code];
        }
        return [...prev, code];
      }
    });
  };

  const handleTranslate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const result = await translateAndAnalyze(inputText, selectedLangs);
      setCurrentResult(result);

      const newItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        originalText: inputText,
        sourceLang: result.detectedLanguage,
        results: result,
      };
      
      setHistory(prev => [newItem, ...prev.slice(0, 49)]);
    } catch (error) {
      console.error("Translation error:", error);
      alert("Failed to translate. Please check your network or API key.");
    } finally {
      setIsLoading(false);
    }
  };

  const insertKanji = (char: string) => {
    setInputText(prev => prev + char);
  };

  const deleteLastChar = () => {
    setInputText(prev => prev.slice(0, -1));
  };

  const selectFromHistory = (item: HistoryItem) => {
    setInputText(item.originalText);
    setCurrentResult(item.results);
    
    const resultLangs: Language[] = [];
    if (item.results.en) resultLangs.push('en');
    if (item.results.jp) resultLangs.push('jp');
    if (item.results.mm) resultLangs.push('mm');
    if (item.results.vi) resultLangs.push('vi');
    if (resultLangs.length > 0) setSelectedLangs(resultLangs);

    if (window.innerWidth < 768) setShowHistory(false);
  };

  const deleteFromHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    if (confirm("Clear all translation history?")) {
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-slate-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">Trilingua</h1>
              <p className="text-xs text-slate-500 font-medium">Multi-Language Educational Tool</p>
            </div>
          </div>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          >
            <HistoryIcon size={24} />
          </button>
        </header>

        {/* Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {/* Input Section */}
          <section className="max-w-4xl mx-auto w-full space-y-4">
            <div className="relative group">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter text to translate..."
                className="w-full h-32 md:h-40 p-5 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all resize-none bg-white text-lg shadow-sm group-hover:shadow-md"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleTranslate();
                  }
                }}
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <button
                  onClick={() => setIsKanjiKeyboardOpen(true)}
                  className="bg-white border-2 border-slate-200 hover:border-indigo-500 text-slate-600 hover:text-indigo-600 p-2.5 rounded-xl transition-all shadow-sm active:scale-95"
                  title="Kanji Handwriting"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => handleTranslate()}
                  disabled={isLoading || !inputText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg active:scale-95"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  Translate
                </button>
              </div>
            </div>

            {/* Language Selector */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Target Languages (Select 2-3):</span>
              {LANGUAGES_CONFIG.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => toggleLanguage(lang.code)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all text-sm font-semibold ${
                    selectedLangs.includes(lang.code)
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                  }`}
                >
                  {selectedLangs.includes(lang.code) && <CheckCircle2 size={14} />}
                  {lang.native}
                </button>
              ))}
            </div>
          </section>

          {/* Results Display */}
          {(currentResult || isLoading) && (
            <section className="max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32 md:pb-0">
              <div className={`grid grid-cols-1 md:grid-cols-${selectedLangs.length} gap-6`}>
                {selectedLangs.map((langCode) => {
                  const config = LANGUAGES_CONFIG.find(c => c.code === langCode)!;
                  return (
                    <div key={langCode} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors relative overflow-hidden flex flex-col min-h-[160px]">
                      {langCode === 'jp' && !isLoading && (
                        <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
                          <Sparkles size={48} className="text-indigo-600" />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center ${config.color} font-bold text-xs`}>
                          {langCode.toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-600 uppercase tracking-wider text-sm">{config.label}</span>
                      </div>
                      
                      <div className="flex-1">
                        {isLoading ? (
                          <div className="space-y-2 animate-pulse">
                            <div className="h-4 bg-slate-100 rounded w-full"></div>
                            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                          </div>
                        ) : (
                          <>
                            {langCode === 'jp' && currentResult?.jp && (
                              <FuriganaText segments={currentResult.jp} />
                            )}
                            {langCode === 'en' && (
                              <div className="text-xl text-slate-800 leading-relaxed font-medium">
                                {currentResult?.en}
                              </div>
                            )}
                            {langCode === 'mm' && (
                              <div className="text-xl text-slate-800 leading-loose font-mm">
                                {currentResult?.mm}
                              </div>
                            )}
                            {langCode === 'vi' && (
                              <div className="text-xl text-slate-800 leading-relaxed font-medium">
                                {currentResult?.vi}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {!currentResult && !isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
              <div className="bg-slate-100 p-6 rounded-full">
                <Languages size={64} className="opacity-20" />
              </div>
              <p className="text-lg font-medium text-center px-4">Translate and learn across multiple languages</p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t p-4 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-2 text-[10px] md:text-xs text-slate-400 font-medium">
            <span>Trilingua Educational Tool</span>
            <span className="opacity-30">•</span>
            <span>Powered by Gemini API</span>
          </div>
          <a 
            href="https://click.ecc.ac.jp/ecc/khant_si_thu/portfolio/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-all duration-300 group"
          >
            <div className="bg-slate-100 group-hover:bg-indigo-50 p-1.5 rounded-lg transition-colors">
              <User size={18} strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight">Portfolio</span>
          </a>
        </footer>
      </div>

      {/* Handwriting Keyboard Panel */}
      {isKanjiKeyboardOpen && (
        <KanjiKeyboard
          onInsert={insertKanji}
          onDeleteChar={deleteLastChar}
          onClose={() => setIsKanjiKeyboardOpen(false)}
        />
      )}

      {/* History Sidebar */}
      <div className={`
        ${showHistory ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        ${!showHistory && 'md:w-0 overflow-hidden'}
        fixed inset-y-0 right-0 z-20 md:relative md:z-0
        transition-all duration-300 ease-in-out
      `}>
        <HistorySidebar 
          history={history} 
          onSelect={selectFromHistory}
          onDelete={deleteFromHistory}
          onClear={clearHistory}
        />
      </div>

      {showHistory && (
        <div className="fixed inset-0 bg-black/20 z-10 md:hidden" onClick={() => setShowHistory(false)} />
      )}

      {/* History Toggle Button */}
      <button 
        onClick={() => setShowHistory(!showHistory)}
        className="hidden md:flex fixed bottom-8 right-8 bg-white text-slate-600 w-14 h-14 rounded-full items-center justify-center shadow-xl hover:bg-indigo-600 hover:text-white transition-all z-30 group"
        title="Study History"
      >
        <HistoryIcon size={24} className="group-hover:rotate-12 transition-transform" />
        {history.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border-2 border-white">
            {history.length}
          </span>
        )}
      </button>
    </div>
  );
};

export default App;
