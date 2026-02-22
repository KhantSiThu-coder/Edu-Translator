
import React, { useState, useEffect } from 'react';
import { Languages, Send, Loader2, Sparkles, History as HistoryIcon, GraduationCap, User, CheckCircle2, Pencil, AlertCircle, X, Zap } from 'lucide-react';
import { HistoryItem, TranslationResult, Language } from './types';
import { translateAndAnalyze } from './services/geminiService';
import { PhoneticText } from './components/FuriganaText';
import { KanjiKeyboard } from './components/KanjiKeyboard';
import HistorySidebar from './components/HistorySidebar';

const STORAGE_KEY = 'trilingua_history';

const LANGUAGES_CONFIG: { code: Language; label: string; native: string; color: string; bg: string }[] = [
  { code: 'en', label: 'English', native: 'English', color: 'text-blue-600', bg: 'bg-blue-50' },
  { code: 'jp', label: 'Japanese', native: '日本語', color: 'text-rose-600', bg: 'bg-rose-50' },
  { code: 'zh', label: '中文', native: '中文', color: 'text-orange-600', bg: 'bg-orange-50' },
  { code: 'mm', label: 'Myanmar', native: 'မြန်မာ', color: 'text-amber-600', bg: 'bg-amber-50' },
  { code: 'vi', label: 'Vietnamese', native: 'Tiếng Việt', color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFromCache, setIsFromCache] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<TranslationResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isKanjiKeyboardOpen, setIsKanjiKeyboardOpen] = useState(false);
  const [selectedLangs, setSelectedLangs] = useState<Language[]>(['en', 'jp', 'mm']);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const toggleLanguage = (code: Language) => {
    setSelectedLangs(prev => {
      if (prev.includes(code)) {
        if (prev.length <= 2) return prev;
        return prev.filter(l => l !== code);
      } else {
        if (prev.length >= 3) return [...prev.slice(1), code];
        return [...prev, code];
      }
    });
  };

  const handleTranslate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);
    setIsFromCache(false);
    
    try {
      const { result, fromCache } = await translateAndAnalyze(inputText, selectedLangs);
      setCurrentResult(result);
      setIsFromCache(fromCache);

      const isDuplicate = history.some(h => 
        h.originalText.trim().toLowerCase() === inputText.trim().toLowerCase() && 
        JSON.stringify(h.results) === JSON.stringify(result)
      );

      if (!isDuplicate) {
        const newItem: HistoryItem = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          originalText: inputText,
          sourceLang: result.detectedLanguage,
          results: result,
        };
        setHistory(prev => [newItem, ...prev.slice(0, 49)]);
      }
    } catch (error: any) {
      if (error.message === 'RATE_LIMIT') {
        setErrorMsg("API Rate Limit Reached. Please wait a minute and try again.");
      } else if (error.message.includes("GEMINI_API_KEY")) {
        setErrorMsg("API Key missing. Please ensure GEMINI_API_KEY is configured.");
      } else {
        setErrorMsg(`Translation error: ${error.message || "Please check your connection."}`);
      }
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const insertKanji = (char: string) => setInputText(prev => prev + char);
  const deleteLastChar = () => setInputText(prev => prev.slice(0, -1));

  const selectFromHistory = (item: HistoryItem) => {
    setInputText(item.originalText);
    setCurrentResult(item.results);
    setIsFromCache(true);
    setErrorMsg(null);
    const resultLangs: Language[] = [];
    if (item.results.en) resultLangs.push('en');
    if (item.results.jp) resultLangs.push('jp');
    if (item.results.zh) resultLangs.push('zh');
    if (item.results.mm) resultLangs.push('mm');
    if (item.results.vi) resultLangs.push('vi');
    if (resultLangs.length > 0) setSelectedLangs(resultLangs);
    if (window.innerWidth < 768) setShowHistory(false);
  };

  const deleteFromHistory = (id: string) => setHistory(prev => prev.filter(item => item.id !== id));
  const clearHistory = () => { if (confirm("Clear all translation history?")) setHistory([]); };

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-slate-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-tight">Trilingua</h1>
              <p className="text-xs text-slate-500 font-medium">Educational Polyglot Tool</p>
            </div>
          </div>
          <button onClick={() => setShowHistory(!showHistory)} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-full">
            <HistoryIcon size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          <section className="max-w-4xl mx-auto w-full space-y-4">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <AlertCircle size={20} />
                  <p className="text-sm font-medium">{errorMsg}</p>
                </div>
                <button onClick={() => setErrorMsg(null)} className="hover:bg-rose-100 p-1 rounded-full transition-colors">
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="relative group">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Enter text to translate..."
                className="w-full h-32 md:h-40 p-5 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all resize-none bg-white text-lg shadow-sm"
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <button onClick={() => setIsKanjiKeyboardOpen(true)} className="bg-white border-2 border-slate-200 hover:border-indigo-500 text-slate-600 p-2.5 rounded-xl transition-all shadow-sm">
                  <Pencil size={18} />
                </button>
                <button onClick={() => handleTranslate()} disabled={isLoading || !inputText.trim()} className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg relative group overflow-hidden">
                  <div className="flex items-center gap-2 relative z-10">
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                    Translate
                  </div>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-2">Target:</span>
                {LANGUAGES_CONFIG.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => toggleLanguage(lang.code)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all text-sm font-semibold ${
                      selectedLangs.includes(lang.code) ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-400'
                    }`}
                  >
                    {selectedLangs.includes(lang.code) && <CheckCircle2 size={14} />}
                    {lang.native}
                  </button>
                ))}
              </div>
              
              {isFromCache && !isLoading && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-bold uppercase tracking-wider animate-in fade-in zoom-in">
                  <Zap size={10} fill="currentColor" />
                  Cached
                </div>
              )}
            </div>
          </section>

          {(currentResult || isLoading) && (
            <section className="max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32 md:pb-0">
              <div className={`grid grid-cols-1 md:grid-cols-${selectedLangs.length} gap-6`}>
                {selectedLangs.map((langCode) => {
                  const config = LANGUAGES_CONFIG.find(c => c.code === langCode)!;
                  return (
                    <div key={langCode} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors relative overflow-hidden min-h-[160px]">
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center ${config.color} font-bold text-xs`}>
                          {langCode === 'zh' ? 'ZH' : langCode.toUpperCase()}
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
                              <PhoneticText segments={currentResult.jp} langClass="font-jp" />
                            )}
                            {langCode === 'zh' && currentResult?.zh && (
                              <PhoneticText segments={currentResult.zh} langClass="font-jp" />
                            )}
                            {langCode === 'en' && (
                              <div className="text-xl text-slate-800 leading-relaxed font-medium">{currentResult?.en}</div>
                            )}
                            {langCode === 'mm' && (
                              <div className="text-xl text-slate-800 leading-loose font-mm">{currentResult?.mm}</div>
                            )}
                            {langCode === 'vi' && (
                              <div className="text-xl text-slate-800 leading-relaxed font-medium">{currentResult?.vi}</div>
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
        </main>

        <footer className="bg-white border-t p-4 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-2 text-[10px] md:text-xs text-slate-400 font-medium">
            <span>Trilingua Educational Tool</span>
            <span className="opacity-30">•</span>
            <span>Powered by Gemini 3</span>
          </div>
          <a href="https://click.ecc.ac.jp/ecc/khant_si_thu/portfolio/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-all group">
            <div className="bg-slate-100 group-hover:bg-indigo-50 p-1.5 rounded-lg">
              <User size={18} strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight">Portfolio</span>
          </a>
        </footer>
      </div>

      {isKanjiKeyboardOpen && (
        <KanjiKeyboard onInsert={insertKanji} onDeleteChar={deleteLastChar} onClose={() => setIsKanjiKeyboardOpen(false)} />
      )}

      <div className={`
        ${showHistory ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
        ${!showHistory && 'md:w-0 overflow-hidden'}
        fixed inset-y-0 right-0 z-20 md:relative md:z-0 transition-all duration-300
      `}>
        <HistorySidebar history={history} onSelect={selectFromHistory} onDelete={deleteFromHistory} onClear={clearHistory} />
      </div>

      {showHistory && <div className="fixed inset-0 bg-black/20 z-10 md:hidden" onClick={() => setShowHistory(false)} />}
      
      <button onClick={() => setShowHistory(!showHistory)} className="hidden md:flex fixed bottom-8 right-8 bg-white text-slate-600 w-14 h-14 rounded-full items-center justify-center shadow-xl hover:bg-indigo-600 hover:text-white transition-all z-30 group">
        <HistoryIcon size={24} className="group-hover:rotate-12 transition-transform" />
      </button>
    </div>
  );
};

export default App;
