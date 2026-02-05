
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Delete, Trash2, Undo2, Loader2, Keyboard } from 'lucide-react';
import { recognizeHandwriting } from '../services/geminiService';

interface KanjiKeyboardProps {
  onInsert: (char: string) => void;
  onDeleteChar: () => void;
  onClose: () => void;
}

export const KanjiKeyboard: React.FC<KanjiKeyboardProps> = ({ onInsert, onDeleteChar, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrores] = useState<ImageData[]>([]);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const recognitionTimeout = useRef<number | null>(null);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setStrores([]);
    setCandidates([]);
  };

  const saveStroke = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setStrores(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const undoLastStroke = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || strokes.length === 0) return;

    const newStrokes = [...strokes];
    newStrokes.pop();
    setStrores(newStrokes);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (newStrokes.length > 0) {
      ctx.putImageData(newStrokes[newStrokes.length - 1], 0, 0);
    }
    triggerRecognition();
  };

  const triggerRecognition = useCallback(() => {
    if (recognitionTimeout.current) window.clearTimeout(recognitionTimeout.current);
    
    recognitionTimeout.current = window.setTimeout(async () => {
      const canvas = canvasRef.current;
      if (!canvas || strokes.length === 0) return;

      setIsRecognizing(true);
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const results = await recognizeHandwriting(dataUrl);
        setCandidates(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsRecognizing(false);
      }
    }, 800);
  }, [strokes]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1e293b';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveStroke();
    triggerRecognition();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 bg-white border-t-2 border-slate-200 z-50 shadow-2xl animate-in slide-in-from-bottom duration-300">
      <div className="max-w-md mx-auto relative p-4 flex flex-col gap-4">
        
        {/* Candidate Bar */}
        <div className="h-12 bg-slate-50 rounded-xl border border-slate-100 flex items-center px-2 overflow-x-auto gap-2">
          {isRecognizing && <Loader2 className="animate-spin text-indigo-500 ml-2" size={16} />}
          {!isRecognizing && candidates.length === 0 && strokes.length > 0 && <span className="text-[10px] text-slate-400 ml-2 italic">Thinking...</span>}
          {!isRecognizing && candidates.map((char, i) => (
            <button
              key={i}
              onClick={() => {
                onInsert(char);
                clearCanvas();
              }}
              className="min-w-[40px] h-10 flex items-center justify-center text-xl font-bold text-slate-700 hover:bg-indigo-100 rounded-lg transition-colors active:scale-90"
            >
              {char}
            </button>
          ))}
        </div>

        {/* Drawing Area Container */}
        <div className="relative aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 overflow-hidden group">
          {/* Subtle Grid Lines */}
          <div className="absolute inset-0 pointer-events-none grid grid-cols-2 grid-rows-2 opacity-10">
            <div className="border-r border-b border-slate-400"></div>
            <div className="border-b border-slate-400"></div>
            <div className="border-r border-slate-400"></div>
            <div></div>
          </div>

          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full cursor-crosshair touch-none"
          />

          {/* Top Left: Back to Normal Keyboard */}
          <button
            onClick={onClose}
            className="absolute top-3 left-3 w-10 h-10 bg-white shadow-md rounded-xl flex items-center justify-center text-slate-600 hover:text-indigo-600 transition-colors"
            title="Normal Keyboard"
          >
            <Keyboard size={20} />
          </button>

          {/* Top Right: Back Delete Key (Delete from text area) */}
          <button
            onClick={onDeleteChar}
            className="absolute top-3 right-3 w-10 h-10 bg-white shadow-md rounded-xl flex items-center justify-center text-slate-600 hover:text-red-500 transition-colors"
            title="Backspace"
          >
            <Delete size={20} />
          </button>

          {/* Bottom Left: Clear Draw */}
          <button
            onClick={clearCanvas}
            className="absolute bottom-3 left-3 w-10 h-10 bg-white shadow-md rounded-xl flex items-center justify-center text-slate-600 hover:text-red-500 transition-colors"
            title="Clear Drawing"
          >
            <Trash2 size={20} />
          </button>

          {/* Bottom Right: Delete Last Stroke */}
          <button
            onClick={undoLastStroke}
            className="absolute bottom-3 right-3 w-10 h-10 bg-white shadow-md rounded-xl flex items-center justify-center text-slate-600 hover:text-amber-500 transition-colors"
            title="Undo Stroke"
          >
            <Undo2 size={20} />
          </button>
        </div>

        <div className="text-[10px] text-center text-slate-400 font-medium pb-2 uppercase tracking-widest">
          Draw Kanji to Search
        </div>
      </div>
    </div>
  );
};
