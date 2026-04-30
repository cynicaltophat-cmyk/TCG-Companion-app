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
  Search,
  Folder,
  FolderPlus,
  MoreVertical,
  Move
} from 'lucide-react';
import { Deck, GundamCard, DeckFolder } from '../types';
import { cn, getColorBg } from '../lib/utils';

interface DeckListProps {
  decks: Deck[];
  folders: DeckFolder[];
  allCards: GundamCard[];
  onSelectDeck: (deckId: string) => void;
  onCreateDeck: (name: string, folderId?: string | null) => void;
  onDeleteDeck: (deckId: string) => void;
  onRenameDeck: (deckId: string, newName: string) => void;
  onSetCover: (deckId: string, imageUrl: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onMoveToFolder: (deckId: string, folderId: string | null) => void;
  onClose: () => void;
  autoStartCreate?: boolean;
}

import { ProgressiveImage } from './ProgressiveImage';

interface DeckCardProps {
  deck: Deck;
  onSelect: (deckId: string) => void;
  onDelete: (deckId: string) => void;
  onMove: (deckId: string) => void;
}

const DeckCard = React.memo(({ deck, onSelect, onDelete, onMove }: DeckCardProps) => {
  const colors = React.useMemo(() => Array.from(new Set(deck.items.map(i => i.card.color))), [deck.items]);
  
  return (
    <div 
      onClick={() => onSelect(deck.id)}
      className="relative aspect-square bg-[#E5E5E0] rounded-[2rem] shadow-xl border border-white/50 overflow-hidden cursor-pointer group transform-gpu will-change-transform"
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
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(deck.id);
          }}
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-stone-400 hover:text-red-500 shadow-lg transition-all active:scale-90 border border-stone-100"
        >
          <Trash2 size={18} />
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onMove(deck.id);
          }}
          className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-stone-400 hover:text-amber-500 shadow-lg transition-all active:scale-90 border border-stone-100"
        >
          <Move size={18} />
        </button>
      </div>

      {/* Top Right Open Icon */}
      <div className="absolute top-0 right-0 w-12 h-12 z-10">
        <div 
          className="absolute top-0 right-0 w-0 h-0 border-t-[48px] border-l-[48px] border-t-white border-l-transparent" 
        />
        <ArrowUpRight size={18} className="absolute top-[8px] right-[8px] text-stone-400" />
      </div>

      {/* Bottom Text Overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 pt-16 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
        <h3 className="text-white font-black text-base truncate drop-shadow-lg tracking-tight">
          {deck.name}
        </h3>
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
  folders,
  allCards,
  onSelectDeck,
  onCreateDeck,
  onDeleteDeck,
  onRenameDeck,
  onSetCover,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  onMoveToFolder,
  onClose,
  autoStartCreate = false
}) => {
  const [isCreating, setIsCreating] = useState(autoStartCreate);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteFolderConfirmId, setDeleteFolderConfirmId] = useState<string | null>(null);
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renamingFolderName, setRenamingFolderName] = useState("");
  const [coverPickerDeckId, setCoverPickerDeckId] = useState<string | null>(null);
  const [moveDeckId, setMoveDeckId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null); // null means "All Decks" or Root

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
      // Folder Filter
      if (activeFolderId === 'unassigned') {
        if (deck.folderId) return false;
      } else if (activeFolderId) {
        if (deck.folderId !== activeFolderId) return false;
      }

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
  }, [decks, searchQuery, selectedMainCard, selectedColors, isExactColor, activeFolderId]);

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
      onCreateDeck(newDeckName.trim(), activeFolderId === 'unassigned' ? null : activeFolderId);
      setNewDeckName("");
      setIsCreating(false);
    }
  };

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };

  const handleRenameFolder = () => {
    if (renamingFolderId && renamingFolderName.trim()) {
      onRenameFolder(renamingFolderId, renamingFolderName.trim());
      setRenamingFolderId(null);
      setRenamingFolderName("");
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

  const confirmDeleteFolder = () => {
    if (deleteFolderConfirmId) {
      onDeleteFolder(deleteFolderConfirmId);
      setDeleteFolderConfirmId(null);
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

      {/* Folder Delete Confirmation Modal */}
      {deleteFolderConfirmId && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl space-y-6"
          >
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder size={24} />
              </div>
              <h3 className="font-bold text-lg">Delete Folder?</h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                Decks in this folder will be unassigned but NOT deleted. This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setDeleteFolderConfirmId(null)}
                className="py-3 px-4 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-200 transition-colors"
              >
                No
              </button>
              <button 
                onClick={confirmDeleteFolder}
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
      <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-40 border-b border-stone-200">
        <div className="w-full px-4 landscape:px-20 lg:px-56 xl:px-[18%] 2xl:px-[28%] flex flex-col">
          <div className="flex items-center gap-2 w-full py-2">
            <button 
              onClick={onClose} 
              className="w-8 h-8 bg-white border border-stone-200 rounded-lg flex items-center justify-center text-stone-900 shadow-md active:scale-95 transition-all shrink-0 hover:bg-stone-50"
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
              onClick={() => setIsCreatingFolder(true)}
              className="w-8 h-8 bg-stone-100 text-stone-600 rounded-lg flex items-center justify-center hover:bg-stone-200 transition-all shadow-md active:scale-95 shrink-0"
            >
              <FolderPlus size={16} className="stroke-[2]" />
            </button>

            <button 
              onClick={() => setIsCreating(true)}
              className="w-8 h-8 bg-[#141414] text-white rounded-lg flex items-center justify-center hover:bg-stone-800 transition-all shadow-md active:scale-95 shrink-0"
            >
              <Plus size={16} className="stroke-[3]" />
            </button>
          </div>

          {/* Quick Filter Row */}
          <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar pt-1 pb-3 px-1">
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
              className="flex items-center gap-2 group shrink-0"
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
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain transition-all duration-300">
        <div className="w-full p-4 landscape:px-20 lg:px-56 xl:px-[18%] 2xl:px-[28%] pb-32 space-y-6">
          {/* Folders Bar - Now inside scrolling container */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <button 
              onClick={() => setActiveFolderId(null)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap text-xs font-black uppercase tracking-tight shrink-0",
                activeFolderId === null 
                  ? "bg-[#141414] text-white shadow-lg" 
                  : "bg-white border border-stone-200 text-stone-500 shadow-sm"
              )}
            >
              All Decks
            </button>
            <button 
              onClick={() => setActiveFolderId('unassigned')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap text-xs font-black uppercase tracking-tight shrink-0",
                activeFolderId === 'unassigned' 
                  ? "bg-[#141414] text-white shadow-lg" 
                  : "bg-white border border-stone-200 text-stone-500 shadow-sm"
              )}
            >
              Unsorted
            </button>
            
            {folders.map(folder => (
              <div key={folder.id} className="relative group shrink-0">
                <div 
                  onClick={() => setActiveFolderId(activeFolderId === folder.id ? null : folder.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap text-xs font-black uppercase tracking-tight cursor-pointer",
                    activeFolderId === folder.id 
                      ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                      : "bg-white border border-stone-200 text-stone-500 shadow-sm"
                  )}
                >
                  <Folder size={14} className={activeFolderId === folder.id ? "fill-white/30" : "fill-stone-300"} />
                  {folder.name}
                  <div 
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFolderMenuId(folderMenuId === folder.id ? null : folder.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        setFolderMenuId(folderMenuId === folder.id ? null : folder.id);
                      }
                    }}
                    className={cn(
                      "p-1 rounded-md transition-colors ml-1",
                      activeFolderId === folder.id ? "hover:bg-white/20 text-white/70" : "hover:bg-stone-100 text-stone-400"
                    )}
                  >
                    <MoreVertical size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>

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

          {isCreatingFolder && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-4 rounded-2xl border-2 border-amber-400 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">New Folder Name</h3>
                <button 
                  onClick={() => setIsCreatingFolder(false)}
                  className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex gap-2">
                <input 
                  autoFocus
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  placeholder="Enter folder name..."
                  className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
                <button 
                  onClick={handleCreateFolder}
                  className="p-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
                >
                  <Check size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {isCreating && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-2xl border-2 border-amber-400 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest">New Deck Name</h3>
              <button 
                onClick={() => setIsCreating(false)}
                className="p-1 text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
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
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
            {filteredDecks.map((deck) => (
              <DeckCard 
                key={deck.id}
                deck={deck}
                onSelect={onSelectDeck}
                onDelete={setDeleteConfirmId}
                onMove={setMoveDeckId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Folder Options Dropdown Style Modal */}
      <AnimatePresence>
        {folderMenuId && (
          <div className="fixed inset-0 z-[115] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-6" onClick={() => setFolderMenuId(null)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[280px] bg-white rounded-[2rem] shadow-2xl overflow-hidden p-2"
            >
              <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Folder Actions</span>
                <button onClick={() => setFolderMenuId(null)} className="text-stone-300 hover:text-stone-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-1 space-y-1">
                <button 
                  onClick={() => {
                    const folder = folders.find(f => f.id === folderMenuId);
                    if (folder) {
                      setRenamingFolderId(folder.id);
                      setRenamingFolderName(folder.name);
                    }
                    setFolderMenuId(null);
                  }}
                  className="w-full text-left p-4 rounded-2xl hover:bg-stone-50 flex items-center gap-4 text-stone-600 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center group-hover:bg-amber-100 group-hover:text-amber-500 transition-colors">
                    <Edit2 size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm tracking-tight">Rename Folder</span>
                    <span className="text-[10px] text-stone-400">Change the display name</span>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    setDeleteFolderConfirmId(folderMenuId);
                    setFolderMenuId(null);
                  }}
                  className="w-full text-left p-4 rounded-2xl hover:bg-red-50 flex items-center gap-4 text-red-500 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-red-100/50 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-colors">
                    <Trash2 size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm tracking-tight text-red-600">Delete Folder</span>
                    <span className="text-[10px] text-red-400/80">Keep decks, remove folder</span>
                  </div>
                </button>
              </div>

              <div className="p-1 mt-1">
                <button 
                  onClick={() => setFolderMenuId(null)}
                  className="w-full py-4 text-stone-400 font-bold text-xs uppercase tracking-widest hover:text-stone-600 transition-colors border-t border-stone-50"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Folder Rename Modal */}
      <AnimatePresence>
        {renamingFolderId && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setRenamingFolderId(null)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                    <Edit2 size={20} />
                  </div>
                  <h3 className="font-black uppercase tracking-tight">Rename Folder</h3>
                </div>
                
                <input 
                  autoFocus
                  type="text"
                  value={renamingFolderName}
                  onChange={(e) => setRenamingFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
                  placeholder="New folder name..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setRenamingFolderId(null)}
                  className="py-3 px-4 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRenameFolder}
                  className="py-3 px-4 bg-amber-500 text-white rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Move to Folder Modal */}
      <AnimatePresence>
        {moveDeckId && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-3xl overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                <h3 className="font-black uppercase tracking-tight">Move to Folder</h3>
                <button onClick={() => setMoveDeckId(null)} className="p-2 text-stone-400 hover:text-stone-600">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
                <button 
                  onClick={() => {
                    onMoveToFolder(moveDeckId, null);
                    setMoveDeckId(null);
                  }}
                  className="w-full text-left p-4 rounded-2xl bg-stone-50 hover:bg-stone-100 transition-colors border border-stone-200/50 flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-400 group-hover:text-amber-500 transition-colors">
                    <X size={20} />
                  </div>
                  <span className="font-black text-xs uppercase tracking-tight text-stone-600">Unsorted (No Folder)</span>
                </button>

                {folders.map(folder => (
                  <button 
                    key={folder.id}
                    onClick={() => {
                      onMoveToFolder(moveDeckId, folder.id);
                      setMoveDeckId(null);
                    }}
                    className="w-full text-left p-4 rounded-2xl bg-stone-50 hover:bg-stone-100 transition-colors border border-stone-200/50 flex items-center gap-3 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-400 group-hover:text-amber-500 transition-colors">
                      <Folder size={20} className="fill-stone-100" />
                    </div>
                    <span className="font-black text-xs uppercase tracking-tight text-stone-600">{folder.name}</span>
                  </button>
                ))}

                {folders.length === 0 && (
                  <p className="text-center py-8 text-stone-400 text-xs italic">No folders created yet</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
