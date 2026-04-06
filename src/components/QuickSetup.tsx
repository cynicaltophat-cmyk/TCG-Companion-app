import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Scan, Layout, Dices, Hand, 
  ChevronRight, RotateCcw, ArrowRightLeft, Zap,
  Swords
} from 'lucide-react';
import { cn } from '../lib/utils';

interface QuickSetupProps {
  isOpen: boolean;
  onClose: () => void;
}

type SetupStep = 
  | 'shuffle' 
  | 'dice_roll' 
  | 'draw_five' 
  | 'starting_hand_tips' 
  | 'mulligan_instruction' 
  | 'shuffle_after_mulligan' 
  | 'shield_setup' 
  | 'ex_base_setup' 
  | 'main_deck_setup' 
  | 'resource_setup' 
  | 'ex_resource_setup' 
  | 'graveyard_setup' 
  | 'final_setup_check' 
  | 'complete';

export const QuickSetup: React.FC<QuickSetupProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = React.useState<SetupStep>('shuffle');
  const [diceResults, setDiceResults] = React.useState<[number, number] | null>(null);
  const [turnOrder, setTurnOrder] = React.useState<'first' | 'second' | null>(null);
  const [replayKey, setReplayKey] = React.useState(0);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('shuffle');
    setDiceResults(null);
    setTurnOrder(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#F5F5F0] flex flex-col">
      <header className="sticky top-0 z-30 bg-white border-b border-stone-200 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center">
              <Zap size={18} />
            </div>
            <h1 className="text-lg font-black text-[#141414] tracking-tight uppercase">Quick Set Up</h1>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 text-stone-400 hover:text-stone-600 active:scale-90 transition-all"
          >
            <X size={24} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto w-full p-6 flex flex-col min-h-full">
          <AnimatePresence mode="wait">
            {step === 'shuffle' ? (
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
                  onClick={() => setStep('dice_roll')}
                  className="w-full max-w-[240px] py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-black/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </motion.div>
            ) : step === 'dice_roll' ? (
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
                          setStep('draw_five');
                        }}
                        className={cn(
                          "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95",
                          turnOrder === 'first' 
                            ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                            : "bg-white text-stone-600 border border-stone-200"
                        )}
                      >
                        Going first
                      </button>
                      <button 
                        onClick={() => {
                          setTurnOrder('second');
                          setStep('draw_five');
                        }}
                        className={cn(
                          "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95",
                          turnOrder === 'second' 
                            ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                            : "bg-white text-stone-600 border border-stone-200"
                        )}
                      >
                        Going second
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ) : step === 'draw_five' ? (
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
                    Draw 5 cards from the top of your deck
                  </p>
                </div>
                <button 
                  onClick={() => setStep('starting_hand_tips')}
                  className="w-full max-w-[240px] py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-black/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </motion.div>
            ) : step === 'starting_hand_tips' ? (
              <motion.div 
                key="starting_hand_tips"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-12"
              >
                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <Zap size={40} />
                </div>
                <div className="space-y-4 max-w-[280px]">
                  <h3 className="text-xl font-black uppercase tracking-tight">Starting Hand Tips</h3>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-left">
                    <p className="text-xs text-amber-900 font-medium leading-relaxed">
                      Ideal starting hand should contain 2 - 3 low level unit or command cards.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col w-full gap-3 max-w-[240px]">
                  <button 
                    onClick={() => setStep('shield_setup')}
                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    Keep hand
                  </button>
                  <button 
                    onClick={() => setStep('mulligan_instruction')}
                    className="w-full py-4 bg-white text-stone-600 border border-stone-200 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
                  >
                    Mulligan
                  </button>
                </div>
              </motion.div>
            ) : step === 'mulligan_instruction' ? (
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
                  onClick={() => setStep('shuffle_after_mulligan')}
                  className="w-full max-w-[240px] py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-black/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </motion.div>
            ) : step === 'shuffle_after_mulligan' ? (
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
                  onClick={() => setStep('shield_setup')}
                  className="w-full max-w-[240px] py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-black/10 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </motion.div>
            ) : (step === 'shield_setup' || step === 'ex_base_setup' || step === 'main_deck_setup' || step === 'resource_setup' || step === 'ex_resource_setup' || step === 'graveyard_setup' || step === 'final_setup_check') ? (
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
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-5 pointer-events-none">
                    <div className="border-r border-b border-stone-900" />
                    <div className="border-b border-stone-900" />
                    <div className="border-r border-stone-900" />
                    <div className="border-stone-900" />
                  </div>

                  {/* Shields */}
                  {(['shield_setup', 'ex_base_setup', 'main_deck_setup', 'resource_setup', 'ex_resource_setup', 'graveyard_setup', 'final_setup_check'].includes(step)) && (
                    <div className="absolute bottom-16 left-6 flex flex-col-reverse gap-0.5">
                      {[...Array(6)].map((_, i) => (
                        <motion.div 
                          key={i}
                          initial={step === 'shield_setup' ? { opacity: 0, x: -20 } : false}
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

                  {/* EX BASE */}
                  {(['ex_base_setup', 'main_deck_setup', 'resource_setup', 'ex_resource_setup', 'graveyard_setup', 'final_setup_check'].includes(step)) && (
                    <motion.div 
                      initial={step === 'ex_base_setup' ? { opacity: 0, scale: 0.8 } : false}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute top-4 left-6"
                    >
                      <div className="w-12 h-16 bg-amber-100 border-2 border-amber-300 rounded-md flex items-center justify-center shadow-md">
                        <span className="text-[6px] font-black text-amber-600 uppercase text-center px-1">EX BASE</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Main Deck */}
                  {(['main_deck_setup', 'resource_setup', 'ex_resource_setup', 'graveyard_setup', 'final_setup_check'].includes(step)) && (
                    <motion.div 
                      initial={step === 'main_deck_setup' ? { opacity: 0, y: -20 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute top-4 right-6"
                    >
                      <div className="w-12 h-18 bg-stone-800 border-2 border-stone-900 rounded-md flex items-center justify-center shadow-xl relative">
                        <div className="absolute inset-1 border border-white/10 rounded-sm" />
                        <span className="text-[6px] font-black text-white uppercase">Deck</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Resource Pile */}
                  {(['resource_setup', 'ex_resource_setup', 'graveyard_setup', 'final_setup_check'].includes(step)) && (
                    <motion.div 
                      initial={step === 'resource_setup' ? { opacity: 0, y: 20 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-4 left-6"
                    >
                      <div className="w-12 h-8 bg-emerald-50 border-2 border-emerald-200 rounded-md flex items-center justify-center shadow-sm">
                        <span className="text-[6px] font-black text-emerald-600 uppercase">Resource</span>
                      </div>
                    </motion.div>
                  )}

                  {/* EX Resource */}
                  {(['ex_resource_setup', 'graveyard_setup', 'final_setup_check'].includes(step) && turnOrder === 'second') && (
                    <motion.div 
                      initial={step === 'ex_resource_setup' ? { opacity: 0, x: 20 } : false}
                      animate={{ opacity: 1, x: 0 }}
                      className="absolute bottom-4 left-20"
                    >
                      <div className="w-12 h-8 bg-amber-50 border-2 border-amber-200 rounded-md flex items-center justify-center shadow-sm">
                        <span className="text-[6px] font-black text-amber-600 uppercase">EX Resource</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Graveyard */}
                  {(['graveyard_setup', 'final_setup_check'].includes(step)) && (
                    <motion.div 
                      initial={step === 'graveyard_setup' ? { opacity: 0, y: 20 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute bottom-4 right-6"
                    >
                      <div className="w-12 h-16 bg-stone-200 border-2 border-stone-300 border-dashed rounded-md flex items-center justify-center">
                        <span className="text-[6px] font-black text-stone-400 uppercase text-center px-1">Graveyard</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="flex justify-center">
                  <button 
                    onClick={() => setReplayKey(prev => prev + 1)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-full text-[10px] font-black uppercase tracking-widest text-stone-500 hover:bg-stone-50 active:scale-95 transition-all shadow-sm"
                  >
                    <RotateCcw size={12} />
                    Replay animation
                  </button>
                </div>

                <div className="space-y-4 text-center">
                  <div className="min-h-[80px] flex items-center justify-center px-4">
                    <p className="text-sm text-stone-600 font-medium leading-relaxed">
                      {step === 'shield_setup' && (
                        <>
                          Place 6 cards face-down horizontally from the top of the deck to act as shields/life.<br /><br />
                          The order of shield placement is from bottom to top.
                        </>
                      )}
                      {step === 'ex_base_setup' && "Place your EX BASE at the top of the shield stack"}
                      {step === 'main_deck_setup' && "Place your main deck on the top right side of your playing area."}
                      {step === 'resource_setup' && "Place your resource on the lower left corner of your playing area, right below your stack of shields."}
                      {step === 'ex_resource_setup' && "Placing the EX resource. Place it to the right of your green resource."}
                      {step === 'graveyard_setup' && "Your graveyard will be below the main deck. All destroyed units, pilots, base and used commands go here."}
                      {step === 'final_setup_check' && "All done! Your set up should look like this."}
                    </p>
                  </div>

                  <button 
                    onClick={() => {
                      if (step === 'shield_setup') setStep('ex_base_setup');
                      else if (step === 'ex_base_setup') setStep('main_deck_setup');
                      else if (step === 'main_deck_setup') setStep('resource_setup');
                      else if (step === 'resource_setup') {
                        if (turnOrder === 'second') setStep('ex_resource_setup');
                        else setStep('graveyard_setup');
                      }
                      else if (step === 'ex_resource_setup') setStep('graveyard_setup');
                      else if (step === 'graveyard_setup') setStep('final_setup_check');
                      else if (step === 'final_setup_check') setStep('complete');
                    }}
                    className="w-full py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-black/10 active:scale-95 transition-all"
                  >
                    {step === 'final_setup_check' ? 'Finish' : 'Next'}
                  </button>
                </div>
              </motion.div>
            ) : step === 'complete' ? (
              <motion.div 
                key="complete"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-12"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <Swords size={40} />
                </div>
                <div className="space-y-2 max-w-[280px]">
                  <h3 className="text-xl font-black uppercase tracking-tight">Setup Complete</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">
                    You are all set to start your match. Good luck!
                  </p>
                </div>
                <button 
                  onClick={handleClose}
                  className="w-full max-w-[240px] py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-black/10 active:scale-95 transition-all"
                >
                  Back to Quick Start
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
