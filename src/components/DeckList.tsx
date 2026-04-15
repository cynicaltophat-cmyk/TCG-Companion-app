import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  ChevronRight, 
  Layout, 
  X,
  Check,
  FileText
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
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="w-full px-4 lg:px-12 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
              <ChevronRight className="rotate-180" size={24} />
            </button>
            <h2 className="font-bold text-lg tracking-tight">My Decks</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsDeleteMode(!isDeleteMode)}
              className={cn(
                "p-2 rounded-full transition-all active:scale-95 shadow-lg",
                isDeleteMode 
                  ? "bg-red-500 text-white shadow-red-500/20" 
                  : "bg-white text-stone-400 border border-stone-200 shadow-black/5 hover:text-stone-600"
              )}
            >
              <Trash2 size={20} />
            </button>
            <button 
              onClick={() => setIsCreating(true)}
              className="p-2 bg-[#141414] text-white rounded-full hover:bg-stone-800 transition-colors shadow-lg shadow-black/10 active:scale-95"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="w-full p-4 lg:px-12 pb-20 space-y-4">
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
          <div className="grid gap-3">
            {decks.map((deck) => {
              const colors = Array.from(new Set(deck.items.map(i => i.card.color)));
              
              return (
                <motion.div 
                  key={deck.id}
                  layout
                  className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
                >
                  {/* Color Indicator Bar */}
                  <div className="flex h-1 w-full">
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
                    ) : null}
                  </div>

                  <div className="flex items-stretch">
                    <div 
                      onClick={() => !isDeleteMode && onSelectDeck(deck.id)}
                      className={cn(
                        "flex-1 min-w-0 p-4 flex items-center gap-4 transition-colors",
                        !isDeleteMode ? "cursor-pointer hover:bg-stone-50/50" : "cursor-default"
                      )}
                    >
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setCoverPickerDeckId(deck.id);
                        }}
                        className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center text-stone-400 overflow-hidden relative group shrink-0"
                      >
                        {deck.coverImageUrl ? (
                          <img src={deck.coverImageUrl} alt="" className="w-full h-full object-cover object-[center_5%] scale-150" referrerPolicy="no-referrer" />
                        ) : (
                          <Layout size={24} />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Plus size={16} className="text-white" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        {editingDeckId === deck.id ? (
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <input 
                              autoFocus
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleRename(deck.id)}
                              className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none"
                            />
                            <button onClick={() => handleRename(deck.id)} className="text-green-600"><Check size={18} /></button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              <h3 className="font-bold text-sm truncate">{deck.name}</h3>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDeckId(deck.id);
                                  setEditName(deck.name);
                                }}
                                className="p-1 text-stone-300 hover:text-[#141414] transition-colors"
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                              {deck.items.reduce((sum, item) => sum + item.count, 0)} / 50 Cards
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {editingDeckId !== deck.id && (
                      <div className="flex items-stretch gap-0">
                        {isDeleteMode ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(deck.id);
                            }}
                            className="px-6 bg-red-50 text-red-500 hover:bg-red-100 transition-colors flex items-center justify-center font-bold text-xs uppercase tracking-widest border-l border-red-100"
                          >
                            Delete
                          </button>
                        ) : (
                          <button 
                            onClick={() => onSelectDeck(deck.id)}
                            className="w-14 bg-stone-50 border-l border-stone-100 flex items-center justify-center text-stone-300 hover:text-[#141414] hover:bg-stone-100 transition-all active:bg-stone-200"
                          >
                            <ChevronRight size={20} />
                          </button>
                        )}
                      </div>
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
