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
  ArrowUpRight
} from 'lucide-react';
import { Deck } from '../types';
import { cn, getColorBg } from '../lib/utils';

interface DeckListProps {
  decks: Deck[];
  onSelectDeck: (deckId: string) => void;
  onCreateDeck: (name: string) => void;
  onDeleteDeck: (deckId: string) => void;
  onRenameDeck: (deckId: string, newName: string) => void;
  onSetCover: (deckId: string, imageUrl: string) => void;
  onClose: () => void;
  autoStartCreate?: boolean;
}

import { ProgressiveImage } from './ProgressiveImage';

export const DeckList: React.FC<DeckListProps> = ({
  decks,
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
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="w-full px-4 landscape:px-20 lg:px-56 xl:px-[18%] 2xl:px-[28%] py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 -ml-2 hover:bg-stone-100 rounded-full transition-colors">
              <ChevronLeft size={24} className="text-[#141414]" />
            </button>
            <h2 className="font-black text-xl text-[#141414] tracking-tight">My Decks</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              className="p-2.5 bg-white border border-stone-200 rounded-full text-stone-400 shadow-sm hover:text-stone-600 transition-all active:scale-95"
            >
              <Filter size={20} />
            </button>
            <button 
              onClick={() => setIsCreating(true)}
              className="p-2.5 bg-[#141414] text-white rounded-full hover:bg-stone-800 transition-all shadow-lg active:scale-95"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="w-full p-4 landscape:px-20 lg:px-56 xl:px-[18%] 2xl:px-[28%] pb-32 space-y-4">
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

        {decks.length === 0 && !isCreating ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-300">
              <FileText size={32} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-stone-600">No decks found</h3>
              <p className="text-sm text-stone-400">Create your first deck to start building.</p>
            </div>
            <button 
              onClick={() => setIsCreating(true)}
              className="px-6 py-3 bg-[#141414] text-white rounded-full font-bold text-sm shadow-lg shadow-black/10 active:scale-95 transition-transform"
            >
              Create New Deck
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {decks.map((deck) => {
              const colors = Array.from(new Set(deck.items.map(i => i.card.color)));
              
              // Get unique card thumbnails (highest level LRs first)
              const sortedLRs = [...deck.items]
                .filter(i => i.card.rarity === 'LR')
                .sort((a, b) => {
                  const lvA = parseInt(String(a.card.level || a.card.cost || 0));
                  const lvB = parseInt(String(b.card.level || b.card.cost || 0));
                  return lvB - lvA;
                });

              const uniqueThumbnails: typeof deck.items = [];
              const seenIds = new Set<string>();
              
              // Add LRs first
              for (const item of sortedLRs) {
                if (!seenIds.has(item.card.id)) {
                  uniqueThumbnails.push(item);
                  seenIds.add(item.card.id);
                }
                if (uniqueThumbnails.length >= 2) break;
              }

              // Fallback to highest level other cards if needed
              if (uniqueThumbnails.length < 2) {
                const others = [...deck.items]
                  .filter(i => i.card.rarity !== 'LR')
                  .sort((a, b) => {
                    const lvA = parseInt(String(a.card.level || a.card.cost || 0));
                    const lvB = parseInt(String(b.card.level || b.card.cost || 0));
                    return lvB - lvA;
                  });

                for (const item of others) {
                  if (!seenIds.has(item.card.id)) {
                    uniqueThumbnails.push(item);
                    seenIds.add(item.card.id);
                  }
                  if (uniqueThumbnails.length >= 2) break;
                }
              }
              
              return (
                <motion.div 
                  key={deck.id}
                  layout
                  onClick={() => onSelectDeck(deck.id)}
                  className="relative aspect-square bg-white rounded-2xl shadow-md border border-stone-200 overflow-hidden cursor-pointer group"
                >
                  {/* Background Image / Cover */}
                  {deck.coverImageUrl ? (
                    <div className="w-full h-full transition-transform duration-500 group-hover:scale-[1.1]">
                      <ProgressiveImage 
                        src={deck.coverImageUrl} 
                        imageClassName="object-cover object-[center_10%] scale-150"
                        referrerPolicy="no-referrer" 
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-300">
                      <Layout size={40} strokeWidth={1} />
                    </div>
                  )}

                  {/* Top Left Delete Trash Can */}
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(deck.id);
                    }}
                    className="absolute top-2 left-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-stone-400 hover:text-red-500 shadow-sm transition-colors border border-stone-100"
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* Top Right Open Icon Triangle Overlay */}
                  <div className="absolute top-0 right-0 w-10 h-10">
                    <div 
                      className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-l-[40px] border-t-white border-l-transparent" 
                      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
                    />
                    <ArrowUpRight size={14} className="absolute top-[8px] right-[8px] text-stone-400" />
                  </div>

                  {/* Bottom Text and Thumbnail Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-3 pt-10 bg-gradient-to-t from-black/95 via-black/40 to-transparent">
                    <div className="flex flex-col gap-2">
                       {/* Thumbnails */}
                       <div className="flex gap-1.5">
                         {uniqueThumbnails.map((item, idx) => (
                           <div 
                             key={idx} 
                             className="w-9 h-9 rounded-lg border border-white/20 overflow-hidden shadow-lg bg-stone-800"
                           >
                             <ProgressiveImage 
                               src={item.card.imageUrl} 
                               imageClassName="object-cover object-[center_10%] scale-150"
                               referrerPolicy="no-referrer" 
                             />
                           </div>
                         ))}
                       </div>

                       <div className="flex items-center justify-between gap-2">
                         <h3 className="text-white font-bold text-sm truncate drop-shadow-md tracking-tight">
                           {deck.name}
                         </h3>
                       </div>
                    </div>
                  </div>

                  {/* Color Indicator Bar at bottom */}
                  <div className="absolute bottom-0 inset-x-0 flex h-1.5">
                    {colors.length >= 3 ? (
                      <div 
                        className="w-full h-full" 
                        style={{ background: 'linear-gradient(to right, #3b82f6, #ef4444, #a855f7, #ffffff, #10b981)' }} 
                      />
                    ) : colors.length === 2 ? (
                      <>
                        <div className={cn("flex-1 h-full", getColorBg(colors[0]))} />
                        <div className={cn("flex-1 h-full", getColorBg(colors[1]))} />
                      </>
                    ) : colors.length === 1 ? (
                      <div className={cn("w-full h-full", getColorBg(colors[0]))} />
                    ) : (
                      <div className="w-full h-full bg-stone-200/20" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </motion.div>
  );
};
