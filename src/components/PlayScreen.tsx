import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  History, 
  Plus, 
  ChevronLeft, 
  Calendar, 
  MapPin, 
  Tag, 
  X, 
  Check, 
  ChevronRight,
  Swords,
  FileText,
  Trash2,
  Edit2
} from 'lucide-react';
import { MatchEntry, MatchRound, MatchNature, Deck, DeckSnapshot } from '../types';
import { cn, getColorBg } from '../lib/utils';
import { DeckList } from './DeckList';

interface PlayScreenProps {
  matches: MatchEntry[];
  onAddMatch: (match: MatchEntry) => void;
  onUpdateMatch: (match: MatchEntry) => void;
  onDeleteMatch: (matchId: string) => void;
  decks: Deck[];
}

type ViewState = 'menu' | 'history' | 'create-match' | 'match-detail' | 'add-round';

const COLORS = ["Red", "Blue", "Green", "White", "Purple"];

export const PlayScreen: React.FC<PlayScreenProps> = ({
  matches,
  onAddMatch,
  onUpdateMatch,
  onDeleteMatch,
  decks
}) => {
  const [view, setView] = useState<ViewState>('menu');
  const [selectedMatch, setSelectedMatch] = useState<MatchEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [deleteMatchConfirmId, setDeleteMatchConfirmId] = useState<string | null>(null);
  const [deleteRoundConfirmId, setDeleteRoundConfirmId] = useState<string | null>(null);
  
  // Create Match State
  const [newMatch, setNewMatch] = useState<Partial<MatchEntry>>({
    nature: 'Free & Casual',
    shopName: 'Happyland TCG',
    date: new Date().toISOString().split('T')[0],
    rounds: []
  });

  // Add Round State
  const [isSelectingDeck, setIsSelectingDeck] = useState(false);
  const [newRound, setNewRound] = useState<Partial<MatchRound>>({
    opponentDeckName: '',
    opponentColors: [],
    result: 'Win',
    notes: ''
  });

  const handleCreateMatch = () => {
    const match: MatchEntry = {
      id: Math.random().toString(36).substr(2, 9),
      nature: newMatch.nature as MatchNature,
      shopName: newMatch.shopName || 'None',
      date: newMatch.date || new Date().toISOString().split('T')[0],
      rounds: [],
      createdAt: Date.now()
    };
    setSelectedMatch(match);
    setIsEditing(false);
    setView('match-detail');
  };

  const handleEditMatch = (match: MatchEntry) => {
    setSelectedMatch({ ...match });
    setIsEditing(true);
    setView('match-detail');
  };

  const handleEditRound = (round: MatchRound) => {
    setNewRound({
      myDeckSnapshot: round.myDeckSnapshot,
      opponentDeckName: round.opponentDeckName,
      opponentColors: round.opponentColors,
      result: round.result,
      notes: round.notes
    });
    setEditingRoundId(round.id);
    setView('add-round');
  };

  const handleDeleteRound = (roundId: string) => {
    setDeleteRoundConfirmId(roundId);
  };

  const confirmDeleteRound = () => {
    if (!selectedMatch || !deleteRoundConfirmId) return;
    const updatedMatch = {
      ...selectedMatch,
      rounds: selectedMatch.rounds.filter(r => r.id !== deleteRoundConfirmId)
    };
    setSelectedMatch(updatedMatch);
    setDeleteRoundConfirmId(null);
  };

  const confirmDeleteMatch = () => {
    if (deleteMatchConfirmId) {
      onDeleteMatch(deleteMatchConfirmId);
      setDeleteMatchConfirmId(null);
    }
  };

  const handleAddRound = () => {
    if (!selectedMatch || !newRound.myDeckSnapshot) return;

    let updatedRounds;
    if (editingRoundId) {
      updatedRounds = selectedMatch.rounds.map(r => 
        r.id === editingRoundId 
          ? { 
              ...r, 
              myDeckSnapshot: newRound.myDeckSnapshot!,
              opponentDeckName: newRound.opponentDeckName || 'Unknown Deck',
              opponentColors: newRound.opponentColors || [],
              result: newRound.result as 'Win' | 'Lose',
              notes: newRound.notes || ''
            } 
          : r
      );
    } else {
      const round: MatchRound = {
        id: Math.random().toString(36).substr(2, 9),
        roundNumber: selectedMatch.rounds.length + 1,
        myDeckSnapshot: newRound.myDeckSnapshot,
        opponentDeckName: newRound.opponentDeckName || 'Unknown Deck',
        opponentColors: newRound.opponentColors || [],
        result: newRound.result as 'Win' | 'Lose',
        notes: newRound.notes || ''
      };
      updatedRounds = [...selectedMatch.rounds, round];
    }

    const updatedMatch = {
      ...selectedMatch,
      rounds: updatedRounds
    };

    setSelectedMatch(updatedMatch);
    setView('match-detail');
    setEditingRoundId(null);
    setNewRound({
      opponentDeckName: '',
      opponentColors: [],
      result: 'Win',
      notes: ''
    });
  };

  const handleSaveMatch = () => {
    if (selectedMatch) {
      if (isEditing) {
        onUpdateMatch(selectedMatch);
      } else {
        onAddMatch(selectedMatch);
      }
      setView('history');
      setSelectedMatch(null);
      setIsEditing(false);
    }
  };

  const toggleOpponentColor = (color: string) => {
    setNewRound(prev => {
      const currentColors = prev.opponentColors || [];
      const isSelected = currentColors.includes(color);
      
      if (isSelected) {
        return { 
          ...prev, 
          opponentColors: currentColors.filter(c => c !== color) 
        };
      } else {
        // Only allow addition if there's less than 2 colors selected
        if (currentColors.length < 2) {
          return { 
            ...prev, 
            opponentColors: [...currentColors, color] 
          };
        }
        return prev;
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F5F5F0] overflow-hidden min-h-0 relative">
      {/* Delete Match Confirmation Modal */}
      {deleteMatchConfirmId && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl space-y-6"
          >
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="font-bold text-lg">Delete Match?</h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                Are you sure you wish to delete this match history? This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setDeleteMatchConfirmId(null)}
                className="py-3 px-4 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-200 transition-colors"
              >
                No
              </button>
              <button 
                onClick={confirmDeleteMatch}
                className="py-3 px-4 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Yes
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Round Confirmation Modal */}
      {deleteRoundConfirmId && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl space-y-6"
          >
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="font-bold text-lg">Delete Round?</h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                Are you sure you wish to delete this round? This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setDeleteRoundConfirmId(null)}
                className="py-3 px-4 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-200 transition-colors"
              >
                No
              </button>
              <button 
                onClick={confirmDeleteRound}
                className="py-3 px-4 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                Yes
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {view === 'menu' && (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center p-6 gap-4"
          >
            <div className="w-20 h-20 bg-white rounded-3xl shadow-xl shadow-stone-200 flex items-center justify-center text-amber-500 mb-4">
              <Swords size={40} />
            </div>
            <h2 className="text-2xl font-black text-[#141414] tracking-tight">Game Center</h2>
            <p className="text-stone-500 text-sm text-center max-w-[240px] mb-8">
              Track your performance, record match results, and analyze your decks.
            </p>
            
            <button 
              onClick={() => setView('history')}
              className="w-full max-w-xs py-4 bg-white border border-stone-200 rounded-2xl flex items-center justify-between px-6 hover:bg-stone-50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                  <History size={20} />
                </div>
                <span className="font-bold text-[#141414]">Match results & history</span>
              </div>
              <ChevronRight size={20} className="text-stone-300" />
            </button>
          </motion.div>
        )}

        {view === 'history' && (
          <motion.div 
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="p-4 flex items-center justify-between border-b border-stone-200 bg-white">
              <button onClick={() => setView('menu')} className="p-2 -ml-2 text-stone-400 hover:text-[#141414]">
                <ChevronLeft size={24} />
              </button>
              <h2 className="font-black text-lg tracking-tight">Match History</h2>
              <button 
                onClick={() => setView('create-match')}
                className="p-2 bg-[#141414] text-white rounded-xl shadow-lg shadow-stone-200 active:scale-95 transition-all"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
              {matches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                  <History size={48} className="mb-4 text-stone-300" />
                  <p className="text-sm font-medium text-stone-500">No matches recorded yet</p>
                  <button 
                    onClick={() => setView('create-match')}
                    className="mt-4 text-amber-600 font-bold text-sm"
                  >
                    Start your first entry
                  </button>
                </div>
              ) : (
                matches.sort((a,b) => b.createdAt - a.createdAt).map(match => (
                  <div 
                    key={match.id}
                    className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm relative group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <button 
                        onClick={() => handleEditMatch(match)}
                        className="flex-1 text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                            match.nature === 'Newtype challenge' ? "bg-purple-100 text-purple-700" :
                            match.nature === 'Shop battle' ? "bg-amber-100 text-amber-700" :
                            "bg-stone-100 text-stone-600"
                          )}>
                            {match.nature}
                          </span>
                          <span className="text-[10px] text-stone-400 font-medium">{match.date}</span>
                        </div>
                        <h3 className="font-bold text-[#141414]">{match.shopName}</h3>
                      </button>
                      <div className="text-right">
                        <div className="text-lg font-black text-[#141414]">
                          {match.rounds.filter(r => r.result === 'Win').length} - {match.rounds.filter(r => r.result === 'Lose').length}
                        </div>
                        <div className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">W/L</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {match.rounds.map((round, idx) => (
                        <div key={round.id} className="flex items-center justify-between text-xs py-1 border-t border-stone-50">
                          <div className="flex items-center gap-2">
                            <span className="text-stone-400 font-bold">R{idx + 1}</span>
                            <span className="font-medium text-stone-600">{round.myDeckSnapshot.name}</span>
                            <span className="text-stone-300">vs</span>
                            <span className="font-medium text-stone-600">{round.opponentDeckName}</span>
                          </div>
                          <span className={cn(
                            "font-black uppercase tracking-wider text-[9px]",
                            round.result === 'Win' ? "text-emerald-500" : "text-red-500"
                          )}>
                            {round.result}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => setDeleteMatchConfirmId(match.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {view === 'create-match' && (
          <motion.div 
            key="create-match"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="p-4 flex items-center justify-between border-b border-stone-200 bg-white">
              <button onClick={() => setView('history')} className="p-2 -ml-2 text-stone-400 hover:text-[#141414]">
                <ChevronLeft size={24} />
              </button>
              <h2 className="font-black text-lg tracking-tight">New Match Entry</h2>
              <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-2">
                  <Tag size={12} /> Nature of the match
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['Free & Casual', 'Shop battle', 'Newtype challenge'] as MatchNature[]).map(nature => (
                    <button
                      key={nature}
                      onClick={() => setNewMatch(prev => ({ ...prev, nature }))}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                        newMatch.nature === nature 
                          ? "bg-[#141414] text-white border-[#141414] shadow-lg shadow-stone-200" 
                          : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
                      )}
                    >
                      {nature}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-2">
                  <MapPin size={12} /> Name of the shop
                </label>
                <input 
                  type="text"
                  placeholder="Happyland TCG"
                  value={newMatch.shopName}
                  onChange={(e) => setNewMatch(prev => ({ ...prev, shopName: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-2">
                  <Calendar size={12} /> Date of the battle
                </label>
                <input 
                  type="date"
                  value={newMatch.date}
                  onChange={(e) => setNewMatch(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                />
              </div>

              <button 
                onClick={handleCreateMatch}
                className="w-full py-4 bg-[#141414] text-white rounded-2xl font-black text-sm shadow-xl shadow-stone-200 active:scale-95 transition-all mt-8"
              >
                OK to confirm
              </button>
            </div>
          </motion.div>
        )}

        {view === 'match-detail' && selectedMatch && (
          <motion.div 
            key="match-detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="p-4 flex items-center justify-between border-b border-stone-200 bg-white">
              <button onClick={handleSaveMatch} className="p-2 -ml-2 text-stone-400 hover:text-[#141414]">
                <ChevronLeft size={24} />
              </button>
              <div className="text-center">
                <h2 className="font-black text-sm tracking-tight">{selectedMatch.shopName}</h2>
                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{selectedMatch.nature}</p>
              </div>
              <button 
                onClick={handleSaveMatch}
                className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                Save
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-400">Rounds</h3>
                <button 
                  onClick={() => {
                    setNewRound({
                      opponentDeckName: '',
                      opponentColors: [],
                      result: 'Win',
                      notes: ''
                    });
                    setView('add-round');
                  }}
                  className="flex items-center gap-1.5 text-amber-600 font-bold text-xs"
                >
                  <Plus size={14} /> Add round
                </button>
              </div>

              {selectedMatch.rounds.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-stone-200">
                  <Swords size={32} className="text-stone-200 mb-3" />
                  <p className="text-xs font-medium text-stone-400">No rounds added yet</p>
                  <button 
                    onClick={() => {
                      setNewRound({
                        opponentDeckName: '',
                        opponentColors: [],
                        result: 'Win',
                        notes: ''
                      });
                      setView('add-round');
                    }}
                    className="mt-4 px-6 py-2 bg-stone-100 text-stone-600 rounded-xl text-[10px] font-black uppercase tracking-wider"
                  >
                    Add First Round
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedMatch.rounds.map((round, idx) => {
                    const myColors = Array.from(new Set(round.myDeckSnapshot.items.map(i => i.card.color)));
                    
                    return (
                      <div key={round.id} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm relative group">
                        <div className="absolute top-4 right-4 flex gap-1 transition-opacity">
                          <button 
                            onClick={() => handleEditRound(round)}
                            className="p-2 text-stone-300 hover:text-amber-600 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteRound(round.id)}
                            className="p-2 text-stone-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 bg-stone-100 rounded-lg flex items-center justify-center text-[10px] font-black text-stone-500">
                              R{idx + 1}
                            </span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                              round.result === 'Win' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                            )}>
                              {round.result}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-4 mb-3">
                          <div className="text-center">
                            <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">My Deck</div>
                            <div className="font-bold text-sm truncate mb-1.5">{round.myDeckSnapshot.name}</div>
                            <div className="flex justify-center gap-1">
                              {myColors.map(color => (
                                <div key={color} className={cn("w-2 h-2 rounded-full", getColorBg(color))} />
                              ))}
                            </div>
                          </div>
                          <div className="text-stone-300 font-black italic mt-5">VS</div>
                          <div className="text-center">
                            <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Opponent</div>
                            <div className="font-bold text-sm truncate mb-1.5">{round.opponentDeckName}</div>
                            <div className="flex justify-center gap-1">
                              {round.opponentColors.map(color => (
                                <div key={color} className={cn("w-2 h-2 rounded-full", getColorBg(color))} />
                              ))}
                            </div>
                          </div>
                        </div>
                        {round.notes && (
                          <div className="mt-3 pt-3 border-t border-stone-50">
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">
                              <FileText size={10} /> Notes
                            </div>
                            <p className="text-xs text-stone-500 italic leading-relaxed">"{round.notes}"</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {view === 'add-round' && (
          <motion.div 
            key="add-round"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="p-4 flex items-center justify-between border-b border-stone-200 bg-white">
              <button onClick={() => { setView('match-detail'); setEditingRoundId(null); }} className="p-2 -ml-2 text-stone-400 hover:text-[#141414]">
                <ChevronLeft size={24} />
              </button>
              <h2 className="font-black text-lg tracking-tight">{editingRoundId ? 'Edit Round' : 'Add Round'}</h2>
              <div className="w-10" />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
              {/* My Deck Selection */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 flex items-center justify-between">
                  <span>Participating Deck</span>
                  {newRound.myDeckSnapshot && <Check size={14} className="text-emerald-500" />}
                </label>
                <button 
                  onClick={() => setIsSelectingDeck(true)}
                  className={cn(
                    "w-full px-4 py-4 border-2 border-dashed rounded-2xl flex items-center justify-between transition-all",
                    newRound.myDeckSnapshot 
                      ? "bg-white border-amber-500/30 text-[#141414]" 
                      : "bg-stone-50 border-stone-200 text-stone-400 hover:bg-stone-100"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      newRound.myDeckSnapshot ? "bg-amber-100 text-amber-600" : "bg-stone-200 text-stone-400"
                    )}>
                      <Trophy size={20} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm">
                        {newRound.myDeckSnapshot ? newRound.myDeckSnapshot.name : "Select your deck"}
                      </div>
                      <div className="text-[10px] uppercase font-black tracking-wider opacity-50">
                        {newRound.myDeckSnapshot ? `${newRound.myDeckSnapshot.items.length} Cards` : "Pick from your list"}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Opponent Deck */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Opponent Deck</label>
                <div className="space-y-4">
                  <input 
                    type="text"
                    placeholder="Opponent Deck Name"
                    value={newRound.opponentDeckName}
                    onChange={(e) => setNewRound(prev => ({ ...prev, opponentDeckName: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                  />
                  
                  <div className="space-y-2">
                    <div className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Opponent Colors</div>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map(color => (
                        <button
                          key={color}
                          onClick={() => toggleOpponentColor(color)}
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center",
                            newRound.opponentColors?.includes(color) 
                              ? "border-[#141414] scale-110 shadow-md" 
                              : "border-transparent",
                            color === 'Red' ? 'bg-red-500' :
                            color === 'Blue' ? 'bg-blue-500' :
                            color === 'Green' ? 'bg-emerald-500' :
                            color === 'White' ? 'bg-stone-200' :
                            'bg-purple-500'
                          )}
                        >
                          {newRound.opponentColors?.includes(color) && (
                            <Check size={14} className={cn(
                              color === 'White' ? 'text-stone-800' : 'text-white'
                            )} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Result */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Round Result</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNewRound(prev => ({ ...prev, result: 'Win' }))}
                    className={cn(
                      "py-4 rounded-2xl font-black text-sm transition-all border",
                      newRound.result === 'Win' 
                        ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20" 
                        : "bg-white text-stone-400 border-stone-200"
                    )}
                  >
                    WIN
                  </button>
                  <button
                    onClick={() => setNewRound(prev => ({ ...prev, result: 'Lose' }))}
                    className={cn(
                      "py-4 rounded-2xl font-black text-sm transition-all border",
                      newRound.result === 'Lose' 
                        ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20" 
                        : "bg-white text-stone-400 border-stone-200"
                    )}
                  >
                    LOSE
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 flex items-center gap-2">
                  <FileText size={12} /> Notes & Reflection
                </label>
                <textarea 
                  placeholder="Type your personal notes about the match..."
                  value={newRound.notes}
                  onChange={(e) => setNewRound(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 bg-white border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-sm resize-none"
                />
              </div>

              <button 
                onClick={handleAddRound}
                disabled={!newRound.myDeckSnapshot}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-sm shadow-xl transition-all mt-8",
                  newRound.myDeckSnapshot
                    ? "bg-[#141414] text-white shadow-stone-200 active:scale-95" 
                    : "bg-stone-200 text-stone-400 cursor-not-allowed"
                )}
              >
                {editingRoundId ? 'Update Round' : 'OK to confirm'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deck Selection Overlay */}
      <AnimatePresence>
        {isSelectingDeck && (
          <DeckList 
            decks={decks}
            onSelectDeck={(id) => {
              const deck = decks.find(d => d.id === id);
              if (deck) {
                const snapshot: DeckSnapshot = {
                  id: deck.id,
                  name: deck.name,
                  items: [...deck.items]
                };
                setNewRound(prev => ({ ...prev, myDeckSnapshot: snapshot }));
              }
              setIsSelectingDeck(false);
            }}
            onCreateDeck={() => {}}
            onDeleteDeck={() => {}}
            onRenameDeck={() => {}}
            onClose={() => setIsSelectingDeck(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
