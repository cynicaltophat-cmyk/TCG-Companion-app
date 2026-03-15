import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import debounce from 'lodash.debounce';
import { VirtuosoGrid } from 'react-virtuoso';
import { 
  Search, 
  Camera, 
  X, 
  Check,
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Info, 
  Scan, 
  Grid, 
  List as ListIcon,
  Sparkles,
  Loader2,
  Plus,
  Minus,
  Layout,
  RefreshCw,
  ExternalLink,
  Filter,
  ArrowUpDown,
  Trophy,
  History,
  Calendar,
  MapPin,
  Tag,
  ChevronRight as ChevronRightIcon,
  Swords,
  LogIn,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { GUNDAM_CARDS, GundamCard, ArtVariantType, ALL_SETS } from './data/cards';
import { identifyCard, IdentifiedCard, getCardPrice, getCachedPrice } from './services/geminiService';
import { cn, PriceDisplayMode, formatPrice } from './lib/utils';
import { DeckEditor, DeckEditorHandle } from './components/DeckEditor';
import { DeckList } from './components/DeckList';
import { PlayScreen } from './components/PlayScreen';
import { Deck, DeckItem, MatchEntry, MatchRound, MatchNature } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy, 
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';

const VARIANTS: ArtVariantType[] = ["Base art", "Parallel", "Beta", "Beta Parallel", "Premium", "Championship"];
const RARITIES = ["C", "U", "R", "LR"];
const COLORS = ["Red", "Blue", "Green", "White", "Purple"];
const TYPES = ["Base", "Unit", "Pilot", "Command"];

// --- Components ---

const MiniPrice = React.memo(({ cardNumber, cardName, artType = "Base art", mode }: { cardNumber: string, cardName: string, artType?: ArtVariantType, mode: PriceDisplayMode }) => {
  const [price, setPrice] = useState<string | null>(() => getCachedPrice(cardNumber, cardName, artType));
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    const cached = getCachedPrice(cardNumber, cardName, artType);
    if (cached) {
      setPrice(cached);
      hasFetched.current = true;
    }
  }, [cardNumber, cardName, artType]);

  const fetchPrice = async () => {
    if (loading || hasFetched.current) return;
    setLoading(true);
    const result = await getCardPrice(cardNumber, cardName, false, artType);
    setPrice(result);
    setLoading(false);
    hasFetched.current = true;
  };

  useEffect(() => {
    if (hasFetched.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchPrice();
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [cardNumber, cardName, artType]);

  const displayPrice = formatPrice(price, mode);

  return (
    <div ref={containerRef} className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 min-h-[14px]">
      {loading ? (
        <div className="flex items-center gap-1 text-stone-400 animate-pulse">
          <Loader2 size={10} className="animate-spin" />
          <span>Loading...</span>
        </div>
      ) : price ? (
        <span>{displayPrice || 'N/A'}</span>
      ) : (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            fetchPrice();
          }}
          className="text-[10px] font-bold text-stone-400 hover:text-amber-600 transition-colors flex items-center gap-1"
        >
          <RefreshCw size={10} />
          Retry
        </button>
      )}
    </div>
  );
});

const CardBadge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", className)}>
    {children}
  </span>
);

const ColorTag = ({ color }: { color: GundamCard['color'] }) => {
  const colors: Record<GundamCard['color'], string> = {
    Red: "bg-red-500 text-white",
    Blue: "bg-blue-500 text-white",
    Green: "bg-green-500 text-white",
    White: "bg-stone-100 text-stone-800 border border-stone-300",
    Black: "bg-stone-900 text-white",
    Yellow: "bg-yellow-400 text-stone-900",
    Purple: "bg-purple-600 text-white",
  };
  return <CardBadge className={colors[color]}>{color}</CardBadge>;
};

const RarityTag = ({ rarity }: { rarity: GundamCard['rarity'] }) => {
  const rarities: Record<GundamCard['rarity'], string> = {
    C: "bg-stone-400 text-white",
    U: "bg-stone-600 text-white",
    R: "bg-blue-600 text-white",
    SR: "bg-purple-600 text-white",
    UR: "bg-amber-500 text-white",
    LR: "bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400 text-stone-900 border border-amber-600/20 shadow-sm",
  };
  return <CardBadge className={rarities[rarity]}>{rarity}</CardBadge>;
};

const CardPrice = React.memo(({ cardNumber, cardName, artType = "Base art", mode, onModeChange }: { cardNumber: string, cardName: string, artType?: ArtVariantType, mode: PriceDisplayMode, onModeChange: (mode: PriceDisplayMode) => void }) => {
  const [price, setPrice] = useState<string | null>(() => getCachedPrice(cardNumber, cardName, artType));
  const [loading, setLoading] = useState(!getCachedPrice(cardNumber, cardName, artType));

  const fetchPrice = async (force = false) => {
    setLoading(true);
    const result = await getCardPrice(cardNumber, cardName, force, artType);
    setPrice(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchPrice();
  }, [cardNumber, cardName, artType]);

  const displayPrice = formatPrice(price, mode);

  if (loading && !price) {
    return (
      <div className="flex items-center gap-2 text-stone-400 text-xs animate-pulse">
        <Loader2 size={12} className="animate-spin" />
        <span>Fetching Yuyu-tei price...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {price ? (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1.5">
            {mode === 'JPY' ? 'Yuyu-tei' : 'SGD'}: {displayPrice}
            {loading && <Loader2 size={10} className="animate-spin opacity-50" />}
          </span>
        ) : (
          <span className="text-xs text-stone-400 italic">Yuyu-tei: Price not found</span>
        )}
        
        <div className="flex items-center gap-2">
          <a 
            href={`https://yuyu-tei.jp/sell/gcg/s/search?search_word=${cardNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-bold text-stone-400 hover:text-stone-600 hover:bg-stone-100 px-2 py-1 rounded-md transition-all border border-transparent hover:border-stone-200"
          >
            View on Yuyu-tei
            <ExternalLink size={10} />
          </a>
          <button 
            onClick={() => fetchPrice(true)}
            disabled={loading}
            className="p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-md transition-colors disabled:opacity-50"
            title="Refresh price"
          >
            <RefreshCw size={12} className={cn(loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex bg-white border border-stone-200 rounded-lg p-0.5">
          {(['JPY', 'SGD130', 'SGD120'] as PriceDisplayMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={cn(
                "px-2 py-1 rounded-md text-[10px] font-bold transition-all",
                mode === m 
                  ? "bg-[#141414] text-white" 
                  : "text-stone-400 hover:text-stone-600"
              )}
            >
              {m === 'JPY' ? '¥' : m === 'SGD130' ? 'YYT/130' : 'YYT/120'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

const GridItem = React.memo(({ 
  card, 
  onSelect, 
  onToggleExpanded, 
  isExpanded, 
  isDeckBuilderMode, 
  activeDeck, 
  onAddToDeck, 
  onRemoveFromDeck, 
  onUpdateDeckCount,
  priceMode
}: { 
  card: any, 
  onSelect: (card: any) => void, 
  onToggleExpanded: (id: string) => void,
  isExpanded: boolean,
  isDeckBuilderMode: boolean,
  activeDeck: Deck | undefined,
  onAddToDeck: (card: any, artType: ArtVariantType) => void,
  onRemoveFromDeck: (cardId: string, artType: ArtVariantType) => void,
  onUpdateDeckCount: (cardId: string, artType: ArtVariantType, delta: number) => void,
  priceMode: PriceDisplayMode
}) => {
  const deckItem = activeDeck?.items.find(i => i.card.id === (card.parentId || card.id) && i.artType === (card.variantType || "Base art"));
  const count = deckItem ? deckItem.count : 0;
  const totalCount = activeDeck?.items
    .filter(i => i.card.id === (card.parentId || card.id))
    .reduce((sum, i) => sum + i.count, 0) || 0;

  return (
    <div
      onClick={() => onSelect(card)}
      className={cn(
        "bg-white rounded-2xl overflow-hidden shadow-sm border transition-all cursor-pointer",
        card.isVariant ? "border-amber-200 bg-amber-50/10" : "border-stone-200"
      )}
    >
      <div className="relative bg-stone-100 aspect-[2/3]">
        <img 
          src={card.imageUrl} 
          alt={card.name}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          loading="lazy"
        />

        {!card.isVariant && (card.variants?.length || card.altImageUrl) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded(card.id);
            }}
            className={cn(
              "absolute top-2 right-2 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-all shadow-sm",
              isExpanded
                ? "bg-[#141414] text-white"
                : "bg-white/90 backdrop-blur-sm text-stone-600 hover:bg-white"
            )}
          >
            +Alt
          </button>
        )}

        {card.isVariant && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-500 text-white text-[8px] font-black uppercase rounded-md shadow-sm">
            {card.variantType}
          </div>
        )}

        {isDeckBuilderMode && activeDeck && (
          <div 
            className="absolute inset-x-0 bottom-0 p-2 bg-white/95 backdrop-blur-sm border-t border-stone-100 flex items-center justify-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => {
                if (count === 1) {
                  onRemoveFromDeck(card.parentId || card.id, card.variantType || "Base art");
                } else if (count > 1) {
                  onUpdateDeckCount(card.parentId || card.id, card.variantType || "Base art", -1);
                }
              }}
              disabled={count === 0}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90",
                count > 0 
                  ? "bg-white border border-stone-200 text-[#141414] shadow-sm hover:bg-stone-100" 
                  : "text-stone-300 cursor-not-allowed opacity-50"
              )}
            >
              <Minus size={14} />
            </button>
            
            <span className={cn(
              "text-sm font-black transition-colors min-w-[16px] text-center",
              totalCount >= 4 ? "text-red-500" : "text-[#141414]"
            )}>
              {totalCount}
            </span>
            
            <button 
              onClick={() => onAddToDeck(card, card.variantType || "Base art")}
              disabled={totalCount >= 4}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90 shadow-sm",
                totalCount < 4 
                  ? "bg-[#141414] text-white hover:bg-stone-800" 
                  : "bg-stone-200 text-stone-400 cursor-not-allowed"
              )}
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
      
      <div className="p-2">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-bold text-sm line-clamp-1">{card.name}</h3>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <ColorTag color={card.color} />
          <span className="text-[10px] font-mono text-stone-400">{card.cardNumber}</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <RarityTag rarity={card.rarity} />
            <MiniPrice 
              cardNumber={card.cardNumber} 
              cardName={card.name} 
              artType={card.variantType || "Base art"}
              mode={priceMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

// --- Main App ---

export default function App() {
  const [selectedCard, setSelectedCard] = useState<GundamCard | null>(null);
  const [selectedArtType, setSelectedArtType] = useState<ArtVariantType>("Base art");
  const [showAnatomy, setShowAnatomy] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  const debouncedSetSearch = useRef(
    debounce((query: string) => {
      setDebouncedSearchQuery(query);
    }, 300)
  ).current;

  useEffect(() => {
    debouncedSetSearch(searchQuery);
    return () => debouncedSetSearch.cancel();
  }, [searchQuery, debouncedSetSearch]);

  const [priceMode, setPriceMode] = useState<PriceDisplayMode>('JPY');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastScanTime, setLastScanTime] = useState(0);
  const SCAN_COOLDOWN = 1500; // 1.5 seconds between manual scans
  const [isAutoScan, setIsAutoScan] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDeckBuilderMode, setIsDeckBuilderMode] = useState(false);
  const [isDeckInPlayMode, setIsDeckInPlayMode] = useState(false);
  const [currentTab, setCurrentTab] = useState<'cards' | 'decks' | 'scan' | 'play' | 'profile'>('cards');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [matches, setMatches] = useState<MatchEntry[]>([]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Connection Test
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Matches Listener
  useEffect(() => {
    if (!user) {
      setMatches([]);
      return;
    }

    const q = query(
      collection(db, 'matches'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const matchesData = snapshot.docs.map(doc => doc.data() as MatchEntry);
      setMatches(matchesData);
    }, (error) => {
      console.error("Matches listener error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const deckEditorRef = useRef<DeckEditorHandle>(null);
  
  // Filter State
  const [activeFilters, setActiveFilters] = useState({
    sets: [] as string[],
    rarities: [] as string[],
    colors: [] as string[],
    types: [] as string[],
    variants: [] as string[]
  });
  
  // Deck Management
  const [decks, setDecks] = useState<Deck[]>([]);

  // Decks Listener
  useEffect(() => {
    if (!user) {
      setDecks([]);
      return;
    }

    const q = query(
      collection(db, 'decks'),
      where('uid', '==', user.uid),
      orderBy('lastModified', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const decksData = snapshot.docs.map(doc => doc.data() as Deck);
      setDecks(decksData);
    }, (error) => {
      console.error("Decks listener error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [showDeckList, setShowDeckList] = useState(false);
  const [isDeckEditorOpen, setIsDeckEditorOpen] = useState(false);
  const [openedEditorFromList, setOpenedEditorFromList] = useState(false);
  const [deckListAutoCreate, setDeckListAutoCreate] = useState(false);
  const [showDeckSelector, setShowDeckSelector] = useState(false);
  const [expandedCardIds, setExpandedCardIds] = useState<string[]>([]);
  const [isContinuousScanMode, setIsContinuousScanMode] = useState(false);
  
  // Sync activeDeckId if it's null but decks exist
  useEffect(() => {
    if (!activeDeckId && decks.length > 0) {
      setActiveDeckId(decks[0].id);
    }
  }, [decks, activeDeckId]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Persistence Removed - Handled by Firestore Listeners

  useEffect(() => {
    if (selectedCard || isScanning || showDeckList || (isDeckEditorOpen && currentTab === 'decks') || isFilterOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedCard, isScanning, showDeckList, isDeckEditorOpen, isFilterOpen, currentTab]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    // Force select account to avoid auto-login issues
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      console.log("Starting login process...");
      const result = await signInWithPopup(auth, provider);
      console.log("Login successful:", result.user.email);
      showToast("Signed in successfully!");
    } catch (error: any) {
      console.error("Login error details:", error);
      
      let message = "Login failed. Please try again.";
      if (error.code === 'auth/popup-blocked') {
        message = "Popup blocked! Please allow popups for this site.";
      } else if (error.code === 'auth/unauthorized-domain') {
        message = "Domain not authorized! Add this domain to Firebase Console.";
      } else if (error.message) {
        message = `Login error: ${error.message}`;
      }
      
      alert(message); // Using alert here because it's a critical setup issue
      showToast(message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const createDeck = async (name: string) => {
    if (!user) return;
    const deckId = Math.random().toString(36).substr(2, 9);
    const newDeck: Deck & { uid: string } = {
      id: deckId,
      uid: user.uid,
      name,
      items: [],
      lastModified: Date.now()
    };
    try {
      await setDoc(doc(db, 'decks', deckId), newDeck);
    } catch (error) {
      console.error("Error creating deck:", error);
    }
  };

  const deleteDeck = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'decks', id));
      if (activeDeckId === id) {
        setActiveDeckId(null);
        setIsDeckEditorOpen(false);
      }
    } catch (error) {
      console.error("Error deleting deck:", error);
    }
  };

  const addMatch = async (match: MatchEntry) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'matches', match.id), { ...match, uid: user.uid });
    } catch (error) {
      console.error("Error adding match:", error);
    }
  };

  const updateMatch = async (match: MatchEntry) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'matches', match.id), { ...match, uid: user.uid }, { merge: true });
    } catch (error) {
      console.error("Error updating match:", error);
    }
  };

  const deleteMatch = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'matches', id));
    } catch (error) {
      console.error("Error deleting match:", error);
    }
  };

  const resetDeckHistory = async (deckId: string) => {
    if (!user) return;
    const batch = writeBatch(db);
    let hasChanges = false;

    matches.forEach(match => {
      const filteredRounds = match.rounds.filter(round => round.myDeckSnapshot.id !== deckId);
      if (filteredRounds.length !== match.rounds.length) {
        hasChanges = true;
        const matchRef = doc(db, 'matches', match.id);
        if (filteredRounds.length === 0) {
          batch.delete(matchRef);
        } else {
          batch.update(matchRef, { rounds: filteredRounds });
        }
      }
    });

    if (hasChanges) {
      try {
        await batch.commit();
      } catch (error) {
        console.error("Error resetting deck history:", error);
      }
    }
  };

  const renameDeck = async (id: string, newName: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'decks', id), { 
        name: newName, 
        lastModified: Date.now() 
      }, { merge: true });
    } catch (error) {
      console.error("Error renaming deck:", error);
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const addToDeck = async (deckId: string, card: GundamCard, artType: ArtVariantType = "Base art") => {
    if (!user) return false;
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return false;

    const totalCount = deck.items
      .filter(item => item.card.id === card.id)
      .reduce((sum, item) => sum + item.count, 0);

    if (totalCount >= 4) {
      alert(`Maximum 4 copies of ${card.name} allowed.`);
      return false;
    }

    const existing = deck.items.find(item => item.card.id === card.id && item.artType === artType);
    let newItems;
    if (existing) {
      newItems = deck.items.map(item => 
        (item.card.id === card.id && item.artType === artType) ? { ...item, count: item.count + 1 } : item
      );
    } else {
      newItems = [...deck.items, { card, count: 1, artType }];
    }

    try {
      await setDoc(doc(db, 'decks', deckId), { 
        items: newItems, 
        lastModified: Date.now() 
      }, { merge: true });
      return true;
    } catch (error) {
      console.error("Error adding to deck:", error);
      return false;
    }
  };

  const removeFromDeck = async (deckId: string, cardId: string, artType: ArtVariantType) => {
    if (!user) return;
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;

    const newItems = deck.items.filter(item => !(item.card.id === cardId && item.artType === artType));
    
    try {
      await setDoc(doc(db, 'decks', deckId), { 
        items: newItems, 
        lastModified: Date.now() 
      }, { merge: true });
    } catch (error) {
      console.error("Error removing from deck:", error);
    }
  };

  const updateDeckCount = async (deckId: string, cardId: string, artType: ArtVariantType, delta: number) => {
    if (!user) return;
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;

    const totalCount = deck.items
      .filter(item => item.card.id === cardId)
      .reduce((sum, item) => sum + item.count, 0);

    const newItems = deck.items.map(item => {
      if (item.card.id === cardId && item.artType === artType) {
        if (delta > 0 && totalCount >= 4) {
          alert("Maximum 4 copies of a card allowed.");
          return item;
        }
        const newCount = Math.max(1, Math.min(4, item.count + delta));
        return { ...item, count: newCount };
      }
      return item;
    });

    try {
      await setDoc(doc(db, 'decks', deckId), { 
        items: newItems, 
        lastModified: Date.now() 
      }, { merge: true });
    } catch (error) {
      console.error("Error updating deck count:", error);
    }
  };

  const activeDeck = decks.find(d => d.id === activeDeckId);
  const displayDeckSize = activeDeck ? activeDeck.items.reduce((s, i) => s + i.count, 0) : 0;

  // Prefetch prices for cards in all decks
  useEffect(() => {
    decks.forEach(deck => {
      deck.items.forEach(item => {
        if (!getCachedPrice(item.card.cardNumber, item.card.name, item.artType)) {
          getCardPrice(item.card.cardNumber, item.card.name, false, item.artType);
        }
      });
    });
  }, [decks]);

  const uniqueSets = ALL_SETS;

  const toggleFilter = (category: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => {
      const current = prev[category];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: next };
    });
  };

  const resetFilters = () => {
    setActiveFilters({
      sets: [],
      rarities: [],
      colors: [],
      types: [],
      variants: []
    });
    setSearchQuery("");
  };

  const activeFilterList = useMemo(() => {
    const list: { category: keyof typeof activeFilters; value: string }[] = [];
    Object.entries(activeFilters).forEach(([category, values]) => {
      (values as string[]).forEach(value => {
        list.push({ category: category as keyof typeof activeFilters, value });
      });
    });
    return list;
  }, [activeFilters]);

  const filteredCards = useMemo(() => {
    return GUNDAM_CARDS.filter(card => {
      const query = debouncedSearchQuery.toLowerCase().trim();
      const normalizedQuery = query.replace(/[^a-z0-9]/g, '');
      const normalizedCardNumber = card.cardNumber.toLowerCase().replace(/[^a-z0-9]/g, '');

      const matchesSearch = !query || (
        card.name.toLowerCase().includes(query) ||
        card.cardNumber.toLowerCase().includes(query) ||
        (normalizedQuery.length > 2 && normalizedCardNumber.includes(normalizedQuery)) ||
        (card.link && card.link.toLowerCase().includes(query)) ||
        (card.traits && card.traits.some(trait => trait.toLowerCase().includes(query)))
      );
      
      // New multi-select filters
      const matchesSets = activeFilters.sets.length === 0 || activeFilters.sets.every(s => card.set === s);
      const matchesRarities = activeFilters.rarities.length === 0 || activeFilters.rarities.every(r => card.rarity === r);
      const matchesColors = activeFilters.colors.length === 0 || activeFilters.colors.every(c => card.color === c);
      const matchesTypes = activeFilters.types.length === 0 || activeFilters.types.every(t => card.type === t);
      const matchesVariants = activeFilters.variants.length === 0 || 
                             activeFilters.variants.every(v => v === "Base art" || card.variants?.some(cv => cv.type === v));

      return matchesSearch && matchesSets && matchesRarities && matchesColors && matchesTypes && matchesVariants;
    });
  }, [debouncedSearchQuery, activeFilters]);

  const gridData = useMemo(() => {
    const result: (GundamCard & { isVariant?: boolean; parentId?: string; variantType?: ArtVariantType })[] = [];
    filteredCards.forEach(card => {
      result.push(card);
      if (expandedCardIds.includes(card.id)) {
        if (card.variants && card.variants.length > 0) {
          card.variants.forEach(variant => {
            // Skip if variant is Base art as it's already pushed
            if (variant.type === "Base art") return;
            
            result.push({
              ...card,
              id: `${card.id}-${variant.type}`,
              imageUrl: variant.imageUrl,
              isVariant: true,
              parentId: card.id,
              variantType: variant.type
            });
          });
        } else if (card.altImageUrl) {
          result.push({
            ...card,
            id: `${card.id}-Parallel`,
            imageUrl: card.altImageUrl,
            isVariant: true,
            parentId: card.id,
            variantType: "Parallel"
          });
        }
      }
    });
    return result;
  }, [filteredCards, expandedCardIds]);

  const toggleExpanded = (id: string) => {
    setExpandedCardIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const currentIndex = useMemo(() => {
    if (!selectedCard) return -1;
    return gridData.findIndex(item => item.id === selectedCard.id);
  }, [selectedCard, gridData]);

  const handleSwipe = (direction: number) => {
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < gridData.length) {
      setSwipeDirection(direction);
      const nextCard = gridData[newIndex];
      setSelectedCard(nextCard);
      setSelectedArtType(nextCard.variantType || "Base art");
      setShowAnatomy(false);
    }
  };

  const renderAbilityText = (text: string) => {
    if (!text) return null;
    // Smart regex to catch "When Paired", "During Pair", and variations with conditions/pilots
    // Supports spaces or middle dots (･) as separators
    const triggerRegex = /(During Pair|When Paired(?:[\s･]+\([^)]+\))?(?:[\s･]+lvl\s+\d+\s+or\s+Higher)?(?:[\s･]+pilot)?|\[When Paired\])/gi;
    const parts = text.split(triggerRegex);
    
    return (
      <>
        {parts.map((part, i) => {
          if (part && part.match(triggerRegex)) {
            return (
              <span 
                key={i} 
                className="bg-[#C86891] text-black px-1.5 py-0.5 rounded-sm font-bold not-italic inline-block mx-0.5"
              >
                {part}
              </span>
            );
          }
          return part;
        })}
      </>
    );
  };

  const startCamera = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Could not access camera. Please check permissions.");
      setIsScanning(false);
      setCurrentTab('cards');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsScanning(false);
    setCurrentTab('cards');
  };

  const captureAndIdentify = async (silent = false) => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    
    const now = Date.now();
    if (!silent && now - lastScanTime < SCAN_COOLDOWN) return;

    setIsAnalyzing(true);
    if (!silent) setLastScanTime(now);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      setIsAnalyzing(false);
      return;
    }

    // Optimization: Crop to center and reduce resolution to save quota/tokens
    // 600x900 is plenty for OCR while being much smaller than full 4K/1080p frames
    const targetWidth = 600;
    const targetHeight = 900;
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Calculate crop area (center 2:3 aspect ratio to match the UI frame)
      let sourceWidth, sourceHeight, sourceX, sourceY;
      const targetAspect = 2/3;
      const videoAspect = videoWidth / videoHeight;

      if (videoAspect > targetAspect) {
        sourceHeight = videoHeight;
        sourceWidth = videoHeight * targetAspect;
        sourceX = (videoWidth - sourceWidth) / 2;
        sourceY = 0;
      } else {
        sourceWidth = videoWidth;
        sourceHeight = videoWidth / targetAspect;
        sourceX = 0;
        sourceY = (videoHeight - sourceHeight) / 2;
      }

      ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
      const base64Image = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
      
      try {
        const identified = await identifyCard(base64Image);
        if (identified) {
          if (isContinuousScanMode && activeDeckId) {
            const success = addToDeck(activeDeckId, identified.card, "Base art");
            if (success) {
              showToast(`1x ${identified.card.name} added successfully`);
            }
            // In continuous mode, we don't stop the camera or set selected card
          } else {
            setSelectedCard(identified.card);
            setSelectedArtType("Base art");
            stopCamera();
          }
        } else if (!silent) {
          alert("Could not identify card. Try again with better lighting.");
        }
      } catch (err) {
        console.error("Identification error:", err);
        if (!silent) alert("An error occurred during identification.");
      }
    }
    setIsAnalyzing(false);
  };

  // Auto-scan effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning && isAutoScan && !selectedCard) {
      interval = setInterval(() => {
        if (!isAnalyzing) {
          captureAndIdentify(true);
        }
      }, 3000); // Scan every 3 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScanning, isAutoScan, isAnalyzing, selectedCard]);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-amber-200">
      <div className={cn(
        "transition-all duration-300", 
        isFilterOpen && "blur-[2px] brightness-95",
        currentTab === 'play' && "flex flex-col h-screen"
      )}>
      {/* Header */}
      {currentTab === 'cards' && (
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#141414]/10 px-4 py-2">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <div className="w-8 h-8 bg-[#141414] rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
              <Sparkles size={16} />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input 
                type="text"
                placeholder="Search cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-10 py-2 bg-stone-100 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
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
            <div className="flex items-center gap-0.5">
              <button 
                onClick={() => setIsFilterOpen(true)}
                className={cn(
                  "p-2 rounded-lg transition-colors active:scale-95 relative",
                  Object.values(activeFilters).some(f => f.length > 0)
                    ? "text-amber-600 bg-amber-50"
                    : "text-stone-500 hover:bg-stone-100"
                )}
              >
                <Filter size={18} />
                {Object.values(activeFilters).some(f => f.length > 0) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full border-2 border-white" />
                )}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Play Screen */}
      {currentTab === 'play' && (
        <PlayScreen 
          matches={matches}
          onAddMatch={addMatch}
          onUpdateMatch={updateMatch}
          onDeleteMatch={deleteMatch}
          decks={decks}
        />
      )}

      {/* Profile Screen */}
      {currentTab === 'profile' && user && (
        <div className="flex-1 flex flex-col bg-[#F5F5F0] min-h-screen">
          <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#141414]/10 px-4 py-4">
            <div className="max-w-md mx-auto flex items-center justify-center">
              <h1 className="text-xl font-black text-[#141414] tracking-tight uppercase">Profile</h1>
            </div>
          </header>

          <div className="max-w-md mx-auto w-full p-6 pb-32 flex flex-col items-center gap-6">
            <div className="w-24 h-24 rounded-3xl border-4 border-white shadow-xl overflow-hidden bg-stone-200 rotate-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400">
                  <UserIcon size={48} />
                </div>
              )}
            </div>
            
            <div className="text-center">
              <h2 className="text-2xl font-black text-[#141414] tracking-tight">{user.displayName || 'User'}</h2>
              <p className="text-stone-500 font-medium">{user.email}</p>
            </div>

            <div className="w-full space-y-4 mt-4">
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Account Status</p>
                <p className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  Synced & Secured
                </p>
              </div>

              <button 
                onClick={() => {
                  logout();
                  setCurrentTab('cards');
                }}
                className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold flex items-center justify-center gap-3 border border-red-100 active:scale-95 transition-all hover:bg-red-100"
              >
                <LogOut size={20} />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      <main className={cn("max-w-md mx-auto px-4 pt-4", currentTab !== 'cards' && "hidden")}>
        {/* Filters */}
        {currentTab === 'cards' && (
          <>
            <div className="mb-6 space-y-4">
          {/* Active Filter Tags */}
          {(activeFilterList.length > 0 || debouncedSearchQuery) && (
            <div className="flex flex-wrap gap-2 mb-2">
              {debouncedSearchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors border border-stone-200 group"
                >
                  Search: {debouncedSearchQuery}
                  <X size={10} className="text-stone-400 group-hover:text-stone-600" />
                </button>
              )}
              {activeFilterList.map(({ category, value }) => (
                <button
                  key={`${category}-${value}`}
                  onClick={() => toggleFilter(category, value)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors border border-amber-200 group"
                >
                  {value}
                  <X size={10} className="text-amber-400 group-hover:text-amber-600" />
                </button>
              ))}
              <button
                onClick={resetFilters}
                className="text-[10px] font-black uppercase tracking-wider text-stone-400 hover:text-stone-600 transition-colors py-1 px-1"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-widest">
              {filteredCards.length} Cards Found
            </p>
            <div className="flex bg-white border border-stone-200 rounded-lg p-0.5">
              {(['JPY', 'SGD130', 'SGD120'] as PriceDisplayMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setPriceMode(m)}
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
        </div>

        {/* Card Grid */}
        {filteredCards.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-6 text-stone-300">
              <Search size={40} />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">No cards found</h3>
            <p className="text-stone-500 text-sm mb-8 max-w-[240px]">
              Try removing one or more active filters to see more results.
            </p>

            {(activeFilterList.length > 0 || debouncedSearchQuery) && (
              <div className="space-y-6 w-full max-w-xs">
                {/* Active Filters List */}
                <div className="flex flex-wrap justify-center gap-2">
                  {debouncedSearchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-full text-xs font-bold transition-colors border border-stone-200"
                    >
                      Search: {debouncedSearchQuery}
                      <X size={12} />
                    </button>
                  )}
                  {activeFilterList.map(({ category, value }) => (
                    <button
                      key={`${category}-${value}`}
                      onClick={() => toggleFilter(category, value)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-full text-xs font-bold transition-colors border border-amber-200"
                    >
                      {value}
                      <X size={12} />
                    </button>
                  ))}
                </div>

                <button
                  onClick={resetFilters}
                  className="w-full py-3 rounded-2xl bg-[#141414] text-white font-bold text-sm shadow-lg shadow-stone-200 active:scale-95 transition-all"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <VirtuosoGrid
            useWindowScroll
            data={gridData}
            listClassName="grid gap-2 grid-cols-3 pb-32"
            itemContent={(index, card) => (
              <GridItem 
                key={card.id}
                card={card}
                onSelect={(c) => {
                  setSelectedCard(c);
                  setSelectedArtType(c.variantType || "Base art");
                  setSwipeDirection(0);
                }}
                onToggleExpanded={toggleExpanded}
                isExpanded={expandedCardIds.includes(card.id)}
                isDeckBuilderMode={isDeckBuilderMode}
                activeDeck={activeDeck}
                onAddToDeck={(c, art) => {
                  const originalCard = GUNDAM_CARDS.find(gc => gc.id === (c.parentId || gc.id));
                  if (originalCard && activeDeckId) {
                    addToDeck(activeDeckId, originalCard, art);
                  }
                }}
                onRemoveFromDeck={(id, art) => activeDeckId && removeFromDeck(activeDeckId, id, art)}
                onUpdateDeckCount={(id, art, delta) => activeDeckId && updateDeckCount(activeDeckId, id, art, delta)}
                priceMode={priceMode}
              />
            )}
          />
        )}
      </>
    )}
  </main>

      {/* Sticky Deck Builder Bar */}
      <AnimatePresence>
        {isDeckBuilderMode && (
          <motion.div 
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            exit={{ y: 50 }}
            className="fixed bottom-[48px] left-0 right-0 z-[80] bg-white border-t border-stone-200 flex flex-col shadow-[0_-4px_12px_rgba(0,0,0,0.05)]"
          >
            {/* Color Indicator Bar */}
            <div className="flex h-1 w-full">
              {(() => {
                const colors = Array.from(new Set(activeDeck?.items.map(i => i.card.color) || []));
                const getColorBg = (color: string) => {
                  switch (color) {
                    case 'Red': return 'bg-red-500';
                    case 'Blue': return 'bg-blue-500';
                    case 'Green': return 'bg-emerald-500';
                    case 'White': return 'bg-stone-200';
                    case 'Black': return 'bg-stone-900';
                    case 'Yellow': return 'bg-amber-400';
                    case 'Purple': return 'bg-purple-500';
                    default: return 'bg-stone-200';
                  }
                };

                if (colors.length >= 3) {
                  return <div className="w-full h-full" style={{ background: 'linear-gradient(to right, #3b82f6, #ef4444, #a855f7, #ffffff, #10b981)' }} />;
                } else if (colors.length === 2) {
                  return (
                    <>
                      <div className={cn("flex-1 h-full", getColorBg(colors[0]))} />
                      <div className={cn("flex-1 h-full", getColorBg(colors[1]))} />
                    </>
                  );
                } else if (colors.length === 1) {
                  return <div className={cn("w-full h-full", getColorBg(colors[0]))} />;
                }
                return null;
              })()}
            </div>

            <div className="px-4 py-2 flex items-center gap-3">
              <button 
                onClick={() => {
                  setIsDeckBuilderMode(false);
                  setIsDeckEditorOpen(true);
                  setCurrentTab('decks');
                }}
                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-black text-[9px] uppercase tracking-wider transition-colors shrink-0 shadow-sm"
              >
                Exit builder
              </button>
            
            <div className="relative flex-1">
              <select 
                value={activeDeckId || ''}
                onChange={(e) => setActiveDeckId(e.target.value)}
                className="w-full appearance-none bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-[10px] font-bold text-stone-700 focus:outline-none pr-6"
              >
                {decks.length === 0 && <option value="">No Decks</option>}
                {decks.map(deck => (
                  <option key={deck.id} value={deck.id}>{deck.name}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                <ChevronDown size={10} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-stone-400 uppercase leading-none">Cards</span>
                <span className="text-[11px] font-black text-[#141414] leading-none">
                  {activeDeck?.items.reduce((s, i) => s + i.count, 0) || 0}/50
                </span>
              </div>
            </div>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Sticky Footer Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#F5F5F0] border-t border-stone-200/60 pb-2 pt-1">
        <div className="max-w-md mx-auto flex items-center justify-around px-4">
          <button 
            onClick={() => {
              if (selectedCard) {
                setSelectedCard(null);
                setSelectedArtType("Base art");
                setShowAnatomy(false);
              }
              if (isDeckEditorOpen && deckEditorRef.current && !isDeckInPlayMode && !isDeckBuilderMode) {
                setOpenedEditorFromList(false);
                setIsDeckEditorOpen(false);
              }
              if (currentTab === 'scan') stopCamera();
              setCurrentTab('cards');
              setShowDeckList(false);
              setIsScanning(false);
            }}
            className="flex flex-col items-center gap-0 group transition-all active:scale-95 relative"
          >
            <div className={cn(
              "p-1 rounded-lg transition-colors",
              currentTab === 'cards' ? "bg-stone-200/80" : "group-hover:bg-stone-200/50"
            )}>
              <Grid size={16} className={cn(
                "transition-colors",
                currentTab === 'cards' ? "text-[#141414]" : "text-stone-500 group-hover:text-[#141414]"
              )} strokeWidth={currentTab === 'cards' ? 2 : 1.5} />
            </div>
            <span className={cn(
              "text-[8px] font-bold uppercase tracking-tighter transition-colors",
              currentTab === 'cards' ? "text-[#141414]" : "text-stone-400 group-hover:text-[#141414]"
            )}>Cards</span>
          </button>

          <button 
            onClick={() => {
              if (selectedCard) {
                setSelectedCard(null);
                setSelectedArtType("Base art");
                setShowAnatomy(false);
              }
              if (isDeckEditorOpen && deckEditorRef.current && !isDeckInPlayMode && !isDeckBuilderMode) {
                setOpenedEditorFromList(false);
                setIsDeckEditorOpen(false);
              }
              if (currentTab === 'scan') stopCamera();
              setCurrentTab('play');
              setShowDeckList(false);
              setIsScanning(false);
            }}
            className="flex flex-col items-center gap-0 group transition-all active:scale-95 relative"
          >
            <div className={cn(
              "p-1 rounded-lg transition-colors",
              currentTab === 'play' ? "bg-stone-200/80" : "group-hover:bg-stone-200/50"
            )}>
              <Trophy size={16} className={cn(
                "transition-colors",
                currentTab === 'play' ? "text-[#141414]" : "text-stone-500 group-hover:text-[#141414]"
              )} strokeWidth={currentTab === 'play' ? 2 : 1.5} />
            </div>
            <span className={cn(
              "text-[8px] font-bold uppercase tracking-tighter transition-colors",
              currentTab === 'play' ? "text-[#141414]" : "text-stone-400 group-hover:text-[#141414]"
            )}>Play</span>
          </button>

          <button 
            onClick={() => {
              if (selectedCard) {
                setSelectedCard(null);
                setSelectedArtType("Base art");
                setShowAnatomy(false);
              }
              if (isDeckEditorOpen && deckEditorRef.current && !isDeckInPlayMode && !isDeckBuilderMode) {
                deckEditorRef.current.requestClose();
                return;
              }
              if (currentTab === 'scan') stopCamera();
              
              if (isDeckInPlayMode) {
                setCurrentTab('decks');
                setIsDeckEditorOpen(true);
              } else if (isDeckBuilderMode && activeDeckId) {
                setIsDeckEditorOpen(true);
                setShowDeckList(false);
                setCurrentTab('decks');
              } else {
                setShowDeckList(true);
                setIsDeckEditorOpen(false);
                setCurrentTab('decks');
              }

              setIsScanning(false);
            }}
            className="flex flex-col items-center gap-0 group transition-all active:scale-95 relative"
          >
            <div className={cn(
              "p-1 rounded-lg transition-colors",
              currentTab === 'decks' ? "bg-stone-200/80" : "group-hover:bg-stone-200/50"
            )}>
              <Layout size={16} className={cn(
                "transition-colors",
                currentTab === 'decks' ? "text-[#141414]" : "text-stone-500 group-hover:text-[#141414]"
              )} strokeWidth={currentTab === 'decks' ? 2 : 1.5} />
            </div>
            <span className={cn(
              "text-[8px] font-bold uppercase tracking-tighter transition-colors",
              currentTab === 'decks' ? "text-[#141414]" : "text-stone-400 group-hover:text-[#141414]"
            )}>Decks</span>
            {decks.length > 0 && (
              <span className="absolute top-0 right-0 w-3 h-3 bg-amber-500 text-white text-[6px] font-black rounded-full flex items-center justify-center border-2 border-[#F5F5F0]">
                {decks.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => {
              if (selectedCard) {
                setSelectedCard(null);
                setSelectedArtType("Base art");
                setShowAnatomy(false);
              }
              if (isDeckEditorOpen && deckEditorRef.current && !isDeckInPlayMode && !isDeckBuilderMode) {
                setOpenedEditorFromList(false);
                setIsDeckEditorOpen(false);
              }
              if (currentTab === 'scan') stopCamera();
              setCurrentTab('scan');
              setIsScanning(true);
              setShowDeckList(false);
              startCamera();
            }}
            className="flex flex-col items-center gap-0 group transition-all active:scale-95"
          >
            <div className={cn(
              "p-1 rounded-lg transition-colors",
              currentTab === 'scan' ? "bg-stone-200/80" : "group-hover:bg-stone-200/50"
            )}>
              <Scan size={16} className={cn(
                "transition-colors",
                currentTab === 'scan' ? "text-[#141414]" : "text-stone-500 group-hover:text-[#141414]"
              )} strokeWidth={currentTab === 'scan' ? 2 : 1.5} />
            </div>
            <span className={cn(
              "text-[8px] font-bold uppercase tracking-tighter transition-colors",
              currentTab === 'scan' ? "text-[#141414]" : "text-stone-400 group-hover:text-[#141414]"
            )}>Scan</span>
          </button>

          <button 
            onClick={() => {
              if (user) {
                setCurrentTab('profile');
                setIsScanning(false);
                setShowDeckList(false);
                setIsDeckEditorOpen(false);
                if (currentTab === 'scan') stopCamera();
              } else {
                login();
              }
            }}
            className="flex flex-col items-center gap-0 group transition-all active:scale-95"
          >
            <div className={cn(
              "p-1 rounded-lg transition-colors",
              (user && currentTab === 'profile') ? "bg-stone-200/80" : "group-hover:bg-stone-200/50"
            )}>
              {user ? (
                user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon size={16} className={cn(currentTab === 'profile' ? "text-[#141414]" : "text-stone-500 group-hover:text-[#141414]")} />
                )
              ) : (
                <LogIn size={16} className="text-stone-500 group-hover:text-[#141414]" />
              )}
            </div>
            <span className={cn(
              "text-[8px] font-bold uppercase tracking-tighter transition-colors",
              (user && currentTab === 'profile') ? "text-[#141414]" : "text-stone-400 group-hover:text-[#141414]"
            )}>
              {user ? "Profile" : "Login"}
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-none"
          >
            <div className="bg-[#141414] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10">
              <Check size={18} className="text-emerald-400" />
              <span className="text-sm font-bold tracking-tight">{toast}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanner Overlay */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            <div className="relative flex-1">
              <video 
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Scanner Frame */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-96 border-2 border-white/50 rounded-2xl relative">
                  <div className="absolute inset-0 border-2 border-amber-400 rounded-2xl animate-pulse" />
                  
                  {/* Top Text */}
                  <div className="absolute -top-14 left-0 right-0 text-center flex flex-col gap-1">
                    {isContinuousScanMode ? (
                      <>
                        <span className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">Continuous Scan Active</span>
                        <span className="text-white/60 text-[10px] font-medium uppercase tracking-tight">Adding to: {activeDeck?.name}</span>
                      </>
                    ) : (
                      <span className="text-white text-sm font-medium">Align card within frame</span>
                    )}
                  </div>

                  {/* Status/Controls below frame */}
                  <div className="absolute -bottom-32 left-0 right-0 flex flex-col items-center gap-4 pointer-events-auto">
                    {isContinuousScanMode && (
                      <button 
                        onClick={() => captureAndIdentify()}
                        disabled={isAnalyzing}
                        className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
                      >
                        {isAnalyzing ? (
                          <Loader2 className="text-white animate-spin" size={24} />
                        ) : (
                          <div className="w-12 h-12 bg-white rounded-full" />
                        )}
                      </button>
                    )}

                    <div className="text-center space-y-2 w-full max-w-[180px]">
                      <p className="text-white/90 text-[10px] font-black uppercase tracking-[0.2em]">
                        {isAnalyzing 
                          ? "Analyzing card, please wait" 
                          : !isContinuousScanMode 
                            ? (isAutoScan ? "Searching for card..." : "Manual Scan Mode")
                            : ""}
                      </p>
                      
                      {isAnalyzing && (
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ x: "-100%" }}
                            animate={{ x: "100%" }}
                            transition={{ 
                              repeat: Infinity, 
                              duration: 1.5, 
                              ease: "linear" 
                            }}
                            className="w-full h-full bg-emerald-500"
                          />
                        </div>
                      )}

                      {(isAutoScan || isContinuousScanMode) && !isAnalyzing && (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-1 h-1 bg-amber-500 rounded-full animate-ping" />
                          <p className="text-white/40 text-[8px] uppercase tracking-widest font-bold">
                            Position card in frame
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute top-6 left-6 flex items-center gap-3">
                <button 
                  onClick={() => {
                    if (isContinuousScanMode) {
                      setIsContinuousScanMode(false);
                    }
                    stopCamera();
                  }}
                  className="p-2 bg-black/50 text-white rounded-full backdrop-blur-md border border-white/10 active:scale-95 transition-all"
                >
                  {isContinuousScanMode ? <ChevronLeft size={24} /> : <X size={24} />}
                </button>
                
                {!isContinuousScanMode && (
                  <button 
                    onClick={() => setIsAutoScan(!isAutoScan)}
                    className={cn(
                      "px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all backdrop-blur-md border",
                      isAutoScan 
                        ? "bg-amber-500 text-white border-amber-400" 
                        : "bg-black/50 text-white/60 border-white/20"
                    )}
                  >
                    Auto Scan: {isAutoScan ? "ON" : "OFF"}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-black p-8 pb-20 flex flex-col items-center gap-6">
              {!isAutoScan && !isContinuousScanMode && (
                <button 
                  onClick={() => captureAndIdentify()}
                  disabled={isAnalyzing}
                  className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <Loader2 className="text-white animate-spin" size={32} />
                  ) : (
                    <div className="w-16 h-16 bg-white rounded-full" />
                  )}
                </button>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Detail Modal */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-[#F5F5F0] overflow-y-auto overscroll-contain"
          >
            <div className={cn(
              "max-w-md mx-auto min-h-screen flex flex-col",
              isDeckBuilderMode ? "pb-40" : "pb-24"
            )}>
              {/* Modal Header */}
              <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200 px-4 py-3 flex items-center justify-between">
                <button 
                  onClick={() => {
                    setSelectedCard(null);
                    setSelectedArtType("Base art");
                    setShowAnatomy(false);
                  }}
                  className="p-2 text-[#141414] hover:bg-stone-100 rounded-full transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setShowDeckSelector(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#141414] text-white rounded-full hover:bg-stone-800 transition-colors shadow-lg shadow-black/10 active:scale-95"
                  >
                    <Plus size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Add to deck</span>
                  </button>
                </div>
              </div>

              <div className="relative w-full h-[372px] mt-1 flex items-center justify-center overflow-hidden">
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Previous Card Peek */}
                  {currentIndex > 0 && (
                    <div 
                      key={`peek-prev-${gridData[currentIndex - 1].id}`}
                      className="absolute left-0 -translate-x-[65%] w-[240px] aspect-[5/7] rounded-2xl overflow-hidden opacity-10 scale-90 z-0"
                    >
                      <img 
                        src={gridData[currentIndex - 1].imageUrl} 
                        className="w-full h-full object-fill"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}

                  {/* Current Card with Swipe Logic */}
                  <AnimatePresence initial={false} custom={swipeDirection} mode="popLayout">
                    <motion.div
                      key={selectedCard.id}
                      custom={swipeDirection}
                      variants={{
                        enter: (direction: number) => ({
                          x: direction > 0 ? 500 : direction < 0 ? -500 : 0,
                          opacity: 0,
                          scale: 0.9
                        }),
                        center: {
                          x: 0,
                          opacity: 1,
                          scale: 1,
                          zIndex: 10
                        },
                        exit: (direction: number) => ({
                          x: direction < 0 ? 500 : direction > 0 ? -500 : 0,
                          opacity: 0,
                          scale: 0.9,
                          zIndex: 0
                        })
                      }}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 }
                      }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      onDragEnd={(e, { offset }) => {
                        if (offset.x < -50) handleSwipe(1);
                        else if (offset.x > 50) handleSwipe(-1);
                      }}
                      className="relative w-full h-full flex items-center justify-center z-10 cursor-grab active:cursor-grabbing"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const threshold = rect.width * 0.25;
                        if (x < threshold) handleSwipe(-1);
                        else if (x > rect.width - threshold) handleSwipe(1);
                      }}
                    >
                      <div 
                        className="relative w-[260px] aspect-[5/7] bg-stone-100 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 cursor-pointer group"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAnatomy(!showAnatomy);
                        }}
                      >
                        <img 
                          src={
                            selectedCard.variants 
                              ? selectedCard.variants.find((v: any) => v.type === selectedArtType)?.imageUrl || selectedCard.imageUrl
                              : (selectedArtType === "Parallel" && selectedCard.altImageUrl ? selectedCard.altImageUrl : selectedCard.imageUrl)
                          } 
                          alt={selectedCard.name}
                          className="w-full h-full object-fill bg-stone-100"
                          referrerPolicy="no-referrer"
                        />
                        
                        <AnimatePresence>
                          {showAnatomy && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 flex items-center justify-center"
                            >
                              <img 
                                src="/images/Card anatomy overlay.png" 
                                alt="Card Anatomy Overlay"
                                className="w-full h-full object-fill"
                                referrerPolicy="no-referrer"
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Next Card Peek */}
                  {currentIndex < gridData.length - 1 && currentIndex !== -1 && (
                    <div 
                      key={`peek-next-${gridData[currentIndex + 1].id}`}
                      className="absolute right-0 translate-x-[65%] w-[240px] aspect-[5/7] rounded-2xl overflow-hidden opacity-10 scale-90 z-0"
                    >
                      <img 
                        src={gridData[currentIndex + 1].imageUrl} 
                        className="w-full h-full object-fill"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 pb-20 space-y-6 flex-1">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold leading-tight text-[#141414]">{selectedCard.name}</h2>
                  {selectedCard.japaneseName && (
                    <p className="text-lg font-medium text-stone-400 -mt-1">{selectedCard.japaneseName}</p>
                  )}
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-2 mt-1">
                    <p className="text-stone-500 font-mono text-[10px] uppercase tracking-wider">{selectedCard.cardNumber} • {selectedCard.set}</p>
                    
                    <div className="flex items-center gap-1.5">
                      <RarityTag rarity={selectedCard.rarity} />
                      <ColorTag color={selectedCard.color} />
                      {(selectedCard.variants && selectedCard.variants.length > 0) || selectedCard.altImageUrl ? (
                        <div className="relative ml-1.5">
                          <select
                            value={selectedArtType}
                            onChange={(e) => {
                              setSelectedArtType(e.target.value as ArtVariantType);
                              setShowAnatomy(false);
                            }}
                            className="appearance-none bg-stone-100 border border-stone-200 rounded-full px-4 py-1.5 pr-8 text-[10px] font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                          >
                            {selectedCard.variants ? (
                              selectedCard.variants.map(v => (
                                <option key={v.type} value={v.type}>{v.type}</option>
                              ))
                            ) : (
                              <>
                                <option value="Base art">Base art</option>
                                <option value="Parallel">Parallel</option>
                              </>
                            )}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ChevronLeft size={12} className="-rotate-90 text-stone-400" />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <CardPrice 
                    cardNumber={selectedCard.cardNumber} 
                    cardName={selectedCard.name} 
                    artType={selectedArtType} 
                    mode={priceMode}
                    onModeChange={setPriceMode}
                  />
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-2xl border border-stone-200 text-center">
                    <p className="text-[10px] text-stone-400 uppercase font-bold mb-1">Cost</p>
                    <p className="text-lg font-bold">{selectedCard.cost}</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-stone-200 text-center">
                    <p className="text-[10px] text-stone-400 uppercase font-bold mb-1">Lv.</p>
                    <p className="text-lg font-bold">{selectedCard.level || '-'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-stone-200 text-center">
                    <p className="text-[10px] text-stone-400 uppercase font-bold mb-1">AP</p>
                    <p className="text-lg font-bold text-red-600">{selectedCard.ap || '-'}</p>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-stone-200 text-center">
                    <p className="text-[10px] text-stone-400 uppercase font-bold mb-1">HP</p>
                    <p className="text-lg font-bold text-blue-600">{selectedCard.hp || '-'}</p>
                  </div>
                </div>

                {selectedCard.traits && selectedCard.traits.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedCard.traits.map(trait => (
                      <span key={trait} className="px-3 py-1 bg-stone-100 rounded-full text-[10px] font-bold text-stone-500 border border-stone-200">
                        {trait}
                      </span>
                    ))}
                  </div>
                )}

                {selectedCard.link && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                      <RefreshCw size={14} /> Link
                    </h4>
                    <div className="bg-white p-4 rounded-2xl border border-stone-200 text-sm font-bold text-blue-600">
                      {renderAbilityText(selectedCard.link)}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                    <Info size={14} /> Ability
                  </h4>
                  <div className="bg-white p-4 rounded-2xl border border-stone-200 text-sm leading-relaxed whitespace-pre-wrap italic">
                    {renderAbilityText(selectedCard.ability)}
                  </div>
                </div>

                {selectedCard.flavorText && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest">Flavor</h4>
                    <p className="text-stone-500 text-sm italic">"{selectedCard.flavorText}"</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Deck Selector Modal */}
      <AnimatePresence>
        {showDeckSelector && selectedCard && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowDeckSelector(false)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', ease: 'circOut', duration: 0.4 }}
              className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-24 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">Add to Deck</h3>
                <button onClick={() => setShowDeckSelector(false)} className="p-2 hover:bg-stone-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-stone-500">Select which deck to add <span className="font-bold text-[#141414]">{selectedCard.name}</span> to:</p>
              <div className="grid gap-2 max-h-[40vh] overflow-y-auto pr-2">
                {decks.length === 0 ? (
                  <div className="py-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                    <p className="text-xs text-stone-400 font-medium">No decks created yet</p>
                  </div>
                ) : (
                  decks.map(deck => {
                    const totalCountOfCard = deck.items
                      .filter(item => item.card.id === selectedCard.id)
                      .reduce((sum, item) => sum + item.count, 0);
                    
                    const currentVariantItem = deck.items.find(
                      item => item.card.id === selectedCard.id && item.artType === selectedArtType
                    );
                    const variantCount = currentVariantItem ? currentVariantItem.count : 0;

                    return (
                      <div 
                        key={deck.id}
                        className="grid grid-cols-[1fr_auto] items-center gap-4 p-4 bg-stone-50 border border-stone-200 rounded-2xl transition-colors overflow-hidden"
                      >
                        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm truncate">{deck.name}</p>
                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider truncate">
                              {deck.items.reduce((s, i) => s + i.count, 0)} / 50 Cards
                            </p>
                          </div>
                          <button 
                            onClick={() => {
                              setActiveDeckId(deck.id);
                              setIsDeckEditorOpen(true);
                              setShowDeckSelector(false);
                              setSelectedCard(null);
                            }}
                            className="p-1.5 text-stone-300 hover:text-[#141414] hover:bg-stone-100 rounded-lg transition-all shrink-0"
                          >
                            <ExternalLink size={14} />
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0">
                          <button 
                            onClick={() => {
                              if (variantCount === 1) {
                                removeFromDeck(deck.id, selectedCard.id, selectedArtType);
                              } else if (variantCount > 1) {
                                updateDeckCount(deck.id, selectedCard.id, selectedArtType, -1);
                              }
                            }}
                            disabled={variantCount === 0}
                            className={cn(
                              "w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90",
                              variantCount > 0 
                                ? "bg-white border border-stone-200 text-[#141414] shadow-sm hover:bg-stone-100" 
                                : "text-stone-300 cursor-not-allowed opacity-50"
                            )}
                          >
                            <Minus size={14} />
                          </button>
                          
                          <div className="flex flex-col items-center min-w-[24px]">
                            <span className={cn(
                              "text-sm font-black transition-colors",
                              totalCountOfCard >= 4 ? "text-red-500" : "text-[#141414]"
                            )}>
                              {totalCountOfCard}
                            </span>
                          </div>
                          
                          <button 
                            onClick={() => {
                              addToDeck(deck.id, selectedCard, selectedArtType);
                            }}
                            disabled={totalCountOfCard >= 4}
                            className={cn(
                              "w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90 shadow-sm",
                              totalCountOfCard < 4 
                                ? "bg-[#141414] text-white hover:bg-stone-800" 
                                : "bg-stone-200 text-stone-400 cursor-not-allowed"
                            )}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <button 
                onClick={() => {
                  setShowDeckSelector(false);
                  setSelectedCard(null);
                  setDeckListAutoCreate(true);
                  setShowDeckList(true);
                }}
                className="w-full py-3 text-sm font-bold text-stone-400 hover:text-[#141414] transition-colors"
              >
                + Create New Deck
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deck List Overlay */}
      <AnimatePresence>
        {showDeckList && (
          <DeckList 
            decks={decks}
            onSelectDeck={(id) => {
              setActiveDeckId(id);
              setIsDeckEditorOpen(true);
              setOpenedEditorFromList(true);
              // We don't close the list immediately to avoid flashing the landing page
              // The editor has a higher z-index and will cover it
            }}
            onCreateDeck={createDeck}
            onDeleteDeck={deleteDeck}
            onRenameDeck={renameDeck}
            onClose={() => {
              setShowDeckList(false);
              setDeckListAutoCreate(false);
              setCurrentTab('cards');
            }}
            autoStartCreate={deckListAutoCreate}
          />
        )}
      </AnimatePresence>

      {/* Deck Editor Overlay */}
      <AnimatePresence>
        {isDeckEditorOpen && activeDeckId && activeDeck && (
          <DeckEditor 
            ref={deckEditorRef}
            deck={activeDeck}
            matches={matches}
            visible={currentTab === 'decks'}
            onUpdateCount={updateDeckCount}
            onRemove={removeFromDeck}
            onPreviewCard={(card) => setSelectedCard(card)}
            onClose={() => {
              setIsDeckEditorOpen(false);
              if (isDeckBuilderMode) {
                setCurrentTab('cards');
              } else if (openedEditorFromList) {
                setShowDeckList(true);
                setOpenedEditorFromList(false);
              } else {
                setShowDeckList(false);
              }
            }}
            getCachedPrice={getCachedPrice}
            priceMode={priceMode}
            onPriceModeChange={setPriceMode}
            onPlayModeChange={setIsDeckInPlayMode}
            onResetHistory={resetDeckHistory}
            onEnterBuilderMode={(types) => {
              setIsDeckBuilderMode(true);
              setIsDeckEditorOpen(true); // Keep open but hidden
              setShowDeckList(false);
              setIsFilterOpen(false);
              setCurrentTab('cards');
              if (types) {
                setActiveFilters(prev => ({
                  ...prev,
                  types: types
                }));
              }
            }}
          />
        )}
      </AnimatePresence>
      {/* Filter Drawer */}
      <AnimatePresence>
        {isFilterOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFilterOpen(false)}
              className="fixed inset-0 bg-black/20 z-[38] backdrop-blur-[1px]"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', ease: 'circOut', duration: 0.3 }}
              className="fixed inset-y-0 right-0 w-[80%] bg-white z-[39] shadow-2xl flex flex-col border-l border-stone-200"
            >
              {/* Header */}
              <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <h2 className="font-bold text-lg">Filters</h2>
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar">
                {/* Sets */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest">Sets</h3>
                  <div className="flex flex-wrap gap-2">
                    {ALL_SETS.map(setName => (
                      <button
                        key={setName}
                        onClick={() => toggleFilter('sets', setName)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                          activeFilters.sets.includes(setName)
                            ? "bg-[#141414] text-white border-[#141414]"
                            : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                        )}
                      >
                        {setName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rarity */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest">Rarity</h3>
                  <div className="flex flex-wrap gap-2">
                    {RARITIES.map(rarity => (
                      <button
                        key={rarity}
                        onClick={() => toggleFilter('rarities', rarity)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                          activeFilters.rarities.includes(rarity)
                            ? "bg-[#141414] text-white border-[#141414]"
                            : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                        )}
                      >
                        {rarity}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest">Color</h3>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => toggleFilter('colors', color)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                          activeFilters.colors.includes(color)
                            ? "bg-[#141414] text-white border-[#141414]"
                            : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                        )}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest">Type</h3>
                  <div className="flex flex-wrap gap-2">
                    {TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => toggleFilter('types', type)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                          activeFilters.types.includes(type)
                            ? "bg-[#141414] text-white border-[#141414]"
                            : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Art Variant */}
                <div className="space-y-3 pb-4">
                  <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest">Art Variant</h3>
                  <div className="flex flex-wrap gap-2">
                    {VARIANTS.map(variant => (
                      <button
                        key={variant}
                        onClick={() => toggleFilter('variants', variant)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                          activeFilters.variants.includes(variant)
                            ? "bg-[#141414] text-white border-[#141414]"
                            : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                        )}
                      >
                        {variant}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 pb-[72px] border-t border-stone-100 grid grid-cols-2 gap-3 bg-white">
                <button 
                  onClick={resetFilters}
                  className="py-3 rounded-xl text-sm font-bold text-stone-500 hover:bg-stone-50 transition-colors border border-stone-200"
                >
                  Reset
                </button>
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="py-3 rounded-xl text-sm font-bold bg-[#141414] text-white hover:bg-stone-800 transition-colors shadow-lg shadow-stone-200"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
