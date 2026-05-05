import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy,
  limit,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { TournamentEvent, DeckSubmission, ALL_SETS, GundamCard } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Trophy, 
  User, 
  Layout, 
  ArrowRight,
  Filter,
  Layers,
  MapPin,
  Clock,
  X,
  MoreHorizontal,
  Copy,
  Download,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ProgressiveImage } from './ProgressiveImage';

interface EventCoverageProps {
  onSelectSubmission?: (submission: DeckSubmission) => void;
  onBack?: () => void;
}

const SEASONS = [
  { id: "GD04", name: "GD04 Phantom Aria" }
];

const cleanPlacement = (placement: string) => {
  if (!placement) return "";
  // Check if it's "Top X" and return just X, or handle "Winner", "1st", etc.
  let p = placement.trim();
  p = p.replace(/^Top\s+/i, '');
  return p;
};

const getPlacementRank = (placement: string): number => {
  const p = placement.toLowerCase().trim();
  
  // Handle direct numbers (e.g. "1", "2", "3", "4")
  if (p === '1') return 1;
  if (p === '2') return 2;
  if (p === '3') return 3;
  if (p === '4') return 4;
  if (p === '8') return 8;
  if (p === '16') return 16;
  if (p === '32') return 32;

  // Specific Winner rankings
  if (p.includes('winner') || p.includes('1st') || p.includes('champion') || p.includes('champ')) return 1;
  if (p.includes('finalist') || p.includes('runner up') || p.includes('2nd')) return 2;
  
  // 3rd place
  if (p.includes('3rd')) return 3;
  
  // 4th place or Top 4
  if (p.includes('4th') || p.includes('top 4')) return 4;
  
  // Top 8
  if (p.includes('top 8') || p.includes('8th') || p.includes('quarter')) return 8;
  
  // Top 16
  if (p.includes('top 16') || p.includes('16th')) return 16;
  
  // Top 32
  if (p.includes('top 32') || p.includes('32nd')) return 32;
  
  // Try to parse any number in the string
  const allNumbers = p.match(/\d+/g);
  if (allNumbers && allNumbers.length > 0) {
    return parseInt(allNumbers[0]);
  }
  
  return 100; // Fallback
};

export const EventCoverage: React.FC<EventCoverageProps> = ({ onSelectSubmission, onBack }) => {
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [submissions, setSubmissions] = useState<DeckSubmission[]>([]);
  const [recentTopDecks, setRecentTopDecks] = useState<DeckSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(SEASONS[0].id);
  const [activeIndex, setActiveIndex] = useState(0);
  const dragX = useMotionValue(0);
  const isDragging = useRef(false);
  
  const [focusedEvent, setFocusedEvent] = useState<TournamentEvent | null>(null);
  const [subView, setSubView] = useState<'home' | 'event' | 'all'>('home');
  
  useEffect(() => {
    setSubView('home');
  }, [selectedSeason]);

  useEffect(() => {
    if (recentTopDecks.length > 0 && activeIndex >= recentTopDecks.length) {
      setActiveIndex(0);
    }
  }, [recentTopDecks.length, activeIndex]);

  useEffect(() => {
    setLoading(true);
    // Fetch all events for the selected season
    const qEvents = query(collection(db, 'tournament_events'), where('season', '==', selectedSeason), orderBy('date', 'desc'));
    const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
      const eventsData: TournamentEvent[] = [];
      snapshot.forEach((doc) => {
        eventsData.push(doc.data() as TournamentEvent);
      });
      setEvents(eventsData);
    }, (err) => console.error(err));

    // Fetch approved submissions for the selected season
    const qSubmissions = query(
      collection(db, 'deck_submissions'), 
      where('status', '==', 'approved'),
      where('season', '==', selectedSeason),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeSubmissions = onSnapshot(qSubmissions, (snapshot) => {
      const subsData: DeckSubmission[] = [];
      snapshot.forEach((doc) => {
        subsData.push(doc.data() as DeckSubmission);
      });
      setSubmissions(subsData);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    // Fetch top 5 recent approved submissions across all seasons for the carousel
    const qRecent = query(
      collection(db, 'deck_submissions'), 
      where('status', '==', 'approved'),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsubscribeRecent = onSnapshot(qRecent, (snapshot) => {
      let recentData: DeckSubmission[] = [];
      snapshot.forEach((doc) => {
        recentData.push(doc.data() as DeckSubmission);
      });
      
      // If we have items but not enough to fill the carousel slots smoothly, duplicate them
      // We want at least 10 items for a very smooth infinite scroll without key collisions in the 3-5 rendered slots
      if (recentData.length > 0 && recentData.length < 10) {
        let duplicated: DeckSubmission[] = [];
        // Keep doubling until we have at least 10 or a reasonable amount
        while (duplicated.length < 10) {
          const currentSet = recentData.map((item, idx) => ({
            ...item,
            id: `${item.id}-v${Math.floor(duplicated.length / recentData.length)}`
          }));
          duplicated = [...duplicated, ...currentSet];
        }
        recentData = duplicated;
      }
      
      setRecentTopDecks(recentData);
    }, (err) => console.error(err));

    return () => {
      unsubscribeEvents();
      unsubscribeSubmissions();
      unsubscribeRecent();
    };
  }, [selectedSeason]);

  const getColorBg = (color: string) => {
    switch (color) {
      case 'Red': return 'bg-red-500';
      case 'Blue': return 'bg-blue-500';
      case 'Green': return 'bg-green-500';
      case 'White': return 'bg-slate-300';
      case 'Purple': return 'bg-purple-500';
      default: return 'bg-stone-500';
    }
  };

  const getDeckColors = (items: DeckSubmission['deckItems']) => {
    return Array.from(new Set(items.map(i => i.card.color)));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % recentTopDecks.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + recentTopDecks.length) % recentTopDecks.length);
  };

  const filteredDecks = subView === 'all' 
    ? submissions 
    : subView === 'event' && focusedEvent 
      ? submissions.filter(s => s.tournamentName === focusedEvent.name)
      : [];

  const sortedDecks = [...filteredDecks].sort((a, b) => {
    const rankA = getPlacementRank(a.placement);
    const rankB = getPlacementRank(b.placement);
    return rankA - rankB;
  });

  const getRankStyle = (index: number) => {
    const rank = index + 1;
    if (rank === 1) return "from-[#F5A623] to-[#F8D800] text-white";
    if (rank === 2) return "from-[#A4B9D2] to-[#BDCEDB] text-white";
    if (rank === 3) return "from-[#D98B4B] to-[#E6A97A] text-white";
    return "from-[#C4C4C4] to-[#D8D8D8] text-white";
  };

  if (subView !== 'home') {
    return (
      <div className="flex-1 overflow-y-auto bg-[#F9F9F7] animate-in slide-in-from-right duration-300 pb-24">
        <header className="bg-white border-b border-stone-200 p-4 sticky top-0 z-50">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSubView('home')}
              className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-black tracking-tight text-stone-900 uppercase leading-none mb-1">
                {subView === 'all' ? 'All Decklists' : focusedEvent?.name}
              </h1>
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none">
                {selectedSeason} • {filteredDecks.length} Decks
              </p>
            </div>
          </div>
        </header>

        <div className="px-3 py-6 max-w-2xl mx-auto space-y-3">
          {sortedDecks.length > 0 ? (
            <div className="flex flex-col gap-2 sm:gap-3">
              {sortedDecks.map((deck, index) => {
                const deckColors = getDeckColors(deck.deckItems);
                const rank = index + 1;
                return (
                  <motion.div 
                    key={deck.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => onSelectSubmission?.(deck)}
                    className="relative flex items-center bg-white rounded-xl sm:rounded-[1.25rem] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] border border-stone-100 overflow-hidden hover:shadow-md transition-all cursor-pointer group h-16 sm:h-20"
                  >
                    {/* Rank Section with Slanted Edge */}
                    <div className={cn(
                      "w-12 sm:w-20 h-full flex items-center justify-center bg-gradient-to-br relative z-10 shrink-0",
                      getRankStyle(index)
                    )}>
                      <span className="text-xl sm:text-4xl font-black italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                        {rank}
                      </span>
                      {/* The Slanted Edge */}
                      <div className="absolute top-0 -right-2 sm:-right-3 bottom-0 w-4 sm:w-6 bg-inherit z-[-1]" style={{ clipPath: 'polygon(0 0, 40% 0, 100% 100%, 0 100%)' }} />
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 flex items-center gap-2 sm:gap-5 px-1.5 sm:px-6 overflow-hidden">
                      {/* Deck Image */}
                      <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden shadow-sm flex-shrink-0 border border-stone-50 ml-0.5">
                        {deck.coverImageUrl ? (
                          <ProgressiveImage 
                            src={deck.coverImageUrl} 
                            referrerPolicy="no-referrer"
                            imageClassName="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                          />
                        ) : (
                          <div className="w-full h-full bg-stone-50 flex items-center justify-center text-stone-200">
                            <Layout size={16} />
                          </div>
                        )}
                      </div>

                      {/* Text Info */}
                      <div className="flex-1 min-w-0 pr-1 sm:pr-2">
                        <h3 className="text-[11px] sm:text-base font-black text-stone-900 leading-tight uppercase tracking-tight truncate">
                          {deck.deckName}
                        </h3>
                        <div className="flex items-center gap-x-1.5 sm:gap-x-3 mt-0.5 overflow-hidden">
                          <p className="text-[10px] sm:text-xs font-bold text-stone-400 capitalize truncate max-w-[70px] sm:max-w-[150px]">
                            By {deck.playerName}
                          </p>
                          <p className="text-[10px] sm:text-xs font-bold text-stone-300 shrink-0">
                            {new Date(deck.date).toLocaleDateString(undefined, { year: '2-digit', month: '2-digit', day: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {/* Color Squares (Horizontal Layout) */}
                      <div className="flex items-center gap-0.5 sm:gap-1.5 ml-auto shrink-0 pl-1 pr-2 sm:px-4">
                        {deckColors.map(color => (
                          <div 
                            key={color} 
                            className={cn(
                              "w-3 h-3 sm:w-5 sm:h-5 rounded-sm sm:rounded-md shadow-inner border border-white/10 shrink-0",
                              getColorBg(color)
                            )} 
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Layout size={48} className="text-stone-100 mb-4" />
              <h3 className="font-black text-stone-900 mb-1 uppercase tracking-tight">No decklists found</h3>
              <p className="text-sm text-stone-400">There are no approved decklists to display for this selection.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F9F9F7] animate-in fade-in duration-500 pb-24">
      <header className="bg-white border-b border-stone-200 p-4 sticky top-0 z-10">
        <div className="relative flex items-center justify-center">
          <h1 className="text-base font-black tracking-tight text-stone-900 uppercase">Event coverage</h1>
          {onBack && (
            <button 
              onClick={onBack}
              className="absolute right-0 w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </header>

      {/* Recent Top Performers Carousel */}
      {recentTopDecks.length > 0 && (
        <section className="mt-4 relative overflow-hidden">
          <div className="px-6 text-center mb-4">
            <h2 className="text-lg font-black tracking-tight text-stone-900">Recent top performers</h2>
          </div>

          <div className="relative h-[240px] md:h-[280px] flex items-center justify-center">
            {/* Ghost drag layer - captures drag anywhere in the section */}
            <motion.div 
              className="absolute inset-0 z-30 cursor-grab active:cursor-grabbing touch-none"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.03}
              onDragStart={() => {
                isDragging.current = true;
              }}
              onDrag={(_, info) => {
                dragX.set(info.offset.x * 0.2);
              }}
              onDragEnd={(_, info) => {
                dragX.set(0);
                setTimeout(() => {
                  isDragging.current = false;
                }, 50);

                if (info.offset.x < -40) handleNext();
                else if (info.offset.x > 40) handlePrev();
              }}
              onTap={(_, info) => {
                if (isDragging.current) return;
                
                const width = window.innerWidth;
                const tapX = info.point.x;
                
                // If it's a tap, check position
                if (tapX < width * 0.25) {
                  handlePrev();
                } else if (tapX > width * 0.75) {
                  handleNext();
                } else {
                  // Only select if they definitely meant to click the center
                  onSelectSubmission?.(recentTopDecks[activeIndex]);
                }
              }}
            />

            <div className="relative w-full h-full overflow-visible flex items-center justify-center">
              <AnimatePresence initial={false}>
                {[-1, 0, 1].map((offset) => {
                  const itemsCount = recentTopDecks.length;
                  const index = (activeIndex + offset + itemsCount) % itemsCount;
                  const deck = recentTopDecks[index];
                  const deckColors = getDeckColors(deck.deckItems);
                  const isCenter = offset === 0;

                  return (
                    <motion.div
                      key={deck.id}
                      initial={{ 
                        opacity: 0, 
                        scale: 0.8,
                        x: offset * 200,
                        zIndex: 0
                      }}
                      animate={{ 
                        opacity: isCenter ? 1 : 0.4, 
                        scale: isCenter ? 1 : 0.75,
                        zIndex: isCenter ? 20 : 10,
                        x: offset * 120
                      }}
                      style={{
                        x: isCenter ? dragX : offset * 120
                      }}
                      exit={{ 
                        opacity: 0, 
                        scale: 0.8,
                        x: offset * 200,
                        zIndex: 0
                      }}
                      transition={{ 
                        type: 'spring', 
                        stiffness: 300, 
                        damping: 30
                      }}
                      className="absolute w-[160px] md:w-[200px] transform-gpu will-change-transform"
                    >
                      <div className="bg-white rounded-[1.5rem] shadow-xl border border-stone-100 overflow-hidden transition-all select-none pointer-events-none">
                        <div className="relative aspect-[4/5]">
                          {deck.coverImageUrl ? (
                            <ProgressiveImage src={deck.coverImageUrl} referrerPolicy="no-referrer" imageClassName="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-300">
                              <Layout size={32} />
                            </div>
                          )}
                          
                          <div className={cn(
                            "absolute inset-x-0 bottom-0 p-3 pt-6 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity",
                            isCenter ? "opacity-100" : "opacity-0"
                          )}>
                            <h3 className="text-white font-black text-xs md:text-sm leading-tight drop-shadow-md line-clamp-2 uppercase tracking-tight">{deck.deckName}</h3>
                          </div>

                          <div className="absolute bottom-0 inset-x-0 flex h-1 z-10">
                            {deckColors.map(color => (
                              <div key={color} className={cn("flex-1", getColorBg(color))} />
                            ))}
                          </div>
                        </div>
                        
                        <div className={cn(
                          "p-2.5 bg-white text-center transition-all",
                          isCenter ? "opacity-100" : "opacity-40"
                        )}>
                          <p className="text-[7px] font-black text-stone-400 uppercase tracking-widest mb-0.5 line-clamp-1">
                            {deck.season} • {deck.playerName}
                          </p>
                          <p className="text-[9px] font-bold text-stone-600 line-clamp-1">{cleanPlacement(deck.placement)}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </section>
      )}

      {/* Main Content Filters */}
      <section className="mt-2 px-6">
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-stone-200"></div>
          </div>
          <div className="relative flex justify-start">
            <span className="pr-3 bg-[#F9F9F7] text-[10px] font-black text-stone-400 uppercase tracking-widest">Event list</span>
          </div>
        </div>

        {/* Improved Season Tabs with Backgrounds */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
          {SEASONS.map(season => (
            <button 
              key={season.id}
              onClick={() => setSelectedSeason(season.id)}
              className={cn(
                "h-10 px-6 rounded-full flex items-center justify-center transition-all active:scale-95 flex-shrink-0 min-w-[120px] font-black text-[10px] uppercase tracking-widest border",
                selectedSeason === season.id 
                  ? "bg-stone-900 text-white border-stone-900 shadow-md" 
                  : "bg-white text-stone-400 border-stone-200 hover:border-stone-300"
              )}
            >
              {season.name}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {/* All tournament decklist container */}
          <div 
            onClick={() => setSubView('all')}
            className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group active:scale-[0.98] py-5 px-6 flex items-center justify-between"
          >
            <h3 className="text-sm sm:text-base font-black text-stone-900 group-hover:text-stone-700 transition-colors uppercase tracking-tight">All tournament decklist</h3>
            <ArrowRight size={18} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
          </div>

          {/* Individual Organized Events */}
          {events.map(event => (
            <div 
              key={event.id}
              onClick={() => {
                setFocusedEvent(event);
                setSubView('event');
              }}
              className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden group active:scale-[0.98] py-5 px-6 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-sm sm:text-base font-black text-stone-900 group-hover:text-stone-700 transition-colors uppercase tracking-tight truncate">{event.name}</h3>
              </div>
              <ArrowRight size={18} className="text-stone-300 group-hover:text-stone-500 transition-colors shrink-0" />
            </div>
          ))}
        </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin" />
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Loading coverage...</p>
            </div>
          )}

          {!loading && events.length === 0 && submissions.length === 0 && (
            <div className="bg-white rounded-[2rem] p-12 text-center border border-dashed border-stone-200">
              <Layout size={48} className="mx-auto text-stone-200 mb-4" />
              <h3 className="font-black text-stone-900 mb-1">No coverage data yet</h3>
              <p className="text-sm text-stone-400">Winning decklists for {selectedSeason} are yet to be submitted.</p>
            </div>
          )}
      </section>
    </div>
  );
};

export const TournamentDeckDetail: React.FC<{ submission: DeckSubmission; onClose: () => void; onDuplicateDeck?: (deck: any) => void }> = ({ submission, onClose, onDuplicateDeck }) => {
  const [selectedCard, setSelectedCard] = useState<GundamCard | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportText, setExportText] = useState('');
  const [copied, setCopied] = useState(false);

  const deckItems = submission.deckItems;
  const units = deckItems.filter(i => i.card.type.includes('Unit'));
  const pilots = deckItems.filter(i => i.card.type.includes('Pilot'));
  const commands = deckItems.filter(i => i.card.type.includes('Command'));
  const bases = deckItems.filter(i => i.card.type.includes('Base'));

  const handleDuplicate = async () => {
    if (onDuplicateDeck) {
      setDuplicating(true);
      try {
        const deckToDuplicate = {
          id: submission.id,
          name: submission.deckName,
          items: submission.deckItems,
          coverImageUrl: submission.coverImageUrl,
          lastModified: Date.now()
        };
        await onDuplicateDeck(deckToDuplicate);
        setShowMenu(false);
      } catch (err) {
        console.error("Error duplicating deck:", err);
      } finally {
        setDuplicating(false);
      }
      return;
    }

    if (!auth.currentUser) {
      alert("Please sign in to duplicate decks.");
      return;
    }
    
    setDuplicating(true);
    try {
      const userDecksRef = collection(db, 'user_decks');
      await addDoc(userDecksRef, {
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'User',
        deckName: `${submission.deckName} (Copy)`,
        season: submission.season,
        deckItems: submission.deckItems,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPublic: false
      });
      alert("Deck successfully duplicated to your collection!");
      setShowMenu(false);
    } catch (err) {
      console.error("Error duplicating deck:", err);
      alert("Failed to duplicate deck.");
    } finally {
      setDuplicating(false);
    }
  };

  const renderSection = (title: string, items: typeof deckItems) => {
    if (items.length === 0) return null;
    const totalCount = items.reduce((acc, i) => acc + i.count, 0);
    
    const sortedItems = [...items].sort((a, b) => {
      const aLevel = Number(a.card.level) || 0;
      const bLevel = Number(b.card.level) || 0;
      return aLevel - bLevel;
    });

    return (
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-[10px] font-black tracking-widest text-stone-400 uppercase">{title}</h2>
          <div className="flex-1 h-px bg-stone-100" />
          <span className="text-[10px] font-black text-stone-300">{totalCount}</span>
        </div>
        <div className="grid grid-cols-3 gap-3 md:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {sortedItems.map((item, idx) => (
            <div 
              key={`${item.card.cardNumber}-${idx}`} 
              onClick={() => setSelectedCard(item.card)}
              className="flex flex-col group cursor-pointer active:scale-95 transition-transform"
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-sm border border-stone-100 bg-stone-50">
                <ProgressiveImage 
                  src={item.card.imageUrl} 
                  referrerPolicy="no-referrer"
                  imageClassName="w-full h-full object-cover" 
                />
                <div className="absolute top-1.5 right-1.5 min-w-[20px] h-5 px-1 rounded-md bg-stone-900/90 backdrop-blur-sm text-white flex items-center justify-center text-[9px] font-black shadow-lg">
                  x{item.count}
                </div>
              </div>
              <div className="mt-2 text-center">
                <p className="text-[9px] font-black text-stone-800 leading-tight truncate uppercase tracking-tight">
                  {item.card.name}
                </p>
                <p className="text-[8px] font-bold text-stone-400">
                  {item.card.cardNumber}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
      {/* Back button and Menu Bar */}
      <header className="bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between sticky top-0 z-[110]">
        <button 
          onClick={onClose} 
          className="w-10 h-10 rounded-full hover:bg-stone-50 flex items-center justify-center text-stone-600 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        
        <h2 className="text-xs sm:text-sm font-black tracking-tight text-stone-900 uppercase truncate px-2 text-center flex-1">
          {submission.deckName}
        </h2>

        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="w-10 h-10 rounded-full hover:bg-stone-50 flex items-center justify-center text-stone-600 transition-colors"
          >
            <MoreHorizontal size={20} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-[110]" onClick={() => setShowMenu(false)} />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden z-[120]"
                >
                  <button 
                    onClick={handleDuplicate}
                    disabled={duplicating}
                    className="w-full px-5 py-4 text-left text-sm font-black text-stone-900 uppercase tracking-tight hover:bg-stone-50 flex items-center gap-3 transition-colors disabled:opacity-50 border-b border-stone-50"
                  >
                    <Copy size={16} className="text-stone-400" />
                    {duplicating ? 'Duplicating...' : 'Duplicate Deck'}
                  </button>
                  <button 
                    onClick={() => {
                      const text = deckItems.map(i => `${i.count} ${i.card.cardNumber} ${i.card.name}`).join('\n');
                      setExportText(text);
                      setIsExportModalOpen(true);
                      setShowMenu(false);
                    }}
                    className="w-full px-5 py-4 text-left text-sm font-black text-stone-900 uppercase tracking-tight hover:bg-stone-50 flex items-center gap-3 transition-colors"
                  >
                    <Download size={16} className="text-stone-400" />
                    Export as Text
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-white">
        {/* Simplified Metadata */}
        <div className="px-6 py-6 border-b border-stone-50">
          <div className="flex items-center gap-2 text-[11px] font-black text-stone-400 uppercase tracking-widest mb-1.5">
            <span>{submission.season}</span>
            <span className="w-1 h-1 rounded-full bg-stone-200" />
            <span className="text-stone-500">{submission.eventType}</span>
            <span className="w-1 h-1 rounded-full bg-stone-200" />
            <span>{new Date(submission.date).toLocaleDateString()}</span>
          </div>
          <p className="text-sm font-black text-stone-900 uppercase tracking-tight">
            Rank {cleanPlacement(submission.placement)} <span className="text-stone-300 font-bold mx-1">/</span> <span className="text-stone-400 lowercase italic">by {submission.playerName}</span>
          </p>
        </div>

        <main className="max-w-4xl mx-auto w-full px-4 py-8 pb-32">
          {renderSection('Units', units)}
          {renderSection('Pilots', pilots)}
          {renderSection('Commands', commands)}
          {renderSection('Bases', bases)}
        </main>
      </div>

      {/* Card Detail Overlay */}
      <AnimatePresence>
        {selectedCard && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCard(null)}
              className="absolute inset-0 bg-stone-900/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg aspect-[2/3] z-[160] rounded-3xl overflow-hidden shadow-2xl border border-white/20"
            >
              <ProgressiveImage 
                src={selectedCard.imageUrl} 
                referrerPolicy="no-referrer"
                imageClassName="w-full h-full object-contain" 
              />
              <button 
                onClick={() => setSelectedCard(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/70 transition-colors"
                id="close-card-detail"
              >
                <X size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Export Deck Modal */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
              className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl z-[210]"
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
                
                <p className="text-stone-500 text-xs font-bold uppercase tracking-widest">
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
                    className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(exportText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all shadow-lg shadow-black/20 flex items-center justify-center gap-2"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy text'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
