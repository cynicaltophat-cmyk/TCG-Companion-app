import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Minus, 
  ChevronRight,
  Layout,
  Scan,
  Hand,
  X,
  Info,
  ArrowRightLeft,
  Dices,
  RotateCcw,
  Trash2,
  Search,
  ChevronLeft
} from 'lucide-react';
import { GundamCard, ArtVariantType, DeckItem } from '../types';
import { cn } from '../lib/utils';

interface PlayModeToolProps {
  allCards: GundamCard[];
  onClose: () => void;
}

export const PlayModeTool: React.FC<PlayModeToolProps> = ({ allCards, onClose }) => {
  const [playModeStep, setPlayModeStep] = React.useState<'setup_choice' | 'shuffle' | 'dice_roll' | 'draw_five' | 'starting_hand_tips' | 'mulligan_instruction' | 'shuffle_after_mulligan' | 'shield_setup' | 'ex_base_setup' | 'main_deck_setup' | 'resource_setup' | 'ex_resource_setup' | 'graveyard_setup' | 'final_setup_check' | 'playing'>('setup_choice');
  const [turnOrder, setTurnOrder] = React.useState<'first' | 'second' | null>(null);
  const [diceResults, setDiceResults] = React.useState<number[] | null>(null);
  const [replayKey, setReplayKey] = React.useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const handCarouselRef = React.useRef<HTMLDivElement>(null);
  const [currentHand, setCurrentHand] = React.useState<(DeckItem & { handId: string })[]>([]);
  const sortedHand = React.useMemo(() => {
    return [...currentHand].sort((a, b) => (a.card.level || 0) - (b.card.level || 0));
  }, [currentHand]);
  const [isAddHandModalOpen, setIsAddHandModalOpen] = React.useState(false);
  const [isStartingHandSetup, setIsStartingHandSetup] = React.useState(false);
  const [isExitPlayModalOpen, setIsExitPlayModalOpen] = React.useState(false);
  const [resourceLevel, setResourceLevel] = React.useState(0);
  const [selectedHandIndex, setSelectedHandIndex] = React.useState(0);
  const [playTab, setPlayTab] = React.useState<'card_info'>('card_info');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [addedItems, setAddedItems] = React.useState<Record<string, boolean>>({});

  const filteredCards = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return allCards.filter(card => 
      card.name.toLowerCase().includes(query) || 
      card.cardNumber.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [allCards, searchQuery]);

  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [playModeStep]);

  return (
    <div className="fixed inset-0 z-[150] bg-[#F5F5F0] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-[#141414]/10 px-4 py-4 shrink-0">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsExitPlayModalOpen(true)}
              className="p-2 -ml-2 text-stone-400 hover:text-[#141414] transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-black text-[#141414] tracking-tight uppercase">Play Mode</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
              playModeStep === 'playing' ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"
            )}>
              {playModeStep === 'playing' ? 'Live' : 'Setup'}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto no-scrollbar">
        <div className="max-w-md mx-auto p-4 flex flex-col min-h-[60vh]">
          <AnimatePresence mode="wait">
            {playModeStep === 'setup_choice' ? (
              <motion.div 
                key="setup_choice"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-12"
              >
                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <Scan size={40} />
                </div>
                <div className="space-y-2 max-w-[280px]">
                  <h3 className="text-xl font-black uppercase tracking-tight">Game Setup</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">
                    Do you wish to go through the whole set up process or skip to playing.
                  </p>
                </div>
                <div className="flex flex-col w-full gap-3 max-w-[240px]">
                  <button 
                    onClick={() => setPlayModeStep('shuffle')}
                    className="w-full py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-black/10 active:scale-95 transition-all"
                  >
                    Do the whole set up
                  </button>
                  <button 
                    onClick={() => setPlayModeStep('playing')}
                    className="w-full py-4 bg-white text-stone-600 border border-stone-200 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
                  >
                    Skip set up
                  </button>
                </div>
              </motion.div>
            ) : playModeStep === 'shuffle' ? (
              <motion.div 
                key="shuffle"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-12"
              >
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Layout size={40} />
                </div>
                <div className="space-y-2 max-w-[280px]">
                  <h3 className="text-xl font-black uppercase tracking-tight">Shuffle Deck</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">
                    Shuffle your deck first and then allow your opponent to cut your deck.
                  </p>
                </div>
                <button 
                  onClick={() => setPlayModeStep('dice_roll')}
                  className="w-full max-w-[240px] py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-black/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </motion.div>
            ) : playModeStep === 'dice_roll' ? (
              <motion.div 
                key="dice_roll"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-12"
              >
                <div className="flex items-center gap-4">
                  <div className="flex gap-4">
                    {diceResults ? (
                      diceResults.map((val, i) => (
                        <motion.div 
                          key={i}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          className="w-16 h-16 bg-white border-2 border-stone-200 rounded-2xl flex items-center justify-center shadow-sm"
                        >
                          <span className="text-2xl font-black text-[#141414]">{val}</span>
                        </motion.div>
                      ))
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                        <Dices size={40} />
                      </div>
                    )}
                  </div>
                  
                  {diceResults && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => {
                        const r1 = Math.floor(Math.random() * 6) + 1;
                        const r2 = Math.floor(Math.random() * 6) + 1;
                        setDiceResults([r1, r2]);
                      }}
                      className="p-3 bg-stone-100 text-stone-600 rounded-full hover:bg-stone-200 transition-colors active:scale-90 shadow-sm"
                      title="Reroll"
                    >
                      <RotateCcw size={20} />
                    </motion.button>
                  )}
                </div>

                <div className="space-y-2 max-w-[280px]">
                  <h3 className="text-xl font-black uppercase tracking-tight">
                    {diceResults ? `Roll number total: ${diceResults[0] + diceResults[1]}` : "Turn Order"}
                  </h3>
                  {!diceResults && (
                    <p className="text-stone-500 text-sm leading-relaxed">
                      Highroll with 2 dice. Highest number gets to decide if they wish to go first or second.
                    </p>
                  )}
                </div>

                <div className="flex flex-col w-full gap-3 max-w-[240px]">
                  {!diceResults ? (
                    <button 
                      onClick={() => {
                        const r1 = Math.floor(Math.random() * 6) + 1;
                        const r2 = Math.floor(Math.random() * 6) + 1;
                        setDiceResults([r1, r2]);
                      }}
                      className="w-full py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-black/10 active:scale-95 transition-all"
                    >
                      Simulate dice roll
                    </button>
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                          setTurnOrder('first');
                          setPlayModeStep('draw_five');
                        }}
                        className="w-full py-4 bg-white text-stone-600 border border-stone-200 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
                      >
                        Going first
                      </button>
                      <button 
                        onClick={() => {
                          setTurnOrder('second');
                          setPlayModeStep('draw_five');
                        }}
                        className="w-full py-4 bg-white text-stone-600 border border-stone-200 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
                      >
                        Going second
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ) : playModeStep === 'draw_five' ? (
              <motion.div 
                key="draw_five"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-12"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Hand size={40} />
                </div>
                <div className="space-y-2 max-w-[280px]">
                  <h3 className="text-xl font-black uppercase tracking-tight">Draw Cards</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">
                    Draw 5 card from the top of your deck
                  </p>
                </div>
                <button 
                  onClick={() => setPlayModeStep('starting_hand_tips')}
                  className="w-full max-w-[240px] py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-black/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </motion.div>
            ) : playModeStep === 'starting_hand_tips' ? (
              <motion.div 
                key="starting_hand_tips"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-12"
              >
                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <Info size={40} />
                </div>
                <div className="space-y-4 max-w-[280px]">
                  <h3 className="text-xl font-black uppercase tracking-tight">Starting Hand Tips</h3>
                  <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                    <p className="text-amber-900 font-medium leading-relaxed">
                      Your starting hand should consist of 2 - 3 low level and cost units.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col w-full gap-3 max-w-[240px]">
                  <button 
                    onClick={() => setPlayModeStep('shield_setup')}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    Keep hand
                  </button>
                  <button 
                    onClick={() => setPlayModeStep('mulligan_instruction')}
                    className="w-full py-4 bg-white text-stone-600 border border-stone-200 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
                  >
                    Mulligan
                  </button>
                </div>
              </motion.div>
            ) : playModeStep === 'mulligan_instruction' ? (
              <motion.div 
                key="mulligan_instruction"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-12"
              >
                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <ArrowRightLeft size={40} />
                </div>
                <div className="space-y-4 max-w-[280px]">
                  <h3 className="text-xl font-black uppercase tracking-tight">Mulligan</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">
                    Return the 5 cards to the bottom of your deck.
                  </p>
                  <p className="text-stone-500 text-sm leading-relaxed font-bold">
                    Draw 5 more cards from the top of the deck.
                  </p>
                </div>
                <button 
                  onClick={() => setPlayModeStep('shuffle_after_mulligan')}
                  className="w-full max-w-[240px] py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-black/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </motion.div>
            ) : playModeStep === 'shuffle_after_mulligan' ? (
              <motion.div 
                key="shuffle_after_mulligan"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-12"
              >
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Layout size={40} />
                </div>
                <div className="space-y-2 max-w-[280px]">
                  <h3 className="text-xl font-black uppercase tracking-tight">Shuffle</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">
                    Shuffle your deck and allow your opponent to cut your deck.
                  </p>
                </div>
                <button 
                  onClick={() => setPlayModeStep('shield_setup')}
                  className="w-full max-w-[240px] py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-black/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </motion.div>
            ) : (playModeStep === 'shield_setup' || playModeStep === 'ex_base_setup' || playModeStep === 'main_deck_setup' || playModeStep === 'resource_setup' || playModeStep === 'ex_resource_setup' || playModeStep === 'graveyard_setup' || playModeStep === 'final_setup_check') ? (
              <motion.div 
                key="setup_visual_flow"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col space-y-6 py-4"
              >
                <div 
                  key={replayKey}
                  className="bg-stone-100 rounded-3xl p-4 aspect-[1.5/1] relative border-4 border-stone-200 shadow-inner overflow-hidden"
                >
                  {/* Visual Setup Helper */}
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-5 pointer-events-none">
                    <div className="border-r border-b border-stone-900" />
                    <div className="border-b border-stone-900" />
                    <div className="border-r border-stone-900" />
                    <div className="border-stone-900" />
                  </div>

                  {/* Shields - Lower Left */}
                  {(['shield_setup', 'ex_base_setup', 'main_deck_setup', 'resource_setup', 'ex_resource_setup', 'graveyard_setup', 'final_setup_check'].includes(playModeStep)) && (
                    <div className="absolute bottom-16 left-6 flex flex-col-reverse gap-0.5">
                      {[...Array(6)].map((_, i) => (
                        <motion.div 
                          key={i}
                          initial={playModeStep === 'shield_setup' ? { opacity: 0, x: -20 } : false}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.3, duration: 0.5 }}
                          className={cn(
                            "w-12 bg-white border border-stone-300 rounded-sm shadow-sm",
                            i === 5 ? "h-8" : "h-2.5"
                          )}
                        />
                      ))}
                      <div className="text-[6px] font-black text-stone-400 uppercase tracking-tighter mt-0.5">Shields</div>
                    </div>
                  )}

                  {/* EX BASE - Upper Left */}
                  {(['ex_base_setup', 'main_deck_setup', 'resource_setup', 'ex_resource_setup', 'graveyard_setup', 'final_setup_check'].includes(playModeStep)) && (
                    <motion.div 
                      initial={playModeStep === 'ex_base_setup' ? { opacity: 0, scale: 0.8 } : false}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute top-4 left-6"
                    >
                      <div className="w-12 h-16 bg-amber-100 border-2 border-amber-300 rounded-md flex items-center justify-center shadow-md">
                        <span className="text-[6px] font-black text-amber-600 uppercase text-center px-1">EX BASE</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Main Deck - Top Right */}
                  {(['main_deck_setup', 'resource_setup', 'ex_resource_setup', 'graveyard_setup', 'final_setup_check'].includes(playModeStep)) && (
                    <motion.div 
                      initial={playModeStep === 'main_deck_setup' ? { opacity: 0, y: -20 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-4 right-6"
                    >
                      <div className="w-12 h-18 bg-stone-800 border-2 border-stone-900 rounded-md flex items-center justify-center shadow-xl relative">
                        <div className="absolute inset-1 border border-white/10 rounded-sm" />
                        <span className="text-[6px] font-black text-white uppercase">Deck</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Resource Pile - Lower Left */}
                  {(['resource_setup', 'ex_resource_setup', 'graveyard_setup', 'final_setup_check'].includes(playModeStep)) && (
                    <motion.div 
                      initial={playModeStep === 'resource_setup' ? { opacity: 0, y: 20 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-4 left-6"
                    >
                      <div className="w-12 h-8 bg-emerald-50 border-2 border-emerald-200 rounded-md flex items-center justify-center shadow-sm">
                        <span className="text-[6px] font-black text-emerald-600 uppercase">Resource</span>
                      </div>
                    </motion.div>
                  )}

                  {/* EX Resource */}
                  {(['ex_resource_setup', 'graveyard_setup', 'final_setup_check'].includes(playModeStep) && turnOrder === 'second') && (
                    <motion.div 
                      initial={playModeStep === 'ex_resource_setup' ? { opacity: 0, x: 20 } : false}
                      animate={{ opacity: 1, x: 0 }}
                      className="absolute bottom-4 left-20"
                    >
                      <div className="w-12 h-8 bg-amber-50 border-2 border-amber-200 rounded-md flex items-center justify-center shadow-sm">
                        <span className="text-[6px] font-black text-amber-600 uppercase">EX Resource</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Graveyard */}
                  {(['graveyard_setup', 'final_setup_check'].includes(playModeStep)) && (
                    <motion.div 
                      initial={playModeStep === 'graveyard_setup' ? { opacity: 0, y: 20 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-4 right-6"
                    >
                      <div className="w-12 h-16 bg-stone-200 border-2 border-stone-300 border-dashed rounded-md flex items-center justify-center">
                        <span className="text-[6px] font-black text-stone-400 uppercase text-center px-1">Graveyard</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-4 text-center">
                  <div className="min-h-[80px] flex items-center justify-center px-4">
                    <p className="text-sm text-stone-600 font-medium leading-relaxed">
                      {playModeStep === 'shield_setup' && "Place 6 cards face-down horizontally from the top of the deck to act as shields/life."}
                      {playModeStep === 'ex_base_setup' && "Place your EX BASE at the top of the shield stack"}
                      {playModeStep === 'main_deck_setup' && "Place your main deck on the top right side of your playing area."}
                      {playModeStep === 'resource_setup' && "Place your resource on the lower left corner of your playing area."}
                      {playModeStep === 'ex_resource_setup' && "Placing the EX resource. Place it to the right of your green resource."}
                      {playModeStep === 'graveyard_setup' && "Your graveyard will be below the main deck."}
                      {playModeStep === 'final_setup_check' && "All done! Your set up should look like this."}
                    </p>
                  </div>

                  <button 
                    onClick={() => {
                      if (playModeStep === 'shield_setup') setPlayModeStep('ex_base_setup');
                      else if (playModeStep === 'ex_base_setup') setPlayModeStep('main_deck_setup');
                      else if (playModeStep === 'main_deck_setup') setPlayModeStep('resource_setup');
                      else if (playModeStep === 'resource_setup') {
                        if (turnOrder === 'second') setPlayModeStep('ex_resource_setup');
                        else setPlayModeStep('graveyard_setup');
                      }
                      else if (playModeStep === 'ex_resource_setup') setPlayModeStep('graveyard_setup');
                      else if (playModeStep === 'graveyard_setup') setPlayModeStep('final_setup_check');
                      else if (playModeStep === 'final_setup_check') setPlayModeStep('playing');
                    }}
                    className="w-full py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all"
                  >
                    {playModeStep === 'final_setup_check' ? 'Start Playing' : 'Next'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="playing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {/* Resource Bar */}
                <div className="bg-stone-50/50 p-4 rounded-2xl border border-stone-100 space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <button 
                      onClick={() => setResourceLevel(prev => Math.max(0, prev - 1))}
                      className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 active:scale-90 transition-all shadow-sm"
                    >
                      <Minus size={20} />
                    </button>
                    
                    <div className="flex-1 flex gap-1 justify-between">
                      {[...Array(10)].map((_, i) => (
                        <div 
                          key={i}
                          className={cn(
                            "flex-1 h-8 rounded-sm transition-all duration-300",
                            i < resourceLevel ? "bg-stone-600" : "bg-stone-200"
                          )}
                        />
                      ))}
                    </div>

                    <button 
                      onClick={() => setResourceLevel(prev => Math.min(10, prev + 1))}
                      className="w-10 h-10 rounded-full bg-stone-600 flex items-center justify-center text-white active:scale-90 transition-all shadow-sm"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                      Resource level: {resourceLevel}
                    </p>
                  </div>
                </div>

                {/* Hand Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Hand size={14} className="text-stone-400" />
                    <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                      Hand: {currentHand.length}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setIsAddHandModalOpen(true)}
                    className="px-4 py-2 bg-[#141414] text-white rounded-xl font-black text-[8px] uppercase tracking-wider flex items-center gap-2 shadow-sm active:scale-95 transition-all"
                  >
                    <Plus size={12} />
                    Add card
                  </button>
                </div>

                {/* Hand Carousel */}
                {currentHand.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center text-stone-400 bg-white rounded-3xl border border-stone-100 border-dashed">
                    <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center mb-4">
                      <Hand size={32} />
                    </div>
                    <p className="text-sm font-black uppercase tracking-tight">Your hand is empty</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div ref={handCarouselRef} className="flex gap-3 overflow-x-auto pt-2 pb-4 px-1 snap-x no-scrollbar">
                      {sortedHand.map((item, idx) => (
                        <div 
                          key={item.handId}
                          className="w-[100px] shrink-0 snap-start flex flex-col gap-2"
                          onClick={() => setSelectedHandIndex(idx)}
                        >
                          <div className={cn(
                            "aspect-[2/3] rounded-xl transition-all duration-200 relative overflow-hidden",
                            selectedHandIndex === idx ? "scale-105 border-2 border-black shadow-xl" : "border border-stone-200 shadow-sm"
                          )}>
                            <img 
                              src={item.card.imageUrl} 
                              alt={item.card.name}
                              className="w-full h-full object-cover"
                              crossOrigin="anonymous"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Card Info */}
                    {sortedHand[selectedHandIndex] && (
                      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-black text-stone-800">{sortedHand[selectedHandIndex].card.name}</h4>
                            <p className="text-[10px] font-mono text-stone-400">{sortedHand[selectedHandIndex].card.cardNumber}</p>
                          </div>
                          <button 
                            onClick={() => {
                              setCurrentHand(prev => prev.filter((_, i) => i !== selectedHandIndex));
                              setSelectedHandIndex(prev => Math.max(0, prev - 1));
                            }}
                            className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="bg-stone-50 p-2 rounded-xl text-center">
                            <p className="text-[8px] font-black text-stone-400 uppercase tracking-tighter">Cost</p>
                            <p className="text-xs font-bold text-stone-800">{sortedHand[selectedHandIndex].card.cost}</p>
                          </div>
                          <div className="bg-stone-50 p-2 rounded-xl text-center">
                            <p className="text-[8px] font-black text-stone-400 uppercase tracking-tighter">Lvl</p>
                            <p className="text-xs font-bold text-stone-800">{sortedHand[selectedHandIndex].card.level || '-'}</p>
                          </div>
                          <div className="bg-stone-50 p-2 rounded-xl text-center">
                            <p className="text-[8px] font-black text-stone-400 uppercase tracking-tighter">AP</p>
                            <p className="text-xs font-bold text-stone-800">{sortedHand[selectedHandIndex].card.ap || '-'}</p>
                          </div>
                          <div className="bg-stone-50 p-2 rounded-xl text-center">
                            <p className="text-[8px] font-black text-stone-400 uppercase tracking-tighter">HP</p>
                            <p className="text-xs font-bold text-stone-800">{sortedHand[selectedHandIndex].card.hp || '-'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Add Card Modal */}
      <AnimatePresence>
        {isAddHandModalOpen && (
          <div className="fixed inset-0 z-[200] flex flex-col bg-white">
            <header className="p-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-lg font-black uppercase tracking-tight">Add Card to Hand</h3>
              <button 
                onClick={() => setIsAddHandModalOpen(false)}
                className="p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </header>
            
            <div className="p-4 border-b border-stone-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                <input 
                  type="text"
                  placeholder="Search by name or card number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#141414]/5 transition-all text-sm"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredCards.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {filteredCards.map(card => (
                    <button 
                      key={card.id}
                      onClick={() => {
                        const handId = Math.random().toString(36).substr(2, 9);
                        setCurrentHand(prev => [...prev, { card, count: 1, artType: 'Base art', handId }]);
                        setAddedItems(prev => ({ ...prev, [card.id]: true }));
                        setTimeout(() => {
                          setAddedItems(prev => ({ ...prev, [card.id]: false }));
                        }, 1000);
                      }}
                      className="flex flex-col gap-2 text-left group relative active:scale-95 transition-all"
                    >
                      <div className="aspect-[2/3] rounded-xl overflow-hidden border border-stone-200 group-hover:border-[#141414] transition-colors relative">
                        <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                        {addedItems[card.id] && (
                          <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[1px] flex items-center justify-center">
                            <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">Added</span>
                          </div>
                        )}
                      </div>
                      <div className="px-1">
                        <p className="text-[10px] font-bold truncate">{card.name}</p>
                        <p className="text-[8px] font-mono text-stone-400">{card.cardNumber}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery ? (
                <div className="flex flex-col items-center justify-center py-20 text-stone-400">
                  <Search size={40} className="mb-4 opacity-20" />
                  <p className="text-sm font-medium">No cards found matching "{searchQuery}"</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-stone-400">
                  <Hand size={40} className="mb-4 opacity-20" />
                  <p className="text-sm font-medium">Type to search for cards to add</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-100">
              <button 
                onClick={() => setIsAddHandModalOpen(false)}
                className="w-full py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg active:scale-95 transition-all"
              >
                Done ({currentHand.length} cards)
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Exit Confirmation */}
      <AnimatePresence>
        {isExitPlayModalOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl space-y-6"
            >
              <div className="space-y-2 text-center">
                <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RotateCcw size={24} />
                </div>
                <h3 className="font-bold text-lg">Exit Play Mode?</h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  Your current game state (resource, hand) will be lost.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setIsExitPlayModalOpen(false)}
                  className="py-3 px-4 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm active:scale-95 transition-all"
                >
                  Stay
                </button>
                <button 
                  onClick={onClose}
                  className="py-3 px-4 bg-red-500 text-white rounded-xl font-bold text-sm active:scale-95 transition-all shadow-lg shadow-red-500/20"
                >
                  Exit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
