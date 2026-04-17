import React from 'react';
import { Deck, GundamCard } from '../types';

interface DeckImageExportProps {
  deck: Deck;
  totalCards: number;
  userName?: string;
  userPhotoUrl?: string;
}

export const DeckImageExport: React.FC<DeckImageExportProps> = ({
  deck,
  totalCards,
  userName,
  userPhotoUrl
}) => {
  return (
    <div 
      id="deck-export-container"
      className="w-[1000px] bg-[#0a0a0a] text-white p-8 flex flex-col gap-8 font-sans"
      style={{ minHeight: '1000px' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex gap-6 items-center">
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-black tracking-tighter uppercase bg-white text-black px-4 py-1 rounded">
              {deck.name || "Untitled Deck"}
            </h1>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-stone-800 border-2 border-amber-500 flex items-center justify-center overflow-hidden">
                {userPhotoUrl ? (
                  <img 
                    src={userPhotoUrl} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName || 'Gundam'}`} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Deck Creator</span>
                <span className="text-sm font-black">{userName || "ExBurst User"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-4xl font-black text-stone-800 uppercase tracking-tighter">
            {totalCards} Cards
          </span>
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-5 gap-4">
        {deck.items.map((item, idx) => (
          <div key={idx} className="relative aspect-[2/3] rounded-xl overflow-hidden border border-stone-800 bg-stone-900 group">
            <img 
              src={
                item.card.variants 
                  ? item.card.variants.find(v => v.type === item.artType)?.imageUrl || item.card.imageUrl
                  : (item.artType === "Parallel" && item.card.altImageUrl ? item.card.altImageUrl : item.card.imageUrl)
              } 
              alt={item.card.name}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
            <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md border border-white/20 px-3 py-1 rounded-lg shadow-xl">
              <span className="text-xl font-black text-white">x{item.count}</span>
            </div>
            
            {/* Card Info Overlay (Subtle) */}
            <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex justify-between items-start">
                <span className="text-[8px] font-black text-white/60 uppercase tracking-tighter">
                  {item.card.cardNumber}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
