import React from 'react';
import { motion } from 'motion/react';
import { Swords, ChevronRight, Zap } from 'lucide-react';

interface QuickStartScreenProps {
  onStartPlayMode: () => void;
}

export const QuickStartScreen: React.FC<QuickStartScreenProps> = ({ onStartPlayMode }) => {
  return (
    <div className="flex-1 flex flex-col bg-[#F5F5F0] min-h-screen">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#141414]/10 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <h1 className="text-xl font-black text-[#141414] tracking-tight uppercase">Quick Start</h1>
          <Zap size={20} className="text-amber-500" />
        </div>
      </header>

      <div className="max-w-md mx-auto w-full p-6 space-y-6">
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-stone-200/50 border border-stone-100 flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500">
            <Swords size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-[#141414] tracking-tight uppercase">Play Mode</h2>
            <p className="text-stone-500 text-sm leading-relaxed">
              Start a game session to track your resources, hand, and follow the setup guide.
            </p>
          </div>
          
          <button 
            onClick={onStartPlayMode}
            className="w-full py-4 bg-[#141414] text-white rounded-2xl flex items-center justify-between px-6 hover:bg-stone-800 transition-all active:scale-95 group shadow-lg shadow-black/10"
          >
            <span className="font-black uppercase tracking-widest text-xs">Launch Play Mode</span>
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Placeholder for future buttons */}
        <div className="grid grid-cols-1 gap-4 opacity-40 grayscale">
          <div className="bg-white/50 border border-dashed border-stone-300 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">More tools coming soon</span>
          </div>
        </div>
      </div>
    </div>
  );
};
