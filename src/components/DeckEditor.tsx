import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trash2, 
  Plus, 
  Minus, 
  BarChart2, 
  AlertCircle,
  ChevronRight,
  FileText,
  Search,
  Layout,
  Scan,
  Hand,
  Play,
  X,
  ChevronDown,
  Info,
  ArrowRightLeft,
  Dices,
  Trophy,
  RotateCcw,
  History,
  Calendar,
  MapPin,
  MoreHorizontal,
  Share2,
  Download,
  Upload,
  Copy,
  CopyPlus
} from 'lucide-react';
import { GundamCard, ArtVariantType, Deck, DeckItem, MatchEntry } from '../types';
import { cn, PriceDisplayMode, formatPrice, formatCurrency } from '../lib/utils';

interface DeckEditorProps {
  deck: Deck;
  matches: MatchEntry[];
  onUpdateCount: (deckId: string, cardId: string, artType: ArtVariantType, delta: number) => void;
  onRemove: (deckId: string, cardId: string, artType: ArtVariantType) => void;
  onPreviewCard: (card: GundamCard) => void;
  onClose: () => void;
  getCachedPrice: (cardNumber: string, cardName: string, artType: ArtVariantType) => string | null;
  priceMode: PriceDisplayMode;
  onPriceModeChange: (mode: PriceDisplayMode) => void;
  onEnterBuilderMode: (types?: string[]) => void;
  onResetHistory?: (deckId: string) => void;
  onPlayModeChange?: (isPlay: boolean) => void;
  onDuplicateDeck?: (deck: Deck) => void;
  onImportDeck?: (text: string) => void;
  allCards: GundamCard[];
  visible?: boolean;
}

export interface DeckEditorHandle {
  requestClose: () => void;
}

// --- Sub-components ---

const RarityTag = React.memo(({ rarity }: { rarity: string }) => {
  const colors: Record<string, string> = {
    C: "bg-stone-100 text-stone-600",
    U: "bg-blue-50 text-blue-600",
    R: "bg-purple-50 text-purple-600",
    SR: "bg-amber-50 text-amber-600",
    LR: "bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400 text-stone-900 border border-amber-600/20 shadow-sm",
  };
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider", colors[rarity] || "bg-stone-100 text-stone-600")}>
      {rarity}
    </span>
  );
});

const ColorTag = React.memo(({ color }: { color: string }) => {
  const colors: Record<string, string> = {
    Red: "bg-red-500",
    Blue: "bg-blue-500",
    Green: "bg-emerald-500",
    White: "bg-stone-200",
    Black: "bg-stone-900",
    Yellow: "bg-amber-400",
    Purple: "bg-purple-500",
  };
  return (
    <div className={cn("w-2 h-2 rounded-full", colors[color] || "bg-stone-200")} />
  );
});

const CardGridItem = React.memo(({ 
  item, 
  deckId,
  hideControls = false, 
  onPreviewCard, 
  onRemove, 
  onUpdateCount 
}: { 
  item: DeckItem, 
  deckId: string,
  hideControls?: boolean,
  onPreviewCard: (card: GundamCard) => void,
  onRemove: (deckId: string, cardId: string, artType: ArtVariantType) => void,
  onUpdateCount: (deckId: string, cardId: string, artType: ArtVariantType, delta: number) => void
}) => (
  <motion.div 
    layout
    className="bg-white rounded-xl overflow-hidden shadow-sm border border-stone-200 flex flex-col"
  >
    <div className="relative aspect-[2/3] bg-stone-100 flex items-center justify-center">
      <img 
        src={
          item.card.variants 
            ? item.card.variants.find(v => v.type === item.artType)?.imageUrl || item.card.imageUrl
            : (item.artType === "Parallel" && item.card.altImageUrl ? item.card.altImageUrl : item.card.imageUrl)
        } 
        alt={item.card.name}
        className="w-full h-full object-cover cursor-pointer"
        onClick={() => onPreviewCard(item.card)}
        crossOrigin="anonymous"
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            const errorMsg = document.createElement('div');
            errorMsg.className = "text-[8px] text-gray-500 font-medium text-center p-2 leading-tight";
            errorMsg.innerText = "Card images will be uploaded in future updates!";
            parent.appendChild(errorMsg);
          }
        }}
      />
      
      {/* Count Controls Overlay */}
      {!hideControls && (
        <div className="absolute inset-x-0 bottom-0 p-1 bg-white/95 backdrop-blur-sm border-t border-stone-100 flex items-center justify-between gap-1">
          <button 
            onClick={() => {
              if (item.count === 1) {
                onRemove(deckId, item.card.id, item.artType);
              } else {
                onUpdateCount(deckId, item.card.id, item.artType, -1);
              }
            }}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-stone-100 text-stone-600 active:scale-90 transition-transform"
          >
            <Minus size={10} />
          </button>
          <span className={cn(
            "text-[10px] font-black transition-colors",
            item.count >= 4 ? "text-red-500" : "text-[#141414]"
          )}>
            {item.count}
          </span>
          <button 
            onClick={() => onUpdateCount(deckId, item.card.id, item.artType, 1)}
            disabled={item.count >= 4}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-[#141414] text-white active:scale-90 transition-transform disabled:opacity-30"
          >
            <Plus size={10} />
          </button>
        </div>
      )}
    </div>
    <div className="p-1.5 flex flex-col gap-0.5">
      <h4 className="text-[10px] font-bold truncate leading-tight">{item.card.name}</h4>
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-mono text-stone-400">{item.card.cardNumber}</span>
        {item.artType !== "Base art" && (
          <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">{item.artType}</span>
        )}
      </div>
    </div>
  </motion.div>
));

export const DeckEditor = React.forwardRef<DeckEditorHandle, DeckEditorProps>(({ 
  deck, 
  matches,
  onUpdateCount, 
  onRemove, 
  onPreviewCard,
  onClose,
  getCachedPrice,
  priceMode,
  onPriceModeChange,
  onEnterBuilderMode,
  onResetHistory,
  onPlayModeChange,
  onDuplicateDeck,
  onImportDeck,
  allCards,
  visible = true
}, ref) => {
  const [activeTab, setActiveTab] = React.useState<'cards' | 'stats' | 'performance' | 'play'>('cards');
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
  const [importText, setImportText] = React.useState('');
  const [isExportModalOpen, setIsExportModalOpen] = React.useState(false);
  const [exportText, setExportText] = React.useState('');
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
  const [playTab, setPlayTab] = React.useState<'card_info' | 'hand_synergy'>('card_info');
  const [toast, setToast] = React.useState<string | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const selectCardInHand = (cardId: string) => {
    const index = sortedHand.findIndex(item => item.card.id === cardId);
    if (index !== -1) {
      setSelectedHandIndex(index);
      setPlayTab('card_info');
      
      // Scroll the main container to top of info section
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

      // Scroll the hand carousel to the selected card
      if (handCarouselRef.current) {
        const carousel = handCarouselRef.current;
        const cardWidth = 100 + 12; // width + gap
        carousel.scrollTo({
          left: index * cardWidth,
          behavior: 'smooth'
        });
      }
    }
  };

  const canPair = React.useCallback((unit: GundamCard, pilot: GundamCard): boolean => {
    if (unit.type !== 'Unit' || pilot.type !== 'Pilot') return false;

    // 1. Explicit link by name
    if (unit.link === pilot.name) return true;

    // 2. Trait-based pairing in unit ability text
    if (pilot.traits && pilot.traits.length > 0) {
      for (const trait of pilot.traits) {
        const traitRegex = new RegExp(`[\\(\\(【]${trait}[\\)\\)】].*Pilot`, 'i');
        if (traitRegex.test(unit.ability)) return true;
        
        const simpleTraitRegex = new RegExp(`${trait}\\s*Pilot`, 'i');
        if (simpleTraitRegex.test(unit.ability)) return true;
      }
    }

    // 3. Color-based pairing (e.g., "Blue Pilot")
    const colors = ["Red", "Blue", "Green", "White", "Black", "Yellow", "Purple"];
    for (const color of colors) {
      if (pilot.color === color) {
        const colorRegex = new RegExp(`${color}\\s*Pilot`, 'i');
        if (colorRegex.test(unit.ability)) return true;
      }
    }

    // 4. Level-based pairing (e.g., "Lv.4 or Higher Pilot")
    const levelMatch = unit.ability.match(/Lv\.(\d+)\s*or\s*Higher\s*Pilot/i);
    if (levelMatch && pilot.level) {
      if (pilot.level >= parseInt(levelMatch[1])) return true;
    }

    // 5. Pilot ability mentions Unit traits or names
    if (unit.traits && unit.traits.length > 0) {
      for (const trait of unit.traits) {
        const traitRegex = new RegExp(`'${trait}'\\s*unit`, 'i');
        if (traitRegex.test(pilot.ability)) return true;
        
        const traitRegex2 = new RegExp(`${trait}\\s*unit`, 'i');
        if (traitRegex2.test(pilot.ability)) return true;
      }
    }
    
    // Special case for "Gundam" units mentioned in quotes
    if (pilot.ability.toLowerCase().includes("'gundam' unit") && unit.name.toLowerCase().includes("gundam")) {
      return true;
    }

    return false;
  }, []);

  const linkGroups = React.useMemo(() => {
    const handCards = currentHand.map(item => item.card);
    const deckCards = deck.items.map(item => item.card);
    
    // We'll group by Pilot.
    const groupsByPilot = new Map<string, { 
      pilot: GundamCard, 
      units: Set<GundamCard>, 
      inHandPilot: boolean, 
      inHandUnits: Set<string> 
    }>();

    const getOrCreateGroup = (pilot: GundamCard) => {
      if (!groupsByPilot.has(pilot.id)) {
        groupsByPilot.set(pilot.id, {
          pilot,
          units: new Set(),
          inHandPilot: handCards.some(c => c.id === pilot.id),
          inHandUnits: new Set()
        });
      }
      return groupsByPilot.get(pilot.id)!;
    };

    // 1. Process Pilots in hand: find all matching units in deck
    handCards.filter(c => c.type === 'Pilot').forEach(pilot => {
      const group = getOrCreateGroup(pilot);
      deckCards.filter(c => c.type === 'Unit').forEach(unit => {
        if (canPair(unit, pilot)) {
          group.units.add(unit);
          if (handCards.some(c => c.id === unit.id)) {
            group.inHandUnits.add(unit.id);
          }
        }
      });
    });

    // 2. Process Units in hand: find all matching pilots in deck or hand
    handCards.filter(c => c.type === 'Unit' && (c.link || c.ability.toLowerCase().includes('pilot'))).forEach(unit => {
      // Find pilots in deck or hand that can pair with this unit
      const potentialPilots = [...deckCards, ...handCards].filter(c => c.type === 'Pilot' && canPair(unit, c));
      
      potentialPilots.forEach(pilot => {
        const group = getOrCreateGroup(pilot);
        group.units.add(unit);
        group.inHandUnits.add(unit.id);
      });

      // If no pilot in deck/hand, try to find the "intended" pilot in all cards to show as greyed out
      if (potentialPilots.length === 0 && unit.link) {
        const intendedPilot = allCards.find(c => c.type === 'Pilot' && c.name === unit.link);
        if (intendedPilot) {
          const group = getOrCreateGroup(intendedPilot);
          group.units.add(unit);
          group.inHandUnits.add(unit.id);
        }
      }
    });

    return Array.from(groupsByPilot.values())
      .filter(g => g.units.size > 0)
      .map(g => ({
        pilotName: g.pilot.name,
        pilot: g.pilot,
        units: Array.from(g.units),
        inHandPilot: g.inHandPilot,
        inHandUnits: g.inHandUnits
      }))
      .sort((a, b) => {
        // Sort groups where both pilot and at least one unit are in hand to the top
        const aComplete = a.inHandPilot && a.inHandUnits.size > 0;
        const bComplete = b.inHandPilot && b.inHandUnits.size > 0;
        if (aComplete && !bComplete) return -1;
        if (!aComplete && bComplete) return 1;
        return 0;
      });
  }, [currentHand, deck.items, canPair]);

  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [playModeStep]);

  const [addedItems, setAddedItems] = React.useState<Record<string, boolean>>({});
  const [expandedHandItems, setExpandedHandItems] = React.useState<number[]>([]);
  const [expandedTips, setExpandedTips] = React.useState<number[]>([]);
  const totalCards = deck.items.reduce((sum, item) => sum + item.count, 0);
  const isValidSize = totalCards === 50;

  React.useImperativeHandle(ref, () => ({
    requestClose: () => {
      if (activeTab === 'play') {
        setIsExitPlayModalOpen(true);
      } else {
        onClose();
      }
    }
  }));

  React.useEffect(() => {
    onPlayModeChange?.(activeTab === 'play');
  }, [activeTab, onPlayModeChange]);

  const totalValue = deck.items.reduce((sum, item) => {
    const priceStr = getCachedPrice(item.card.cardNumber, item.card.name, item.artType);
    if (priceStr) {
      const price = parseInt(priceStr.replace(/[¥,]/g, ''));
      return sum + (isNaN(price) ? 0 : price * item.count);
    }
    return sum;
  }, 0);
  
  // Stats
  const typeStats = deck.items.reduce((acc, item) => {
    acc[item.card.type] = (acc[item.card.type] || 0) + item.count;
    return acc;
  }, {} as Record<string, number>);

  const colorStats = deck.items.reduce((acc, item) => {
    acc[item.card.color] = (acc[item.card.color] || 0) + item.count;
    return acc;
  }, {} as Record<string, number>);

  const costStats = deck.items.reduce((acc, item) => {
    const cost = item.card.cost;
    acc[cost] = (acc[cost] || 0) + item.count;
    return acc;
  }, {} as Record<number, number>);

  const maxCost = Math.max(...Object.keys(costStats).map(Number), 0);
  const costCurve = Array.from({ length: Math.max(maxCost + 1, 6) }, (_, i) => costStats[i] || 0);

  // Archetype Calculations
  const unitsLvl3OrLower = deck.items.reduce((sum, item) => {
    if (item.card.type === 'Unit' && item.card.level && item.card.level <= 3) {
      return sum + item.count;
    }
    return sum;
  }, 0);

  const unitsLvl7OrHigher = deck.items.reduce((sum, item) => {
    if (item.card.type === 'Unit' && item.card.level && item.card.level >= 7) {
      return sum + item.count;
    }
    return sum;
  }, 0);

  const blockerCount = deck.items.reduce((sum, item) => {
    if (item.card.ability.toLowerCase().includes('blocker')) {
      return sum + item.count;
    }
    return sum;
  }, 0);

  const hasRamp = deck.items.some(item => item.card.ability.toLowerCase().includes('ex resource'));

  // Smooth curve: at least 2 cards in each cost slot from 1 to 5
  const isSmoothCurve = costCurve.slice(1, 6).every(count => count >= 2);

  // Tempo: Relatively equal spread (at least 3 cards in at least 4 different cost slots between 1 and 6)
  const costSlotsWithDecentAmount = costCurve.slice(1, 7).filter(count => count >= 3).length;
  const isTempo = costSlotsWithDecentAmount >= 4;

  const primaryArchetype = unitsLvl3OrLower >= 12 ? 'Aggro' : (isSmoothCurve && unitsLvl7OrHigher >= 4 ? 'Control' : 'Midrange');
  
  const secondaryArchetypes = [];
  if (isTempo) secondaryArchetypes.push('Tempo');
  if (hasRamp) secondaryArchetypes.push('Ramp');
  if (blockerCount >= 8) secondaryArchetypes.push('Stall');

  // Turn Order Preference
  const hasFirstPrefCards = deck.items.some(item => 
    item.card.type === 'Unit' && 
    item.card.level && 
    item.card.level <= 4 && 
    item.card.cost === item.card.level
  );

  const hasSecondPrefCards = deck.items.some(item => 
    item.card.type === 'Unit' && 
    item.card.level && 
    ((item.card.level === 2 && item.card.cost === 1) ||
     (item.card.level === 3 && item.card.cost === 2) ||
     (item.card.level === 4 && item.card.cost === 3))
  );

  const hasCommands = deck.items.some(item => item.card.type === 'Command');

  let turnPreference = "No clear preference";
  if (primaryArchetype === 'Aggro') {
    turnPreference = "This deck wants to go first";
  } else if ((hasFirstPrefCards && hasSecondPrefCards) || hasCommands) {
    turnPreference = "This deck is okay going first or second";
  } else if (hasFirstPrefCards) {
    turnPreference = "This deck wants to go first";
  } else if (hasSecondPrefCards) {
    turnPreference = "This deck wants to go second";
  }

  // Performance Stats
  const deckMatches = React.useMemo(() => {
    return matches.filter(match => 
      match.rounds.some(round => round.myDeckSnapshot.id === deck.id)
    ).map(match => ({
      ...match,
      rounds: match.rounds.filter(round => round.myDeckSnapshot.id === deck.id)
    })).sort((a, b) => b.createdAt - a.createdAt);
  }, [matches, deck.id]);

  const performanceStats = React.useMemo(() => {
    let totalWins = 0;
    let totalLosses = 0;
    const opponentStats = new Map<string, { wins: number, losses: number }>();

    deckMatches.forEach(match => {
      match.rounds.forEach(round => {
        if (round.result === 'Win') totalWins++;
        else totalLosses++;

        const oppDeck = round.opponentDeckName || 'Unknown Deck';
        const current = opponentStats.get(oppDeck) || { wins: 0, losses: 0 };
        if (round.result === 'Win') current.wins++;
        else current.losses++;
        opponentStats.set(oppDeck, current);
      });
    });

    const totalGames = totalWins + totalLosses;
    const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

    return {
      totalWins,
      totalLosses,
      totalGames,
      winRate,
      opponentStats: Array.from(opponentStats.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses))
    };
  }, [deckMatches]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "fixed inset-0 z-[55] bg-[#F5F5F0] flex flex-col",
        !visible && "hidden"
      )}
    >
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="w-full px-4 lg:px-12 py-4 flex flex-col gap-4">
          {/* Line 1: Back, Menu, Play Mode */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => {
                if (activeTab === 'play') {
                  setIsExitPlayModalOpen(true);
                } else {
                  onClose();
                }
              }} 
              className="p-2 hover:bg-stone-100 rounded-full transition-colors"
            >
              <ChevronRight className="rotate-180" size={24} />
            </button>

            <div className="flex items-center gap-2">
              <div className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 hover:bg-stone-100 rounded-xl transition-colors text-stone-600 flex items-center gap-2"
                  title="Deck Menu"
                >
                  <MoreHorizontal size={20} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Menu</span>
                </button>

                <AnimatePresence>
                  {isMenuOpen && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMenuOpen(false)}
                        className="fixed inset-0 z-40"
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-stone-200 z-50 overflow-hidden"
                      >
                        <div className="p-2 space-y-1">
                          <button 
                            onClick={() => {
                              setIsMenuOpen(false);
                              const text = deck.items.map(i => `${i.count}x ${i.card.cardNumber}`).join('\n');
                              setExportText(`// Main Deck\n${text}`);
                              setIsExportModalOpen(true);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 rounded-xl transition-colors"
                          >
                            <Download size={16} />
                            Export as Text
                          </button>
                          <button 
                            onClick={() => {
                              setIsMenuOpen(false);
                              const deckData = {
                                name: deck.name,
                                items: deck.items.map(i => ({
                                  card: {
                                    id: i.card.id,
                                    name: i.card.name,
                                    cardNumber: i.card.cardNumber,
                                    color: i.card.color,
                                    rarity: i.card.rarity,
                                    imageUrl: i.card.imageUrl
                                  },
                                  count: i.count,
                                  artType: i.artType
                                }))
                              };
                              const encoded = btoa(JSON.stringify(deckData));
                              const shareUrl = `${window.location.origin}${window.location.pathname}?import=${encoded}`;
                              navigator.clipboard.writeText(shareUrl);
                              showToast("Successfully copied link to clipboard");
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 rounded-xl transition-colors"
                          >
                            <Share2 size={16} />
                            Share deck link
                          </button>
                          <button 
                            onClick={() => {
                              setIsMenuOpen(false);
                              setIsImportModalOpen(true);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 rounded-xl transition-colors"
                          >
                            <Upload size={16} />
                            Import deck
                          </button>
                          <button 
                            onClick={() => {
                              setIsMenuOpen(false);
                              onDuplicateDeck?.(deck);
                              showToast("Successfully duplicated deck");
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 rounded-xl transition-colors"
                          >
                            <Copy size={16} />
                            Duplicate deck
                          </button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={() => {
                  if (activeTab === 'play') {
                    setIsExitPlayModalOpen(true);
                  } else {
                    setActiveTab('play');
                  }
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-2 shadow-sm active:scale-95 transition-all",
                  activeTab === 'play' 
                    ? "bg-amber-500 text-white shadow-amber-500/20" 
                    : "bg-[#141414] text-white shadow-black/10"
                )}
              >
                <Play size={12} fill="currentColor" />
                Play Mode
              </button>
            </div>
          </div>

          {/* Line 2: Deck Name, Card Count */}
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg truncate max-w-[200px]">{deck.name}</h2>
            <span className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full",
              isValidSize ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            )}>
              {totalCards} / 50 Cards
            </span>
          </div>

          {/* Tab Toggle */}
          {activeTab !== 'play' && (
            <div className="flex bg-stone-100 p-1 rounded-xl">
              <button 
                onClick={() => setActiveTab('cards')}
                className={cn(
                  "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  activeTab === 'cards' ? "bg-white text-[#141414] shadow-sm" : "text-stone-400 hover:text-stone-600"
                )}
              >
                Current Deck
              </button>
              <button 
                onClick={() => setActiveTab('stats')}
                className={cn(
                  "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  activeTab === 'stats' ? "bg-white text-[#141414] shadow-sm" : "text-stone-400 hover:text-stone-600"
                )}
              >
                Deck Info
              </button>
              <button 
                onClick={() => setActiveTab('performance')}
                className={cn(
                  "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  activeTab === 'performance' ? "bg-white text-[#141414] shadow-sm" : "text-stone-400 hover:text-stone-600"
                )}
              >
                Performance
              </button>
            </div>
          )}
        </div>
      </header>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-40">
        <AnimatePresence mode="wait">
          {activeTab === 'stats' ? (
            <motion.section 
              key="stats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 lg:px-12 space-y-6 w-full"
            >
              {/* Deck Archetype Section */}
              <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Layout size={14} /> Deck Archetype
                </h3>
                <div className="flex flex-wrap gap-2">
                  <div className="px-3 py-1.5 bg-amber-500 text-white rounded-xl flex items-center gap-2 shadow-sm shadow-amber-500/20">
                    <span className="text-[10px] font-black uppercase tracking-wider">Primary: {primaryArchetype}</span>
                  </div>
                  {secondaryArchetypes.map(type => (
                    <div key={type} className="px-3 py-1.5 bg-stone-100 text-stone-600 rounded-xl flex items-center gap-2 border border-stone-200">
                      <span className="text-[10px] font-black uppercase tracking-wider">{type}</span>
                    </div>
                  ))}
                  {secondaryArchetypes.length === 0 && (
                    <div className="px-3 py-1.5 bg-stone-50 text-stone-400 rounded-xl flex items-center gap-2 border border-stone-100 border-dashed">
                      <span className="text-[10px] font-black uppercase tracking-wider italic">No secondary tags</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Turn Order Preference Section */}
              <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ArrowRightLeft size={14} /> Turn Order Preference
                </h3>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "px-3 py-2 rounded-xl text-[11px] font-bold w-full text-center",
                    turnPreference.includes("first") && !turnPreference.includes("second") ? "bg-blue-50 text-blue-700 border border-blue-100" :
                    turnPreference.includes("second") && !turnPreference.includes("first") ? "bg-purple-50 text-purple-700 border border-purple-100" :
                    turnPreference.includes("okay") ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                    "bg-stone-50 text-stone-500 border border-stone-100"
                  )}>
                    {turnPreference}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <BarChart2 size={14} /> Cost Curve
                </h3>
                <div className="flex items-end gap-1 h-24 px-2">
                  {costCurve.map((count, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className="w-full bg-amber-400 rounded-t-sm transition-all duration-500"
                        style={{ height: `${(count / (Math.max(...costCurve) || 1)) * 100}%`, minHeight: count > 0 ? '4px' : '0' }}
                      />
                      <span className="text-[10px] font-bold text-stone-400">{i}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Types</h3>
                  <div className="space-y-2">
                    {Object.entries(typeStats).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-xs font-medium text-stone-600">{type}</span>
                        <span className="text-xs font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Colors</h3>
                  <div className="space-y-2">
                    {Object.entries(colorStats).map(([color, count]) => (
                      <div key={color} className="flex items-center justify-between">
                        <ColorTag color={color} />
                        <span className="text-xs font-medium text-stone-600 flex-1 ml-2">{color}</span>
                        <span className="text-xs font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Total Value & Price Switcher hidden as requested */}
              {/* <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">Total Deck Value</span>
                  <span className="text-lg font-bold text-emerald-600">{formatCurrency(totalValue, priceMode)}</span>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Price Mode</span>
                  <div className="flex bg-stone-100 border border-stone-200 rounded-lg p-0.5">
                    {(['JPY', 'SGD130', 'SGD120'] as PriceDisplayMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => onPriceModeChange(m)}
                        className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold transition-all",
                          priceMode === m 
                            ? "bg-[#141414] text-white" 
                            : "text-stone-400 hover:text-stone-600"
                        )}
                      >
                        {m === 'JPY' ? '¥' : m === 'SGD130' ? 'YYT/130' : 'YYT/120'}
                      </button>
                    ))}
                  </div>
                </div>
              </div> */}

              {/* Deck Size Warning */}
              {!isValidSize && totalCards > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                  <AlertCircle className="text-amber-500 shrink-0" size={18} />
                  <p className="text-[11px] text-amber-800 font-medium">
                    Deck must contain exactly 50 cards. You currently have {totalCards}.
                  </p>
                </div>
              )}
            </motion.section>
          ) : activeTab === 'performance' ? (
            <motion.section 
              key="performance"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 lg:px-12 space-y-6 w-full"
            >
              {/* Win Rate Overview */}
              <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Trophy size={80} />
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest">Win Rate Overview</h3>
                    <span className="text-xs font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                      {performanceStats.winRate.toFixed(1)}% Win Rate
                    </span>
                  </div>
                  
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <div className="text-4xl font-black tracking-tighter text-[#141414]">
                        {performanceStats.totalWins} <span className="text-stone-300">/</span> {performanceStats.totalLosses}
                      </div>
                      <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mt-1">
                        Total Wins & Losses
                      </div>
                    </div>
                    <div className="w-24 h-2 bg-stone-100 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-emerald-500" 
                        style={{ width: `${performanceStats.winRate}%` }} 
                      />
                      <div 
                        className="h-full bg-red-500" 
                        style={{ width: `${100 - performanceStats.winRate}%` }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Match History */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest px-2 flex items-center justify-between">
                  <span>Match History</span>
                  <span className="text-[10px] font-bold text-stone-400">{performanceStats.totalGames} Games Total</span>
                </h3>
                
                {deckMatches.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 border border-stone-200 border-dashed text-center space-y-2">
                    <History className="mx-auto text-stone-300" size={32} />
                    <p className="text-sm text-stone-500 font-medium">No match history recorded for this deck yet.</p>
                    <p className="text-[10px] text-stone-400 uppercase tracking-wider">Start playing in Play Mode to record stats!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deckMatches.map(match => (
                      <div key={match.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                        <div className="p-3 bg-stone-50 border-b border-stone-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar size={12} className="text-stone-400" />
                            <span className="text-[10px] font-bold text-stone-500">{match.date}</span>
                            <span className="text-[10px] font-black text-stone-300 px-1.5 py-0.5 border border-stone-200 rounded uppercase tracking-tighter">
                              {match.nature}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin size={10} className="text-stone-400" />
                            <span className="text-[10px] font-medium text-stone-500">{match.shopName}</span>
                          </div>
                        </div>
                        <div className="divide-y divide-stone-100">
                          {match.rounds.map(round => (
                            <div key={round.id} className="p-4 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-black text-xs",
                                  round.result === 'Win' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                                )}>
                                  {round.result === 'Win' ? 'W' : 'L'}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-sm truncate">vs {round.opponentDeckName || 'Unknown Deck'}</div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {round.opponentColors.map(color => (
                                      <div key={color} className={cn("w-2 h-2 rounded-full", 
                                        color === 'Red' ? 'bg-red-500' :
                                        color === 'Blue' ? 'bg-blue-500' :
                                        color === 'Green' ? 'bg-emerald-500' :
                                        color === 'White' ? 'bg-stone-200' :
                                        'bg-purple-500'
                                      )} />
                                    ))}
                                    {round.notes && (
                                      <span className="text-[10px] text-stone-400 italic truncate ml-1">
                                        "{round.notes}"
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-[10px] font-black text-stone-300 uppercase tracking-widest">
                                Round {round.roundNumber}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reset History Button */}
              {deckMatches.length > 0 && (
                <div className="pt-4">
                  <button 
                    onClick={() => setIsResetConfirmOpen(true)}
                    className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-red-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw size={14} />
                    Reset Match History
                  </button>
                </div>
              )}

              {/* Reset Confirmation Modal */}
              <AnimatePresence>
                {isResetConfirmOpen && (
                  <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl space-y-6"
                    >
                      <div className="space-y-2 text-center">
                        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                          <RotateCcw size={24} />
                        </div>
                        <h3 className="font-bold text-lg">Reset History?</h3>
                        <p className="text-sm text-stone-500 leading-relaxed">
                          Are you sure you wish to erase all match history for this deck? This action cannot be undone.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => setIsResetConfirmOpen(false)}
                          className="py-3 px-4 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm hover:bg-stone-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => {
                            onResetHistory?.(deck.id);
                            setIsResetConfirmOpen(false);
                            showToast("Match history reset successfully");
                          }}
                          className="py-3 px-4 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                        >
                          Reset
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.section>
          ) : activeTab === 'play' ? (
            <motion.section 
              key="play"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-4 flex flex-col min-h-[60vh]"
            >
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
                            className={cn(
                              "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95",
                              turnPreference.includes('first') 
                                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                                : "bg-white text-stone-600 border border-stone-200"
                            )}
                          >
                            Going first
                          </button>
                          <button 
                            onClick={() => {
                              setTurnOrder('second');
                              setPlayModeStep('draw_five');
                            }}
                            className={cn(
                              "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95",
                              turnPreference.includes('second') 
                                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                                : "bg-white text-stone-600 border border-stone-200"
                            )}
                          >
                            Going second
                          </button>

                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3 text-left"
                          >
                            <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Strategy Tip</p>
                              <p className="text-xs text-amber-900 font-medium leading-relaxed">
                                {turnPreference}
                              </p>
                            </div>
                          </motion.div>
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
                    className="flex-1 flex flex-col space-y-8 py-6"
                  >
                    <div className="text-center space-y-2">
                      <h3 className="text-xl font-black uppercase tracking-tight">Starting Hand Tips</h3>
                    </div>

                    {/* Ideal Cards */}
                    <div className="space-y-4">
                      <div className="px-1">
                        <p className="text-xs font-bold text-stone-800">Ideal starting hand should contain 2 - 3 of these cards:</p>
                        <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">Units or Commands (Lv.3 or less)</p>
                      </div>
                      
                      <div className="flex gap-3 overflow-x-auto pb-4 px-1 snap-x">
                        {deck.items
                          .filter(item => (item.card.type === 'Unit' || item.card.type === 'Command') && (item.card.level || 0) <= 3)
                          .map((item, i) => (
                            <div 
                              key={i} 
                              className="w-[100px] shrink-0 snap-start"
                              onClick={() => onPreviewCard(item.card)}
                            >
                              <div className="aspect-[2/3] rounded-lg overflow-hidden border border-stone-200 shadow-sm">
                                <img 
                                  src={item.card.imageUrl} 
                                  alt={item.card.name}
                                  className="w-full h-full object-cover"
                                  crossOrigin="anonymous"
                                />
                              </div>
                              <p className="text-[8px] font-bold mt-1 truncate">{item.card.name}</p>
                            </div>
                          ))}
                        {deck.items.filter(item => (item.card.type === 'Unit' || item.card.type === 'Command') && (item.card.level || 0) <= 3).length === 0 && (
                          <div className="w-full py-8 border-2 border-dashed border-stone-100 rounded-2xl flex items-center justify-center">
                            <p className="text-[10px] text-stone-300 italic font-medium">No matching cards in deck</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Okay Cards */}
                    <div className="space-y-4">
                      <div className="px-1">
                        <p className="text-xs font-bold text-stone-800">Okay to have 1 - 2 of these cards, but not too many:</p>
                        <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-1">Bases and Pilots</p>
                      </div>
                      
                      <div className="flex gap-3 overflow-x-auto pb-4 px-1 snap-x">
                        {deck.items
                          .filter(item => item.card.type === 'Base' || item.card.type === 'Pilot')
                          .map((item, i) => (
                            <div 
                              key={i} 
                              className="w-[100px] shrink-0 snap-start"
                              onClick={() => onPreviewCard(item.card)}
                            >
                              <div className="aspect-[2/3] rounded-lg overflow-hidden border border-stone-200 shadow-sm">
                                <img 
                                  src={item.card.imageUrl} 
                                  alt={item.card.name}
                                  className="w-full h-full object-cover"
                                  crossOrigin="anonymous"
                                />
                              </div>
                              <p className="text-[8px] font-bold mt-1 truncate">{item.card.name}</p>
                            </div>
                          ))}
                        {deck.items.filter(item => item.card.type === 'Base' || item.card.type === 'Pilot').length === 0 && (
                          <div className="w-full py-8 border-2 border-dashed border-stone-100 rounded-2xl flex items-center justify-center">
                            <p className="text-[10px] text-stone-300 italic font-medium">No matching cards in deck</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                      <button 
                        onClick={() => setPlayModeStep('shield_setup')}
                        className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                      >
                        Keep hand
                      </button>
                      <button 
                        onClick={() => {
                          setCurrentHand([]);
                          setPlayModeStep('mulligan_instruction');
                        }}
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
                      onClick={() => {
                        setPlayModeStep('shuffle_after_mulligan');
                      }}
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
                      {/* Grid/Field lines for context */}
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

                      {/* EX BASE - Upper Left (above shields) */}
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

                      {/* Resource Pile - Lower Left (below shields) */}
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

                      {/* EX Resource - Right of Resource Pile */}
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

                      {/* Graveyard - Below Main Deck */}
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

                    {playModeStep === 'shield_setup' && (
                      <div className="flex justify-center">
                        <button 
                          onClick={() => setReplayKey(prev => prev + 1)}
                          className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-full text-[10px] font-black uppercase tracking-widest text-stone-500 hover:bg-stone-50 active:scale-95 transition-all shadow-sm"
                        >
                          <RotateCcw size={12} />
                          Replay animation
                        </button>
                      </div>
                    )}

                    <div className="space-y-4 text-center">
                      <div className="min-h-[80px] flex items-center justify-center px-4">
                        <p className="text-sm text-stone-600 font-medium leading-relaxed">
                          {playModeStep === 'shield_setup' && (
                            <>
                              Place 6 cards face-down horizontally from the top of the deck to act as shields/life.<br /><br />
                              The order of shield placement is from bottom to top.
                            </>
                          )}
                          {playModeStep === 'ex_base_setup' && "Place your EX BASE at the top of the shield stack"}
                          {playModeStep === 'main_deck_setup' && "Place your main deck on the top right side of your playing area."}
                          {playModeStep === 'resource_setup' && "Place your resource on the lower left corner of your playing area, right below your stack of shields."}
                          {playModeStep === 'ex_resource_setup' && "Placing the EX resource. Place it to the right of your green resource."}
                          {playModeStep === 'graveyard_setup' && "Your graveyard will be below the main deck. All destroyed units, pilots, base and used commands go here."}
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
                        className="w-full py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-black/10 active:scale-95 transition-all"
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
                        <p className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          resourceLevel === 0 ? "text-amber-600" : "text-stone-400"
                        )}>
                          {resourceLevel === 0 
                            ? 'Set your starting resource with "+"' 
                            : `Resource level: ${resourceLevel} (Including ex resource)`}
                        </p>
                      </div>
                    </div>

                    {/* Hand Header */}
                    <div className="flex items-center justify-between px-1">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Hand size={14} className="text-stone-400" />
                          <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                            Current hand: {currentHand.length}
                          </h3>
                        </div>
                        {currentHand.length >= 10 ? (
                          <p className="text-[8px] font-black text-red-500 uppercase tracking-tighter">
                            Max hand reached, discard down to 10 at end of turn
                          </p>
                        ) : (
                          <p className="text-[8px] font-bold text-stone-400 uppercase tracking-tighter">
                            (Max hand allowed: 10)
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {currentHand.length > 0 && (
                          <button 
                            onClick={() => {
                              const itemToRemove = sortedHand[selectedHandIndex];
                              if (itemToRemove) {
                                setCurrentHand(prev => prev.filter(item => item.handId !== itemToRemove.handId));
                                setSelectedHandIndex(prev => Math.max(0, prev - 1));
                              }
                            }}
                            className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-2 shadow-sm active:scale-95 transition-all border border-stone-200"
                          >
                            <Minus size={12} />
                            card
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setIsStartingHandSetup(currentHand.length === 0);
                            setIsAddHandModalOpen(true);
                          }}
                          className={cn(
                            "px-4 py-2 rounded-xl font-black text-[8px] uppercase tracking-wider flex items-center gap-2 shadow-sm active:scale-95 transition-all",
                            currentHand.length === 0 
                              ? "bg-amber-500 text-white shadow-amber-500/20" 
                              : "bg-stone-600 text-white shadow-stone-600/10"
                          )}
                        >
                          <Plus size={12} />
                          {currentHand.length === 0 ? "Add your starting hand" : "card"}
                        </button>
                      </div>
                    </div>

                    {/* Hand Carousel */}
                    {currentHand.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center text-stone-400 bg-white rounded-3xl border border-stone-100 border-dashed">
                        <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center mb-4">
                          <Hand size={32} />
                        </div>
                        <p className="text-sm font-black uppercase tracking-tight">Your hand is empty</p>
                        <p className="text-[10px] uppercase tracking-widest mt-1">Add cards to start testing</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="relative">
                          <div ref={handCarouselRef} className="flex gap-3 overflow-x-auto pt-2 pb-4 px-1 snap-x no-scrollbar">
                            {sortedHand.map((item, idx) => {
                              const cardLevel = item.card.level || 0;
                              const isPlayable = item.card.cost <= resourceLevel && cardLevel <= resourceLevel;
                              
                              return (
                                <div 
                                  key={item.handId}
                                  className="w-[100px] shrink-0 snap-start flex flex-col gap-2"
                                  onClick={() => setSelectedHandIndex(idx)}
                                >
                                  <div className={cn(
                                    "aspect-[2/3] rounded-xl transition-all duration-200 relative",
                                    selectedHandIndex === idx ? "scale-105 z-10" : "",
                                    isPlayable ? "opacity-100" : "opacity-40 grayscale-[0.2]"
                                  )}>
                                    <div className={cn(
                                      "w-full h-full rounded-xl overflow-hidden transition-all",
                                      selectedHandIndex === idx ? "border-2 border-black shadow-xl" : "border-none shadow-sm"
                                    )}>
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
                                    </div>
                                  </div>
                                  {!isPlayable && (
                                    <p className="text-[7px] font-black text-stone-400 uppercase tracking-tighter text-center leading-tight">
                                      Not enough resource to play
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                            {/* Peeking card placeholder */}
                            <div className="w-10 shrink-0" />
                          </div>

                        </div>

                        {/* Info Tabs */}
                        <div className="space-y-4">
                          <div className="flex bg-stone-100 p-1 rounded-xl">
                            <button 
                              onClick={() => setPlayTab('card_info')}
                              className={cn(
                                "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                playTab === 'card_info' ? "bg-white text-[#141414] shadow-sm" : "text-stone-400 hover:text-stone-600"
                              )}
                            >
                              Card info
                            </button>
                            <button 
                              onClick={() => setPlayTab('hand_synergy')}
                              className={cn(
                                "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                playTab === 'hand_synergy' ? "bg-white text-[#141414] shadow-sm" : "text-stone-400 hover:text-stone-600"
                              )}
                            >
                              Hand synergy
                            </button>
                          </div>

                          <AnimatePresence mode="wait">
                            {playTab === 'card_info' ? (
                              <motion.div 
                                key="card_info"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm space-y-4"
                              >
                                {(() => {
                                  const item = sortedHand[selectedHandIndex];
                                  if (!item) return null;
                                  const latestCard = allCards.find(c => c.id === item.card.id) || item.card;
                                  
                                  return (
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <h4 className="text-sm font-black text-stone-800">{latestCard.name}</h4>
                                          <p className="text-[10px] font-mono text-stone-400">{latestCard.cardNumber}</p>
                                        </div>
                                        <button 
                                          onClick={() => {
                                            const itemToRemove = sortedHand[selectedHandIndex];
                                            if (itemToRemove) {
                                              setCurrentHand(prev => prev.filter(item => item.handId !== itemToRemove.handId));
                                              setSelectedHandIndex(prev => Math.max(0, prev - 1));
                                            }
                                          }}
                                          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      </div>

                                      <div className="grid grid-cols-4 gap-2">
                                        <div className="bg-stone-50 p-2 rounded-xl text-center">
                                          <p className="text-[8px] font-black text-stone-400 uppercase tracking-tighter">Cost</p>
                                          <p className="text-xs font-bold text-stone-800">{latestCard.cost}</p>
                                        </div>
                                        <div className="bg-stone-50 p-2 rounded-xl text-center">
                                          <p className="text-[8px] font-black text-stone-400 uppercase tracking-tighter">Lvl</p>
                                          <p className="text-xs font-bold text-stone-800">{latestCard.level || '-'}</p>
                                        </div>
                                        <div className="bg-stone-50 p-2 rounded-xl text-center">
                                          <p className="text-[8px] font-black text-stone-400 uppercase tracking-tighter">AP</p>
                                          <p className="text-xs font-bold text-stone-800">{latestCard.ap || '-'}</p>
                                        </div>
                                        <div className="bg-stone-50 p-2 rounded-xl text-center">
                                          <p className="text-[8px] font-black text-stone-400 uppercase tracking-tighter">HP</p>
                                          <p className="text-xs font-bold text-stone-800">{latestCard.hp || '-'}</p>
                                        </div>
                                      </div>

                                      <div className="space-y-1">
                                        <p className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Ability</p>
                                        <p className="text-[11px] text-stone-600 leading-relaxed font-medium bg-stone-50 p-3 rounded-xl border border-stone-100">
                                          {latestCard.ability}
                                        </p>
                                      </div>

                                      {/* Card Tip for Providence Gundam */}
                                      {latestCard.name === "Providence Gundam" && (
                                        <div className="mt-4 pt-4 border-t border-stone-100">
                                          <div className="flex items-center gap-2 text-amber-700 mb-2">
                                            <Play size={10} className="fill-current" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Card Tip</span>
                                          </div>
                                          <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100/50">
                                            <p className="text-[11px] text-stone-600 leading-relaxed">
                                              <span className="font-bold text-stone-800">Providence Gundam</span> can be paired with other <span className="text-red-600 font-bold italic">ZAFT</span> pilots such as:{" "}
                                              {(() => {
                                                const zaftPilots = allCards.filter(c => 
                                                  c.type === "Pilot" && 
                                                  c.traits?.includes("ZAFT") &&
                                                  c.name !== "Rau Le Creuset"
                                                );
                                                return zaftPilots.map((pilot, pIdx) => (
                                                  <React.Fragment key={pilot.id}>
                                                    <button 
                                                      onClick={() => onPreviewCard(pilot)}
                                                      className="text-amber-600 hover:text-amber-700 font-bold underline decoration-amber-200 underline-offset-2 transition-colors"
                                                    >
                                                      {pilot.name}
                                                    </button>
                                                    {pIdx < zaftPilots.length - 1 ? ", " : ""}
                                                  </React.Fragment>
                                                ));
                                              })()}
                                              {" "}in order to achieve providence's pair effect.
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </motion.div>
                            ) : (
                              <motion.div 
                                key="hand_synergy"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-6"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                                    <Scan size={20} />
                                  </div>
                                  <h4 className="text-sm font-black uppercase tracking-tight">Link and pair effects</h4>
                                </div>
                                
                                <div className="space-y-8">
                                  {linkGroups.length > 0 ? (
                                    linkGroups.map((group) => (
                                      <div key={group.pilotName} className="flex items-start gap-6">
                                        {/* Pilot Side */}
                                        <div 
                                          className="flex flex-col items-center gap-2 shrink-0 cursor-pointer"
                                          onClick={() => {
                                            if (group.inHandPilot && group.pilot) {
                                              selectCardInHand(group.pilot.id);
                                            } else {
                                              showToast("This card has not been drawn into your current hand yet");
                                            }
                                          }}
                                        >
                                          <div className={cn(
                                            "w-16 aspect-[2/3] rounded-lg overflow-hidden border-2 transition-all",
                                            group.inHandPilot ? "border-amber-400 shadow-md opacity-100" : "border-stone-200 opacity-30 grayscale"
                                          )}>
                                            {group.pilot ? (
                                              <img 
                                                src={group.pilot.imageUrl} 
                                                alt={group.pilot.name}
                                                className="w-full h-full object-cover"
                                                crossOrigin="anonymous"
                                              />
                                            ) : (
                                              <div className="w-full h-full bg-stone-100 flex items-center justify-center">
                                                <Scan size={16} className="text-stone-300" />
                                              </div>
                                            )}
                                          </div>
                                          <span className={cn(
                                            "text-[8px] font-black uppercase tracking-tighter text-center max-w-[64px] leading-tight",
                                            group.inHandPilot ? "text-amber-600" : "text-stone-400"
                                          )}>
                                            {group.pilotName}
                                          </span>
                                        </div>

                                        {/* Units Side */}
                                        <div className="flex-1 flex flex-wrap gap-3 pt-1">
                                          {group.units.map((unit) => (
                                            <div 
                                              key={unit.id} 
                                              className="flex flex-col items-center gap-2 cursor-pointer"
                                              onClick={() => {
                                                if (group.inHandUnits.has(unit.id)) {
                                                  selectCardInHand(unit.id);
                                                } else {
                                                  showToast("This card has not been drawn into your current hand yet");
                                                }
                                              }}
                                            >
                                              <div className={cn(
                                                "w-12 aspect-[2/3] rounded-md overflow-hidden border transition-all",
                                                group.inHandUnits.has(unit.id) ? "border-blue-400 shadow-sm opacity-100" : "border-stone-100 opacity-30 grayscale"
                                              )}>
                                                <img 
                                                  src={unit.imageUrl} 
                                                  alt={unit.name}
                                                  className="w-full h-full object-cover"
                                                  crossOrigin="anonymous"
                                                />
                                              </div>
                                              <span className={cn(
                                                "text-[7px] font-bold truncate max-w-[48px] text-center",
                                                group.inHandUnits.has(unit.id) ? "text-blue-600" : "text-stone-300"
                                              )}>
                                                {unit.name}
                                              </span>
                                            </div>
                                          ))}
                                          {group.units.length === 0 && (
                                            <div className="flex items-center justify-center h-16 w-full border border-dashed border-stone-100 rounded-xl">
                                              <p className="text-[9px] text-stone-300 italic">No linkable units in deck</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                                      <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center text-stone-200">
                                        <Scan size={24} />
                                      </div>
                                      <p className="text-[11px] text-stone-400 font-medium italic">
                                        No pilots or linkable units in hand.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          ) : (
            <motion.section 
              key="cards"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-4 lg:px-12 space-y-8 w-full"
            >
              {/* Units Group */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Units</h3>
                  <div className="h-px flex-1 bg-stone-200/60" />
                  <span className="text-[10px] font-black text-stone-300">
                    {deck.items.filter(i => i.card.type === 'Unit').reduce((s, i) => s + i.count, 0)}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {deck.items.filter(i => i.card.type === 'Unit').map((item) => (
                    <CardGridItem 
                      key={`${item.card.id}-${item.artType}`} 
                      item={item} 
                      deckId={deck.id}
                      onPreviewCard={onPreviewCard}
                      onRemove={onRemove}
                      onUpdateCount={onUpdateCount}
                    />
                  ))}
                  {/* Add Unit Button */}
                  <button 
                    onClick={() => onEnterBuilderMode(['Unit'])}
                    className="aspect-[2/3] rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-2 text-stone-400 hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50/30 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                      <Plus size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tight">+ Add unit</span>
                  </button>
                </div>
              </div>

              {/* Others Group */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Pilots, Command, Base</h3>
                  <div className="h-px flex-1 bg-stone-200/60" />
                  <span className="text-[10px] font-black text-stone-300">
                    {deck.items.filter(i => i.card.type !== 'Unit').reduce((s, i) => s + i.count, 0)}
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {deck.items.filter(i => i.card.type !== 'Unit').map((item) => (
                    <CardGridItem 
                      key={`${item.card.id}-${item.artType}`} 
                      item={item} 
                      deckId={deck.id}
                      onPreviewCard={onPreviewCard}
                      onRemove={onRemove}
                      onUpdateCount={onUpdateCount}
                    />
                  ))}
                  {/* Add Others Button */}
                  <button 
                    onClick={() => onEnterBuilderMode(['Pilot', 'Command', 'Base'])}
                    className="aspect-[2/3] rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-2 text-stone-400 hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50/30 transition-all group p-2 text-center"
                  >
                    <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                      <Plus size={16} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-tighter leading-tight">+ Add pilot, command, base</span>
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Add to Hand Modal */}
        <AnimatePresence>
          {isAddHandModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddHandModalOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
              >
                <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-lg">
                      {isStartingHandSetup ? "Setup Starting Hand" : "Add to Hand"}
                    </h3>
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                      currentHand.length >= (isStartingHandSetup ? 5 : 10) ? "bg-red-100 text-red-600" : "bg-stone-100 text-stone-500"
                    )}>
                      {currentHand.length}/{isStartingHandSetup ? 5 : 10}
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsAddHandModalOpen(false);
                      setIsStartingHandSetup(false);
                    }}
                    className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {deck.items.map((item) => (
                      <button
                        key={`${item.card.id}-${item.artType}`}
                        disabled={currentHand.length >= (isStartingHandSetup ? 5 : 10)}
                        onClick={() => {
                          const limit = isStartingHandSetup ? 5 : 10;
                          if (currentHand.length >= limit) return;
                          const key = `${item.card.id}-${item.artType}`;
                          const handId = Math.random().toString(36).substring(2, 9);
                          setCurrentHand(prev => [...prev, { ...item, count: 1, handId }]);
                          setAddedItems(prev => ({ ...prev, [key]: true }));
                          setTimeout(() => {
                            setAddedItems(prev => {
                              const next = { ...prev };
                              delete next[key];
                              return next;
                            });
                          }, 1500);
                        }}
                        className={cn(
                          "flex flex-col gap-2 group text-left relative transition-all",
                          currentHand.length >= (isStartingHandSetup ? 5 : 10) ? "opacity-50 cursor-not-allowed grayscale-[0.5]" : "active:scale-95"
                        )}
                      >
                        <div className="aspect-[2/3] rounded-xl overflow-hidden border border-stone-200 group-hover:border-amber-400 transition-colors relative">
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
                          <AnimatePresence>
                            {addedItems[`${item.card.id}-${item.artType}`] && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] z-10"
                              >
                                <span className="text-[8px] font-black text-white uppercase tracking-[0.2em] text-center px-2 leading-tight">
                                  Added to hand
                                </span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="px-1">
                          <p className="text-[10px] font-bold truncate">{item.card.name}</p>
                          <p className="text-[8px] font-mono text-stone-400">{item.card.cardNumber}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {currentHand.length >= (isStartingHandSetup ? 5 : 1) && (
                  <div className="p-4 border-t border-stone-100 bg-stone-50">
                    <button 
                      onClick={() => {
                        setIsAddHandModalOpen(false);
                        setIsStartingHandSetup(false);
                      }}
                      className="w-full py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg active:scale-95 transition-all"
                    >
                      {isStartingHandSetup ? `Confirm Starting Hand (${currentHand.length})` : `Confirm (${currentHand.length})`}
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Import Deck Modal */}
        <AnimatePresence>
          {isImportModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsImportModalOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase tracking-tight">Import Deck</h3>
                    <button 
                      onClick={() => setIsImportModalOpen(false)}
                      className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <p className="text-stone-500 text-xs">
                    Paste your deck list below. Format: <code className="bg-stone-100 px-1 rounded">4x ST01-001</code>
                  </p>

                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="// Main Deck&#10;4x ST03-013&#10;4x GD01-008..."
                    className="w-full h-48 p-4 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-stone-200 resize-none"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsImportModalOpen(false)}
                      className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onImportDeck?.(importText);
                        setIsImportModalOpen(false);
                        setImportText('');
                        showToast("Successfully import deck");
                      }}
                      disabled={!importText.trim()}
                      className="flex-1 py-3 bg-[#141414] text-white rounded-xl font-bold text-sm active:scale-95 transition-all disabled:opacity-50"
                    >
                      Import
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Export Deck Modal */}
        <AnimatePresence>
          {isExportModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsExportModalOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase tracking-tight">Export Deck</h3>
                    <button 
                      onClick={() => setIsExportModalOpen(false)}
                      className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  
                  <p className="text-stone-500 text-xs">
                    Copy your deck list below to share it.
                  </p>

                  <textarea
                    readOnly
                    value={exportText}
                    className="w-full h-48 p-4 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-mono focus:outline-none resize-none"
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsExportModalOpen(false)}
                      className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold text-sm active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(exportText);
                        showToast("Successfully copy text to clipboard");
                        setIsExportModalOpen(false);
                      }}
                      className="flex-1 py-3 bg-[#141414] text-white rounded-xl font-bold text-sm active:scale-95 transition-all shadow-lg shadow-black/20"
                    >
                      Copy text
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Exit Play Mode Confirmation Modal */}
        <AnimatePresence>
          {isExitPlayModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsExitPlayModalOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
                    <AlertCircle size={32} className="text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Exit Play Mode?</h3>
                    <p className="text-stone-500 text-sm mt-1">Your current play session state will be lost.</p>
                  </div>
                  <div className="flex flex-col w-full gap-2 mt-2">
                    <button
                      onClick={() => {
                        setActiveTab('cards');
                        setPlayModeStep('setup_choice');
                        setDiceResults(null);
                        setIsExitPlayModalOpen(false);
                      }}
                      className="w-full py-4 bg-[#141414] text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-black/20 active:scale-95 transition-all"
                    >
                      Yes, Exit
                    </button>
                    <button
                      onClick={() => setIsExitPlayModalOpen(false)}
                      className="w-full py-4 bg-stone-100 text-stone-600 rounded-2xl font-black uppercase tracking-widest text-sm active:scale-95 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[110] px-4 py-2 bg-[#141414] text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-2xl flex items-center gap-2 border border-white/10"
            >
              <Info size={12} className="text-amber-400" />
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});
