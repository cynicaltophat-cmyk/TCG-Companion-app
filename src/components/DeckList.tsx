import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  ChevronRight, 
  ChevronLeft,
  Layout, 
  X,
  Check,
  FileText,
  Filter,
  ArrowUpRight,
  Search
} from 'lucide-react';
import { Deck, GundamCard } from '../types';
import { cn, getColorBg } from '../lib/utils';

interface DeckListProps {
  decks: Deck[];
  allCards: GundamCard[];
  onSelectDeck: (deckId: string) => void;
  onCreateDeck: (name: string) => void;
  onDeleteDeck: (deckId: string) => void;
  onRenameDeck: (deckId: string, newName: string) => void;
  onSetCover: (deckId: string, imageUrl: string) => void;
  onClose: () => void;
  autoStartCreate?: boolean;
}

import { ProgressiveImage } from './ProgressiveImage';

interface DeckCardProps {
  deck: Deck;
  onSelect: (deckId: string) => void;
  onDelete: (deckId: string) => void;
}

const DeckCard = React.memo(({ deck, onSelect, onDelete }: DeckCardProps) => {
  const colors = Array.from(new Set(deck.items.map(i => i.card.color)));
  
  // Quick thumbnail selection without full sort if possible
  const uniqueThumbnails: GundamCard[] = [];
  const seenIds = new Set<string>();
  
  // Simple iteration to find up to 2 unique thumbnails
  for (const item of deck.items) {
    if (!seenIds.has(item.card.id)) {
      uniqueThumbnails.push(item.card);
      seenIds.add(item.card.id);
    }
    if (uniqueThumbnails.length >= 2) break;
  }
  
  return (
    <div 
      onClick={() => onSelect(deck.id)}
      className="relative aspect-square bg-[#E5E5E0] rounded-[2rem] shadow-xl border border-white/50 overflow-hidden cursor-pointer group"
    >
      {/* Background Image / Cover */}
      <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-110">
        {deck.coverImageUrl ? (
          <ProgressiveImage 
            src={deck.coverImageUrl} 
            imageClassName="object-cover object-center h-full w-full"
            referrerPolicy="no-referrer" 
          />
        ) : (
          <div className="w-full h-full bg-stone-200 flex items-center justify-center text-stone-400">
            <Layout size={48} strokeWidth={1} />
          </div>
        )}
      </div>

      {/* Top Left Delete Trash Can */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onDelete(deck.id);
        }}
        className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-stone-400 hover:text-red-500 shadow-lg transition-all active:scale-90 border border-stone-100 z-10"
      >
        <Trash2 size={20} />
      </button>

      {/* Top Right Open Icon */}
      <div className="absolute top-0 right-0 w-12 h-12 z-10">
        <div 
          className="absolute top-0 right-0 w-0 h-0 border-t-[48px] border-l-[48px] border-t-white border-l-transparent" 
        />
        <ArrowUpRight size={18} className="absolute top-[8px] right-[8px] text-stone-400" />
      </div>

      {/* Bottom Text and Thumbnail Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 pt-16 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
        <div className="flex flex-col gap-2">
           {/* Thumbnails */}
           <div className="flex gap-2">
             {uniqueThumbnails.map((card, idx) => (
               <div 
                 key={idx} 
                 className="w-10 h-10 rounded-xl border border-white/30 overflow-hidden shadow-2xl bg-stone-800 backdrop-blur-md"
               >
                 <img 
                   src={card.imageUrl} 
                   className="object-cover object-center w-full h-full"
                   referrerPolicy="no-referrer"
                   loading="lazy"
                 />
               </div>
             ))}
           </div>

           <h3 className="text-white font-black text-base truncate drop-shadow-lg tracking-tight">
             {deck.name}
           </h3>
        </div>
      </div>

      {/* Color Indicator Bar at bottom */}
      <div className="absolute bottom-0 inset-x-0 flex h-2">
        {colors.length === 0 ? (
          <div className="w-full h-full bg-stone-400/50" />
        ) : (
          colors.map(color => (
            <div 
              key={color} 
              className={cn("flex-1 h-full", getColorBg(color))} 
            />
          ))
        )}
      </div>
    </div>
  );
});

export const DeckList: React.FC<DeckListProps> = ({
  decks,
  allCards,
  onSelectDeck,
  onCreateDeck,
  onDeleteDeck,
  onRenameDeck,
  onSetCover,
  onClose,
  autoStartCreate = false
}) => {
  const [isCreating, setIsCreating] = useState(autoStartCreate);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [coverPickerDeckId, setCoverPickerDeckId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [mainCardQuery, setMainCardQuery] = useState("");
  const [selectedMainCard, setSelectedMainCard] = useState<GundamCard | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [isExactColor, setIsExactColor] = useState(false);

  // Derived state: filtered cards for the "Main card" selector
  const searchedCards = React.useMemo(() => {
    if (!mainCardQuery.trim()) return [];
    const q = mainCardQuery.toLowerCase();
    return allCards.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.cardNumber.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [allCards, mainCardQuery]);

  // Apply Filters
  const filteredDecks = React.useMemo(() => {
    return decks.filter(deck => {
      // Search Filter (Deck Name or Card Name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = deck.name.toLowerCase().includes(q);
        const cardMatch = deck.items.some(item => 
          item.card.name.toLowerCase().includes(q) || 
          item.card.cardNumber.toLowerCase().includes(q)
        );
        if (!nameMatch && !cardMatch) return false;
      }

      // Main Card Filter (from drawer)
      if (selectedMainCard) {
        const hasCard = deck.items.some(item => item.card.id === selectedMainCard.id);
        if (!hasCard) return false;
      }

      // Color Filter
      if (selectedColors.length > 0) {
        const deckColors = Array.from(new Set(deck.items.map(i => i.card.color)));
        if (isExactColor) {
          // Must have EXACTLY the selected colors
          if (deckColors.length !== selectedColors.length) return false;
          return selectedColors.every(c => deckColors.includes(c as any));
        } else {
          // Must have AT LEAST any of the selected colors
          return selectedColors.some(c => deckColors.includes(c as any));
        }
      }

      return true;
    });
  }, [decks, searchQuery, selectedMainCard, selectedColors, isExactColor]);

  const toggleColor = (color: string) => {
    setSelectedColors(prev => 
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
  };

  const resetFilters = () => {
    setSearchQuery("");
    setMainCardQuery("");
    setSelectedMainCard(null);
    setSelectedColors([]);
    setIsExactColor(false);
  };

  const handleCreate = () => {
    if (newDeckName.trim()) {
      onCreateDeck(newDeckName.trim());
      setNewDeckName("");
      setIsCreating(false);
    }
  };

  const handleRename = (deckId: string) => {
    if (editName.trim()) {
      onRenameDeck(deckId, editName.trim());
      setEditingDeckId(null);
      setEditName("");
    }
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteDeck(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-[#F5F5F0] flex flex-col min-h-0"
    >
      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl space-y-6"
          >
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="font-bold text-lg">Delete Deck?</h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                Are you sure you wish to delete this deck? This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="py-3 px-4 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-200 transition-colors"
              >
                No
              </button>
              <button 
                onClick={confirmDelete}
                className="py-3 px-4 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Yes
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Cover Picker Modal */}
      {coverPickerDeckId && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-white rounded-3xl overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
          >
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-tight">Select Deck Cover</h3>
              <button onClick={() => setCoverPickerDeckId(null)} className="p-2 text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {decks.find(d => d.id === coverPickerDeckId)?.items.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <p className="text-stone-400 text-sm italic">Add cards to your deck first</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {decks.find(d => d.id === coverPickerDeckId)?.items.map((item, i) => (
                    <button 
                      key={i}
                      onClick={() => {
                        onSetCover(coverPickerDeckId, item.card.imageUrl);
                        setCoverPickerDeckId(null);
                      }}
                      className="aspect-[2/3] rounded-lg overflow-hidden border border-stone-200 hover:border-amber-500 transition-all active:scale-95"
                    >
                      <img src={item.card.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
      {/* Header */}
      <header className="bg-white sticky top-0 z-10 border-b border-stone-100">
        <div className="w-full px-4 landscape:px-20 lg:px-56 xl:px-[18%] 2xl:px-[28%] py-2 flex items-center gap-3">
          <button 
            onClick={onClose} 
            className="w-9 h-7 bg-white border border-stone-200 rounded-full flex items-center justify-center text-stone-900 shadow-xl active:scale-95 transition-all shrink-0 hover:bg-stone-50"
          >
            <ChevronLeft size={16} className="stroke-[3]" />
          </button>
          
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-amber-500 transition-colors" size={16} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deck list..."
              className="w-full pl-9 pr-10 py-2 bg-stone-100/80 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-stone-400 font-medium"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 rounded-full hover:bg-stone-200 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button 
            onClick={() => setIsCreating(true)}
            className="w-9 h-7 bg-[#141414] text-white rounded-full flex items-center justify-center hover:bg-stone-800 transition-all shadow-lg active:scale-95 shrink-0"
          >
            <Plus size={16} className="stroke-[3]" />
          </button>
        </div>

        {/* Quick Filter Row */}
        <div className="w-full px-4 landscape:px-20 lg:px-56 xl:px-[18%] 2xl:px-[28%] pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest whitespace-nowrap">Quick filter</span>
            <div className="flex gap-1.5">
              {["Red", "Blue", "Green", "White", "Purple"].map(color => (
                <button
                  key={color}
                  onClick={() => toggleColor(color)}
                  className={cn(
                    "w-5 h-5 rounded-md transition-all active:scale-90 shadow-sm",
                    getColorBg(color),
                    color === 'White' && "border border-stone-300",
                    selectedColors.includes(color) ? "ring-2 ring-offset-1 ring-amber-500" : "opacity-80 hover:opacity-100"
                  )}
                />
              ))}
            </div>
          </div>

          <button 
            onClick={() => setIsExactColor(!isExactColor)}
            className="flex items-center gap-2 group"
          >
            <div className={cn(
              "w-4 h-4 rounded-md border flex items-center justify-center transition-all",
              isExactColor ? "bg-[#141414] border-[#141414]" : "bg-white border-stone-300 group-hover:border-stone-400"
            )}>
              {isExactColor && <Check size={10} className="text-white stroke-[3]" />}
            </div>
            <span className="text-[8px] font-bold text-stone-400 group-hover:text-stone-600 transition-colors uppercase tracking-tight">Exact color match</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="w-full p-4 landscape:px-20 lg:px-56 xl:px-[18%] 2xl:px-[28%] pb-32 space-y-4">
          {(selectedMainCard || selectedColors.length > 0) && (
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {selectedMainCard && (
                   <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-black uppercase rounded-lg flex items-center gap-1.5">
                     Card: {selectedMainCard.cardNumber}
                     <button onClick={() => setSelectedMainCard(null)}><X size={12} /></button>
                   </span>
                )}
                {selectedColors.map(c => (
                  <span key={c} className="px-3 py-1 bg-stone-100 border border-stone-200 text-stone-600 text-[10px] font-black uppercase rounded-lg flex items-center gap-1.5">
                    <div className={cn("w-2 h-2 rounded-full", getColorBg(c))} />
                    {c}
                    <button onClick={() => toggleColor(c)}><X size={12} /></button>
                  </span>
                ))}
              </div>
              <button 
                onClick={resetFilters}
                className="text-[10px] font-black text-stone-400 hover:text-red-500 uppercase tracking-widest transition-colors"
              >
                Clear All
              </button>
            </div>
          )}

          {isCreating && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-2xl border-2 border-amber-400 shadow-sm space-y-3"
          >
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">New Deck Name</h3>
            <div className="flex gap-2">
              <input 
                autoFocus
                type="text"
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Enter deck name..."
                className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
              <button 
                onClick={handleCreate}
                className="p-2 bg-[#141414] text-white rounded-xl hover:bg-stone-800 transition-colors"
              >
                <Check size={20} />
              </button>
            </div>
          </motion.div>
        )}

        {filteredDecks.length === 0 && !isCreating ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-300">
              <FileText size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-stone-600">No decks found</h3>
              <p className="text-sm text-stone-400">
                {selectedMainCard || selectedColors.length > 0 
                  ? "Try adjusting your filters to find what you're looking for." 
                  : "Create your first deck to start building."}
              </p>
            </div>
            {(selectedMainCard || selectedColors.length > 0) ? (
               <button 
                onClick={resetFilters}
                className="px-6 py-3 bg-stone-100 text-stone-600 rounded-full font-bold text-sm hover:bg-stone-200 transition-colors"
              >
                Reset Filters
              </button>
            ) : (
              <button 
                onClick={() => setIsCreating(true)}
                className="px-6 py-3 bg-[#141414] text-white rounded-full font-bold text-sm shadow-lg shadow-black/10 active:scale-95 transition-transform"
              >
                Create New Deck
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {filteredDecks.map((deck) => (
              <DeckCard 
                key={deck.id}
                deck={deck}
                onSelect={onSelectDeck}
                onDelete={setDeleteConfirmId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Filter Drawer */}
      <AnimatePresence>
        {isFilterOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 z-[80] bg-black/20 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', ease: 'circOut', duration: 0.3 }}
              className="fixed inset-y-0 right-0 w-[85%] bg-white z-[81] shadow-2xl flex flex-col border-l border-stone-100"
            >
              <div className="p-6 flex items-center justify-between border-b border-stone-100">
                <h3 className="font-black text-xl tracking-tight text-[#141414]">Filter Decks</h3>
                <button onClick={() => setIsFilterOpen(false)} className="p-2 text-stone-400 hover:text-stone-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                {/* Main Card Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Main Card</h4>
                    {selectedMainCard && (
                      <button 
                        onClick={() => setSelectedMainCard(null)}
                        className="text-[10px] font-bold text-amber-600 hover:text-amber-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  
                  <div className="relative">
                    <input 
                      type="text"
                      value={mainCardQuery}
                      onChange={(e) => setMainCardQuery(e.target.value)}
                      placeholder="Search card name or number..."
                      className="w-full bg-stone-100 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>

                  {selectedMainCard ? (
                    <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                      <div className="w-12 h-18 rounded-lg overflow-hidden border border-amber-200">
                        <img src={selectedMainCard.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-amber-900">{selectedMainCard.name}</p>
                        <p className="text-[10px] text-amber-700/60 font-black">{selectedMainCard.cardNumber}</p>
                      </div>
                    </div>
                  ) : searchedCards.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2 mask-linear-right">
                      {searchedCards.map((card) => (
                        <button 
                          key={card.id}
                          onClick={() => {
                            setSelectedMainCard(card);
                            setMainCardQuery("");
                          }}
                          className="flex-shrink-0 w-24 aspect-[2/3] rounded-xl overflow-hidden border-2 border-stone-100 hover:border-amber-400 transition-all active:scale-95 shadow-sm"
                        >
                          <img src={card.imageUrl} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  ) : mainCardQuery && (
                    <p className="text-xs text-stone-400 text-center py-4 italic">No cards found</p>
                  )}
                </div>

                {/* Color Section */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Colors</h4>
                  <div className="flex flex-wrap gap-3">
                    {["Red", "Blue", "Green", "White", "Purple"].map(color => (
                      <button
                        key={color}
                        onClick={() => toggleColor(color)}
                        className={cn(
                          "w-12 h-12 rounded-2xl transition-all border flex items-center justify-center relative",
                          selectedColors.includes(color)
                            ? "border-amber-400 ring-2 ring-amber-400 shadow-xl scale-110"
                            : "border-stone-100 hover:border-stone-300"
                        )}
                      >
                        <div className={cn("w-full h-full rounded-[14px]", getColorBg(color))} />
                        {selectedColors.includes(color) && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                             <div className="bg-white/20 backdrop-blur-sm rounded-full p-0.5">
                               <Check size={16} className={color === 'White' ? "text-stone-900" : "text-white"} />
                             </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={() => setIsExactColor(!isExactColor)}
                      className="flex items-center gap-3 group"
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                        isExactColor ? "bg-[#141414] border-[#141414]" : "border-stone-200 group-hover:border-stone-400"
                      )}>
                        {isExactColor && <Check size={14} className="text-white" />}
                      </div>
                      <span className="text-xs font-bold text-stone-600">Exact color match only</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-stone-100 grid grid-cols-2 gap-4">
                <button 
                  onClick={resetFilters}
                  className="py-4 border border-stone-200 rounded-2xl font-black text-xs uppercase tracking-widest text-stone-500 hover:bg-stone-50 transition-colors"
                >
                  Reset
                </button>
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="py-4 bg-[#141414] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-black/10 active:scale-95 transition-all"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  </motion.div>
  );
};
