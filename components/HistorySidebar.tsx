
import React from 'react';
import { HistoryItem } from '../types';
import { Clock, Trash2, ArrowRight } from 'lucide-react';

interface HistorySidebarProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
  onDelete: (id: string) => void;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({ history, onSelect, onClear, onDelete }) => {
  return (
    <div className="bg-white border-l h-full flex flex-col w-full md:w-80 shadow-sm">
      <div className="p-4 border-b flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <Clock size={18} />
          <span>Study History</span>
        </div>
        {history.length > 0 && (
          <button 
            onClick={onClear}
            className="text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <p className="text-sm">No recent translations yet.</p>
            <p className="text-xs mt-1">Start translating to save cards.</p>
          </div>
        ) : (
          <div className="divide-y">
            {history.map((item) => (
              <div 
                key={item.id}
                className="p-4 hover:bg-indigo-50 cursor-pointer group transition-all relative"
                onClick={() => onSelect(item)}
              >
                <div className="pr-8">
                  <p className="text-xs font-medium text-indigo-600 mb-1">
                    {item.sourceLang.toUpperCase()} Translation
                  </p>
                  <p className="text-sm text-slate-800 line-clamp-2 leading-relaxed">
                    {item.originalText}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-2">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </button>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all text-indigo-400">
                  <ArrowRight size={14} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistorySidebar;
