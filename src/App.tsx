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
  Palette,
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
  User as UserIcon,
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  CheckCircle,
  Circle,
  Trash2,
  Edit2,
  ShieldCheck,
  HelpCircle,
  Zap,
  Bookmark
} from 'lucide-react';
import { GundamCard, ArtVariantType, ALL_SETS, Deck, DeckItem, Feedback, FeedbackCategory } from './types';
import { AdminCardManager } from './components/AdminCardManager';
import { CardFeedbackPopup } from './components/CardFeedbackPopup';
import { identifyCard, IdentifiedCard, getCardPrice, getCachedPrice } from './services/geminiService';
import { cn, PriceDisplayMode, formatPrice } from './lib/utils';
import { DeckEditor, DeckEditorHandle } from './components/DeckEditor';
import { QuickSetup } from './components/QuickSetup';
import { DeckList } from './components/DeckList';
import { ProxyPrinter } from './components/ProxyPrinter';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc,
  updateDoc,
  deleteDoc, 
  query, 
  where,
  orderBy, 
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';

const COMMON_VARIANTS: ArtVariantType[] = ["Parallel", "Beta", "Beta Parallel", "Premium", "Championship", "Double Plus (++)", "Championship Participation"];
const RARITIES = ["C", "U", "R", "LR"];
const COLORS = ["Red", "Blue", "Green", "White", "Purple"];
const TYPES = ["Base", "Unit", "Pilot", "Command"];

// --- Components ---

const SmartImage = React.memo(({ src, alt, className, priority = false }: { src: string, alt: string, className?: string, priority?: boolean }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
    img.onerror = () => setError(true);
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden bg-stone-100", className)}>
      <AnimatePresence mode="wait">
        {!isLoaded && !error && (
          <motion.div
            key="placeholder"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Loader2 size={16} className="text-stone-300 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
      
      {src && !error && (
        <motion.img
          src={src}
          alt={alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={cn("w-full h-full object-cover", isLoaded ? "visible" : "invisible")}
          referrerPolicy="no-referrer"
          onLoad={() => setIsLoaded(true)}
        />
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
          <p className="text-[8px] text-stone-400 font-medium leading-tight">
            Image unavailable
          </p>
        </div>
      )}
    </div>
  );
});

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
    <div ref={containerRef} className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 h-[16px] overflow-hidden">
      {loading ? (
        <div className="flex items-center gap-1 text-stone-400 animate-pulse h-full">
          <Loader2 size={10} className="animate-spin" />
          <span>Loading...</span>
        </div>
      ) : price ? (
        <span className="h-full flex items-center">{displayPrice || 'N/A'}</span>
      ) : (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            fetchPrice();
          }}
          className="text-[10px] font-bold text-stone-400 hover:text-amber-600 transition-colors flex items-center gap-1 h-full"
        >
          <RefreshCw size={10} />
          Retry
        </button>
      )}
    </div>
  );
});

const CardBadge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider", className)}>
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
    LR: "bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400 text-stone-900 border border-amber-600/20 shadow-sm",
  };
  return <CardBadge className={rarities[rarity]}>{rarity}</CardBadge>;
};

const CardPrice = React.memo(({ cardNumber, cardName, artType = "Base art", mode, onModeChange }: { cardNumber: string, cardName: string, artType?: ArtVariantType, mode: PriceDisplayMode, onModeChange: (mode: PriceDisplayMode) => void }) => {
  // Automatic price fetching disabled due to Vercel blocking Yuyutei
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <a 
            href={`https://yuyu-tei.jp/sell/gcg/s/search?search_word=${cardNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full transition-all border border-amber-200 shadow-sm"
          >
            <ExternalLink size={12} />
            View Price on Yuyu-tei
          </a>
        </div>
      </div>
    </div>
  );
});

const ListContainer = React.forwardRef(({ style, children, isDeckBuilderMode, ...props }: any, ref: any) => (
  <div
    ref={ref}
    {...props}
    style={{ ...style }}
    className={cn(
      "grid gap-2 grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 pb-32",
      isDeckBuilderMode ? "landscape:grid-cols-3" : "landscape:grid-cols-6"
    )}
  >
    {children}
  </div>
));

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
  priceMode,
  isBookmarked
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
  priceMode: PriceDisplayMode,
  isBookmarked: boolean
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
        "bg-white rounded-2xl overflow-hidden shadow-sm border cursor-pointer",
        card.isVariant ? "border-amber-200 bg-amber-50/10" : "border-stone-200"
      )}
    >
      <div className="relative bg-stone-100 aspect-[2/3] flex items-center justify-center">
        {(card.championshipParticipation || card.variantType === "Championship Participation" || card.variants?.some(v => v.type === "Championship Participation")) && (
          <div className="absolute top-8 left-2 bg-blue-500 text-white p-1 rounded-full shadow-lg z-10 border border-white/20">
            <Trophy size={10} strokeWidth={2} />
          </div>
        )}
        <SmartImage 
          src={card.imageUrl} 
          alt={card.name}
          className="w-full h-full"
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
      
      <div className="p-2 h-[76px] flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between mb-0.5">
            <h3 className="font-bold text-[10px] leading-tight line-clamp-1 h-[14px] text-[#141414]">{card.name}</h3>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <ColorTag color={card.color} />
            <span className="text-[8px] font-mono text-stone-400">{card.cardNumber}</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <RarityTag rarity={card.rarity} />
              {isBookmarked && (
                <Bookmark size={10} className="text-amber-500 fill-amber-500" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// --- Feedback Form ---

const FeedbackForm = ({ user, onComplete }: { user: User, onComplete: () => void }) => {
  const [category, setCategory] = useState<FeedbackCategory>('General');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        uid: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        category,
        message: message.trim(),
        createdAt: Date.now(),
        status: 'New'
      });
      setIsSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h3 className="text-lg font-black text-[#141414]">Thank You!</h3>
        <p className="text-stone-500 text-sm">Your feedback has been received.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Category</label>
        <div className="grid grid-cols-2 gap-2">
          {(['Bug', 'Feature Request', 'General', 'Other'] as FeedbackCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "px-3 py-2 rounded-xl text-xs font-bold border transition-all",
                category === cat 
                  ? "bg-[#141414] text-white border-[#141414]" 
                  : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Your Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what's on your mind..."
          className="w-full h-32 bg-white border border-stone-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !message.trim()}
        className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:hover:bg-amber-500 text-white rounded-2xl font-black flex items-center justify-center gap-3 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
      >
        {isSubmitting ? (
          <Loader2 className="animate-spin" size={20} />
        ) : (
          <Send size={20} />
        )}
        Submit Feedback
      </button>
    </form>
  );
};

// --- Admin Feedback Panel ---

const AdminFeedbackPanel = ({ tickets, onUpdateStatus, onDelete }: { 
  tickets: Feedback[], 
  onUpdateStatus: (id: string, status: Feedback['status']) => void,
  onDelete: (id: string) => void
}) => {
  const [filter, setFilter] = useState<Feedback['status'] | 'All'>('All');

  const filteredTickets = tickets.filter(t => filter === 'All' || t.status === filter);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {(['All', 'New', 'In Progress', 'Resolved', 'Closed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all border",
              filter === s 
                ? "bg-[#141414] text-white border-[#141414]" 
                : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
            )}
          >
            {s} ({s === 'All' ? tickets.length : tickets.filter(t => t.status === s).length})
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <div className="py-12 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
            <p className="text-stone-400 text-sm font-medium">No tickets found</p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <div key={ticket.id} className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                      ticket.category === 'Bug' ? "bg-red-100 text-red-600" :
                      ticket.category === 'Feature Request' ? "bg-blue-100 text-blue-600" :
                      "bg-stone-100 text-stone-600"
                    )}>
                      {ticket.category}
                    </span>
                    <span className="text-[10px] text-stone-400 font-bold">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#141414]">{ticket.userName || 'Anonymous'}</p>
                  <p className="text-[10px] text-stone-500">{ticket.userEmail}</p>
                  {ticket.cardName && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                        Card: {ticket.cardName}
                      </span>
                      {ticket.cardId && (
                        <span className="text-[8px] font-mono text-stone-400">
                          ({ticket.cardId})
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => onDelete(ticket.id)}
                    className="p-2 text-stone-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p className="text-sm text-stone-700 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">
                {ticket.message}
              </p>

              <div className="flex items-center gap-2 pt-2 border-t border-stone-50">
                <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mr-auto">Status:</p>
                {(['New', 'In Progress', 'Resolved', 'Closed'] as Feedback['status'][]).map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdateStatus(ticket.id, s)}
                    className={cn(
                      "px-2 py-1 rounded-lg text-[9px] font-bold transition-all border",
                      ticket.status === s 
                        ? "bg-emerald-500 text-white border-emerald-500" 
                        : "bg-white text-stone-400 border-stone-100 hover:border-stone-200"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Error Boundary ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200 p-8 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-[#141414]">Something went wrong</h2>
              <p className="text-stone-500 text-sm leading-relaxed">
                The application encountered an unexpected error. We've logged the details.
              </p>
            </div>
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-100 text-left overflow-auto max-h-32">
              <code className="text-[10px] text-red-500 font-mono">{this.state.error?.message}</code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-[#141414] text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-stone-800 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- Main App ---

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [allCards, setAllCards] = useState<GundamCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  // Use Firestore cards directly
  const combinedCards = useMemo(() => {
    return [...allCards].sort((a, b) => a.cardNumber.localeCompare(b.cardNumber));
  }, [allCards]);

  // Firestore Cards Listener
  useEffect(() => {
    const q = query(collection(db, 'cards'), orderBy('cardNumber', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const cardsData: GundamCard[] = [];
        snapshot.forEach((doc) => {
          cardsData.push(doc.data() as GundamCard);
        });
        setAllCards(cardsData);
      }
      setCardsLoading(false);
    }, (error) => {
      console.error("Error fetching cards from Firestore:", error);
      setCardsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [selectedCard, setSelectedCard] = useState<GundamCard | null>(null);
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<{ title: string, description: string, x: number, y: number, originalX: number } | null>(null);
  const cardFaq = useMemo(() => {
    if (!selectedCard) return [];
    
    // If card already has FAQ, use it
    if (selectedCard.faq && selectedCard.faq.length > 0) return selectedCard.faq;
    
    // Hardcoded fallback for ST 09-001 Impulse Gundam
    const isImpulse = selectedCard.cardNumber?.replace(/[^a-z0-9]/gi, '') === 'ST09001' || 
                     selectedCard.name?.toLowerCase().includes('impulse');
                     
    if (isImpulse) {
      return [
        {
          question: "When deploying a Unit with this effect, do I have to pay that Unit's cost?",
          answer: "No, you do not."
        },
        {
          question: "If the Unit deployed by this effect has a 【Deploy】 effect, does it activate?",
          answer: "Yes, it does."
        }
      ];
    }
    
    return [];
  }, [selectedCard]);

  const linkedCards = useMemo(() => {
    if (!selectedCard) return [];
    
    const results: GundamCard[] = [];
    
    // Helper to extract traits from a link string like "(Coordinator) Trait / (Minerva Squad) Trait"
    const getLinkTraits = (linkStr: string) => {
      const matches = linkStr.match(/\(([^)]+)\)/g);
      if (!matches) return [];
      return matches.map(m => m.slice(1, -1));
    };

    // Helper to extract names from a link string, splitting by "/" and ignoring trait patterns
    const getLinkNames = (linkStr: string) => {
      return linkStr.split('/')
        .map(s => s.trim().replace(/[\[\]]/g, '')) // Remove brackets [ ]
        .filter(s => s && !s.startsWith('('));
    };

    // Helper to check if a card matches any of the link names (supporting partial matches for variants and minor typos)
    const isCardMatch = (card: GundamCard, linkNames: string[]) => {
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const namesToCheck = [card.name];
      if (card.type.includes('Pilot')) {
        const pilotNameMatch = card.ability.match(/Pilot:\s*([^.\n]+)/i);
        if (pilotNameMatch) {
          namesToCheck.push(pilotNameMatch[1].trim());
        }
      }

      return namesToCheck.some(cardName => {
        const normalizedCardName = normalize(cardName);
        return linkNames.some(name => {
          const normalizedLinkName = normalize(name);
          
          // 1. Exact or normalized match (handles "Tieria Erde" vs "Tieria Erde")
          if (normalizedCardName === normalizedLinkName) return true;
          
          // 2. Variant match (e.g., "Elan Ceres (Variant)" matches "Elan Ceres")
          if (cardName.toLowerCase().startsWith(name.toLowerCase() + ' (') || 
              cardName.toLowerCase().startsWith(name.toLowerCase() + ' ')) return true;
  
          // 3. Handle common typos like "Tiera" vs "Tieria" by checking if they share significant prefix/suffix
          if (normalizedLinkName.length >= 5 && normalizedCardName.length >= 5) {
            const prefix = normalizedLinkName.substring(0, 4);
            const suffix = normalizedLinkName.substring(normalizedLinkName.length - 4);
            if (normalizedCardName.startsWith(prefix) && normalizedCardName.endsWith(suffix)) return true;
          }
  
          return false;
        });
      });
    };

    if (selectedCard.type.includes('Unit')) {
      // 1. Direct links from this Unit to Pilot(s)
      if (selectedCard.link) {
        const linkNames = getLinkNames(selectedCard.link);
        const pilotsByName = combinedCards.filter(c => c.type.includes('Pilot') && isCardMatch(c, linkNames));
        results.push(...pilotsByName);

        const linkTraits = getLinkTraits(selectedCard.link);
        if (linkTraits.length > 0) {
          const pilotsByTrait = combinedCards.filter(c => 
            c.type.includes('Pilot') && 
            c.traits?.some(t => linkTraits.includes(t))
          );
          results.push(...pilotsByTrait);
        }
      }
      
      // 2. Reverse links: Pilots that link to this Unit (by name or trait)
      const linkingPilots = combinedCards.filter(c => {
        if (!c.type.includes('Pilot') || !c.link) return false;
        const names = getLinkNames(c.link);
        if (isCardMatch(selectedCard, names)) return true;
        const traits = getLinkTraits(c.link);
        if (traits.some(t => selectedCard.traits?.includes(t))) return true;
        return false;
      });
      results.push(...linkingPilots);
    } 
    
    if (selectedCard.type.includes('Pilot')) {
      // 1. Direct links from this Pilot to Unit(s)
      if (selectedCard.link) {
        const linkNames = getLinkNames(selectedCard.link);
        const unitsByName = combinedCards.filter(c => c.type.includes('Unit') && isCardMatch(c, linkNames));
        results.push(...unitsByName);

        const linkTraits = getLinkTraits(selectedCard.link);
        if (linkTraits.length > 0) {
          const unitsByTrait = combinedCards.filter(c => 
            c.type.includes('Unit') && 
            c.traits?.some(t => linkTraits.includes(t))
          );
          results.push(...unitsByTrait);
        }
      }

      // 2. Reverse links: Units that link to this Pilot (by name or trait)
      const linkingUnits = combinedCards.filter(c => {
        if (!c.type.includes('Unit') || !c.link) return false;
        const names = getLinkNames(c.link);
        if (isCardMatch(selectedCard, names)) return true;
        const traits = getLinkTraits(c.link);
        if (traits.some(t => selectedCard.traits?.includes(t))) return true;
        return false;
      });
      results.push(...linkingUnits);
    }
    
    // Remove duplicates by ID
    return results.filter((card, index, self) => 
      index === self.findIndex((t) => t.id === card.id)
    );
  }, [selectedCard, combinedCards]);
  const [selectedArtType, setSelectedArtType] = useState<ArtVariantType>("Base art");
  const [isCardMaximized, setIsCardMaximized] = useState(false);
  const [showAnatomy, setShowAnatomy] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState<Feedback[]>([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showCardManager, setShowCardManager] = useState(false);
  const [initialCardIdForManager, setInitialCardIdForManager] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleUpdateFeedbackStatus = async (id: string, status: Feedback['status']) => {
    const ticket = adminFeedback.find(t => t.id === id);
    if (!ticket) return;
    const coll = ticket._collection || 'feedback';
    try {
      await updateDoc(doc(db, coll, id), { status });
    } catch (error) {
      console.error("Error updating feedback status:", error);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm("Delete this feedback?")) return;
    const ticket = adminFeedback.find(t => t.id === id);
    if (!ticket) return;
    const coll = ticket._collection || 'feedback';
    try {
      await deleteDoc(doc(db, coll, id));
    } catch (error) {
      console.error("Error deleting feedback:", error);
    }
  };

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
  const [isAutoScan, setIsAutoScan] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDeckBuilderMode, setIsDeckBuilderMode] = useState(false);
  const [deckBuilderView, setDeckBuilderView] = useState<'list' | 'editor'>('list');
  const [isDeckInPlayMode, setIsDeckInPlayMode] = useState(false);
  const [isQuickSetupOpen, setIsQuickSetupOpen] = useState(false);
  const [isQuickStartDeckPickerOpen, setIsQuickStartDeckPickerOpen] = useState(false);
  const [quickStartMode, setQuickStartMode] = useState<'play' | 'stats' | null>(null);
  const [currentTab, setCurrentTab] = useState<'cards' | 'decks' | 'scan' | 'quick-start' | 'profile'>('cards');
  const [user, setUser] = useState<User | null>(null);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const adminEmails = ["inkytophat@gmail.com", "cynicaltophat@gmail.com"];
    return adminEmails.includes(user.email?.toLowerCase() || "");
  }, [user]);

  // Admin Feedback Fetching
  useEffect(() => {
    if (!isAdmin || !user) {
      setAdminFeedback([]);
      return;
    }

    const q1 = query(collection(db, 'feedback'), orderBy('createdAt', 'desc'));
    const q2 = query(collection(db, 'card_feedback'), orderBy('createdAt', 'desc'));

    let tickets1: Feedback[] = [];
    let tickets2: Feedback[] = [];

    const updateAdminFeedback = () => {
      const merged = [...tickets1, ...tickets2].sort((a, b) => b.createdAt - a.createdAt);
      setAdminFeedback(merged);
    };

    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      tickets1 = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        _collection: 'feedback' 
      } as Feedback));
      updateAdminFeedback();
    }, (error) => {
      console.error("Admin feedback fetch error (general):", error);
    });

    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      tickets2 = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        _collection: 'card_feedback' 
      } as Feedback));
      updateAdminFeedback();
    }, (error) => {
      console.error("Admin feedback fetch error (card):", error);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [isAdmin, user]);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Handle Deck Import from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const importData = params.get('import');
    if (importData) {
      try {
        const decoded = atob(importData);
        const deckData = JSON.parse(decoded);
        
        // Clean up URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);

        // Create the deck
        const importNewDeck = async () => {
          const deckId = Math.random().toString(36).substr(2, 9);
          const newDeck: Deck = {
            ...deckData,
            id: deckId,
            lastModified: Date.now(),
            name: `${deckData.name} (Imported)`
          };

          if (!user) {
            const updatedDecks = [newDeck, ...decks];
            setDecks(updatedDecks);
            localStorage.setItem('guest_decks', JSON.stringify(updatedDecks));
            setActiveDeckId(deckId);
            setIsDeckEditorOpen(true);
            setCurrentTab('decks');
            return;
          }

          const deckWithUid = { ...newDeck, uid: user.uid };
          await setDoc(doc(db, 'decks', deckId), deckWithUid);
          setActiveDeckId(deckId);
          setIsDeckEditorOpen(true);
          setCurrentTab('decks');
          showToast("Deck imported successfully!");
        };
        
        importNewDeck();
      } catch (e) {
        console.error("Failed to import deck from URL:", e);
      }
    }
  }, [user, isAuthReady]);

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


  const [bookmarks, setBookmarks] = useState<string[]>([]);

  // Bookmarks Listener
  useEffect(() => {
    if (!user) {
      const savedBookmarks = localStorage.getItem('guest_bookmarks');
      if (savedBookmarks) {
        try {
          setBookmarks(JSON.parse(savedBookmarks));
        } catch (e) {
          console.error("Error parsing guest bookmarks:", e);
          setBookmarks([]);
        }
      } else {
        setBookmarks([]);
      }
      return;
    }

    const q = query(
      collection(db, 'bookmarks'),
      where('uid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookmarkIds = snapshot.docs.map(doc => doc.data().cardId as string);
      setBookmarks(bookmarkIds);
    }, (error) => {
      console.error("Bookmarks listener error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const toggleBookmark = async (cardId: string) => {
    const isBookmarked = bookmarks.includes(cardId);
    
    if (!user) {
      const nextBookmarks = isBookmarked 
        ? bookmarks.filter(id => id !== cardId)
        : [...bookmarks, cardId];
      setBookmarks(nextBookmarks);
      localStorage.setItem('guest_bookmarks', JSON.stringify(nextBookmarks));
      showToast(isBookmarked ? "Removed bookmark" : "Bookmarked successfully");
      return;
    }

    try {
      if (isBookmarked) {
        // Find the document to delete
        const q = query(
          collection(db, 'bookmarks'),
          where('uid', '==', user.uid),
          where('cardId', '==', cardId)
        );
        const snapshot = await getDocFromServer(doc(db, 'bookmarks', `${user.uid}_${cardId}`));
        // Actually, I'll use a deterministic ID for bookmarks: userId_cardId
        await deleteDoc(doc(db, 'bookmarks', `${user.uid}_${cardId}`));
        showToast("Removed bookmark");
      } else {
        await setDoc(doc(db, 'bookmarks', `${user.uid}_${cardId}`), {
          uid: user.uid,
          cardId,
          createdAt: Date.now()
        });
        showToast("Bookmarked successfully");
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      // Fallback for deterministic ID if it fails (e.g. if I didn't use deterministic ID before)
      // But I'll stick to deterministic ID for simplicity
    }
  };

  const deckEditorRef = useRef<DeckEditorHandle>(null);
  
  // Filter State
  const [activeFilters, setActiveFilters] = useState({
    sets: [] as string[],
    rarities: [] as string[],
    colors: [] as string[],
    types: [] as string[],
    variants: [] as string[],
    users: [] as string[]
  });
  
  // Deck Management
  const [decks, setDecks] = useState<Deck[]>([]);

  // Decks Listener
  useEffect(() => {
    if (!user) {
      const savedDecks = localStorage.getItem('guest_decks');
      if (savedDecks) {
        try {
          setDecks(JSON.parse(savedDecks));
        } catch (e) {
          console.error("Error parsing guest decks:", e);
          setDecks([]);
        }
      } else {
        setDecks([]);
      }
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
  const [showDeckModeNotification, setShowDeckModeNotification] = useState(false);
  const [openedEditorFromList, setOpenedEditorFromList] = useState(false);
  const [deckListAutoCreate, setDeckListAutoCreate] = useState(false);
  const [showDeckSelector, setShowDeckSelector] = useState(false);
  const [printingDeck, setPrintingDeck] = useState<Deck | null>(null);
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

  useEffect(() => {
    if (isDeckBuilderMode) {
      setShowDeckModeNotification(true);
      const timer = setTimeout(() => setShowDeckModeNotification(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [isDeckBuilderMode]);

  // --- Navigation History Management ---
  const isPoppingState = useRef(false);
  
  // Initial history state setup
  useEffect(() => {
    const initialState = {
      currentTab: 'cards',
      selectedCardId: null,
      isDeckEditorOpen: false,
      showAdminPanel: false,
      showCardManager: false,
      showFeedback: false,
      isFilterOpen: false,
      isScanning: false,
      isDeckInPlayMode: false,
      isDeckBuilderMode: false,
      showDeckList: false,
      activeDeckId: null
    };
    window.history.replaceState(initialState, '');
  }, []);

  // Handle Popstate (Back Button)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        isPoppingState.current = true;
        const state = event.state;
        
        if (state.currentTab !== undefined) setCurrentTab(state.currentTab);
        
        // Find card by ID if it was selected
        if (state.selectedCardId) {
          const card = combinedCards.find(c => c.id === state.selectedCardId);
          if (card) setSelectedCard(card);
        } else {
          setSelectedCard(null);
        }

        setIsDeckEditorOpen(!!state.isDeckEditorOpen);
        setShowAdminPanel(!!state.showAdminPanel);
        setShowCardManager(!!state.showCardManager);
        setShowFeedback(!!state.showFeedback);
        setIsFilterOpen(!!state.isFilterOpen);
        setIsScanning(!!state.isScanning);
        setIsDeckInPlayMode(!!state.isDeckInPlayMode);
        setIsDeckBuilderMode(!!state.isDeckBuilderMode);
        setShowDeckList(!!state.showDeckList);
        setActiveDeckId(state.activeDeckId || null);
        
        // Reset the flag after state updates have been scheduled
        setTimeout(() => {
          isPoppingState.current = false;
        }, 100);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [combinedCards]);

  // Push state on navigation changes
  useEffect(() => {
    if (isPoppingState.current || cardsLoading) return;

    const currentState = {
      currentTab,
      selectedCardId: selectedCard?.id || null,
      isDeckEditorOpen,
      showAdminPanel,
      showCardManager,
      showFeedback,
      isFilterOpen,
      isScanning,
      isDeckInPlayMode,
      isDeckBuilderMode,
      showDeckList,
      activeDeckId
    };

    // Compare with current history state to avoid redundant pushes
    const historyState = window.history.state;
    const hasChanged = !historyState || 
      historyState.currentTab !== currentState.currentTab ||
      historyState.selectedCardId !== currentState.selectedCardId ||
      historyState.isDeckEditorOpen !== currentState.isDeckEditorOpen ||
      historyState.showAdminPanel !== currentState.showAdminPanel ||
      historyState.showCardManager !== currentState.showCardManager ||
      historyState.showFeedback !== currentState.showFeedback ||
      historyState.isFilterOpen !== currentState.isFilterOpen ||
      historyState.isScanning !== currentState.isScanning ||
      historyState.isDeckInPlayMode !== currentState.isDeckInPlayMode ||
      historyState.isDeckBuilderMode !== currentState.isDeckBuilderMode ||
      historyState.showDeckList !== currentState.showDeckList ||
      historyState.activeDeckId !== currentState.activeDeckId;

    if (hasChanged) {
      window.history.pushState(currentState, '');
    }
  }, [
    currentTab, 
    selectedCard, 
    isDeckEditorOpen, 
    showAdminPanel, 
    showCardManager, 
    showFeedback, 
    isFilterOpen, 
    isScanning, 
    isDeckInPlayMode, 
    isDeckBuilderMode,
    showDeckList,
    activeDeckId,
    cardsLoading
  ]);

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
    const deckId = Math.random().toString(36).substr(2, 9);
    const newDeck: Deck = {
      id: deckId,
      name,
      items: [],
      lastModified: Date.now()
    };

    if (!user) {
      const updatedDecks = [newDeck, ...decks];
      setDecks(updatedDecks);
      localStorage.setItem('guest_decks', JSON.stringify(updatedDecks));
      return;
    }

    const deckWithUid = { ...newDeck, uid: user.uid };
    try {
      await setDoc(doc(db, 'decks', deckId), deckWithUid);
    } catch (error) {
      console.error("Error creating deck:", error);
    }
  };

  const duplicateDeck = async (deck: Deck) => {
    const deckId = Math.random().toString(36).substr(2, 9);
    const newDeck: Deck = {
      ...deck,
      id: deckId,
      name: `${deck.name} (Copy)`,
      lastModified: Date.now()
    };

    if (!user) {
      const updatedDecks = [newDeck, ...decks];
      setDecks(updatedDecks);
      localStorage.setItem('guest_decks', JSON.stringify(updatedDecks));
      setActiveDeckId(deckId);
      return;
    }

    const deckWithUid = { ...newDeck, uid: user.uid };
    try {
      await setDoc(doc(db, 'decks', deckId), deckWithUid);
      setActiveDeckId(deckId);
    } catch (error) {
      console.error("Error duplicating deck:", error);
    }
  };

  const importDeckFromText = async (text: string) => {
    const lines = text.split('\n');
    const items: DeckItem[] = [];
    
    for (const line of lines) {
      const match = line.match(/(\d+)x\s+([A-Z0-9-]+)/i);
      if (match) {
        const count = parseInt(match[1]);
        const cardNumber = match[2].toUpperCase();
        
        const card = combinedCards.find(c => c.cardNumber.toUpperCase() === cardNumber);
        if (card) {
          items.push({
            card,
            count: Math.min(count, 4),
            artType: "Base art"
          });
        }
      }
    }

    if (items.length === 0) {
      showToast("No valid cards found in text.");
      return;
    }

    const deckId = Math.random().toString(36).substr(2, 9);
    const newDeck: Deck = {
      id: deckId,
      name: "Imported Deck",
      items,
      lastModified: Date.now()
    };

    if (!user) {
      const updatedDecks = [newDeck, ...decks];
      setDecks(updatedDecks);
      localStorage.setItem('guest_decks', JSON.stringify(updatedDecks));
      setActiveDeckId(deckId);
      return;
    }

    const deckWithUid = { ...newDeck, uid: user.uid };
    try {
      await setDoc(doc(db, 'decks', deckId), deckWithUid);
      setActiveDeckId(deckId);
    } catch (error) {
      console.error("Error importing deck:", error);
    }
  };

  const deleteDeck = async (id: string) => {
    if (!user) {
      const updatedDecks = decks.filter(d => d.id !== id);
      setDecks(updatedDecks);
      localStorage.setItem('guest_decks', JSON.stringify(updatedDecks));
      if (activeDeckId === id) {
        setActiveDeckId(null);
        setIsDeckEditorOpen(false);
      }
      return;
    }

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



  const renameDeck = async (id: string, newName: string) => {
    if (!user) {
      const updatedDecks = decks.map(d => d.id === id ? { ...d, name: newName, lastModified: Date.now() } : d);
      setDecks(updatedDecks);
      localStorage.setItem('guest_decks', JSON.stringify(updatedDecks));
      return;
    }

    try {
      await setDoc(doc(db, 'decks', id), { 
        name: newName, 
        lastModified: Date.now() 
      }, { merge: true });
    } catch (error) {
      console.error("Error renaming deck:", error);
    }
  };

  const setDeckCover = async (deckId: string, imageUrl: string) => {
    if (!user) {
      const updatedDecks = decks.map(d => d.id === deckId ? { ...d, coverImageUrl: imageUrl, lastModified: Date.now() } : d);
      setDecks(updatedDecks);
      localStorage.setItem('guest_decks', JSON.stringify(updatedDecks));
      return;
    }

    try {
      await setDoc(doc(db, 'decks', deckId), { 
        coverImageUrl: imageUrl, 
        lastModified: Date.now() 
      }, { merge: true });
    } catch (error) {
      console.error("Error setting deck cover:", error);
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        authInfo: {
          userId: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          isAnonymous: user.isAnonymous,
          tenantId: user.tenantId,
          providerInfo: user.providerData.map(provider => ({
            providerId: provider.providerId,
            displayName: provider.displayName,
            email: provider.email,
            photoUrl: provider.photoURL
          })) || []
        },
        operationType: 'write',
        path: `decks/${deckId}`
      };
      console.error('Firestore Error: ', JSON.stringify(errInfo));
    }
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const addToDeck = React.useCallback(async (deckId: string, card: GundamCard, artType: ArtVariantType = "Base art") => {
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

    if (!user) {
      const updatedDecks = decks.map(d => d.id === deckId ? { ...d, items: newItems, lastModified: Date.now() } : d);
      setDecks(updatedDecks);
      localStorage.setItem('guest_decks', JSON.stringify(updatedDecks));
      return true;
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
  }, [decks, user]);

  const removeFromDeck = React.useCallback(async (deckId: string, cardId: string, artType: ArtVariantType) => {
    const deck = decks.find(d => d.id === deckId);
    if (!deck) return;

    const newItems = deck.items.filter(item => !(item.card.id === cardId && item.artType === artType));
    
    if (!user) {
      const updatedDecks = decks.map(d => d.id === deckId ? { ...d, items: newItems, lastModified: Date.now() } : d);
      setDecks(updatedDecks);
      localStorage.setItem('guest_decks', JSON.stringify(updatedDecks));
      return;
    }

    try {
      await setDoc(doc(db, 'decks', deckId), { 
        items: newItems, 
        lastModified: Date.now() 
      }, { merge: true });
    } catch (error) {
      console.error("Error removing from deck:", error);
    }
  }, [decks, user]);

  const updateDeckCount = React.useCallback(async (deckId: string, cardId: string, artType: ArtVariantType, delta: number) => {
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

    if (!user) {
      const updatedDecks = decks.map(d => d.id === deckId ? { ...d, items: newItems, lastModified: Date.now() } : d);
      setDecks(updatedDecks);
      localStorage.setItem('guest_decks', JSON.stringify(updatedDecks));
      return;
    }

    try {
      await setDoc(doc(db, 'decks', deckId), { 
        items: newItems, 
        lastModified: Date.now() 
      }, { merge: true });
    } catch (error) {
      console.error("Error updating deck count:", error);
    }
  }, [decks, user]);

  const activeDeck = decks.find(d => d.id === activeDeckId);
  const displayDeckSize = activeDeck ? activeDeck.items.reduce((s, i) => s + i.count, 0) : 0;

  // Prefetch prices for cards in all decks - disabled as requested
  /* useEffect(() => {
    decks.forEach(deck => {
      deck.items.forEach(item => {
        if (!getCachedPrice(item.card.cardNumber, item.card.name, item.artType)) {
          getCardPrice(item.card.cardNumber, item.card.name, false, item.artType);
        }
      });
    });
  }, [decks]); */

  const uniqueSets = ALL_SETS;

  const toggleFilter = (category: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => {
      const current = prev[category] as string[];
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
      variants: [],
      users: []
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
    return combinedCards.filter(card => {
      const query = debouncedSearchQuery.toLowerCase().trim();
      const normalizedQuery = query.replace(/[^a-z0-9]/g, '');
      const normalizedCardNumber = card.cardNumber.toLowerCase().replace(/[^a-z0-9]/g, '');

      const matchesSearch = !query || (
        card.name.toLowerCase().includes(query) ||
        card.cardNumber.toLowerCase().includes(query) ||
        (normalizedQuery.length > 2 && normalizedCardNumber.includes(normalizedQuery)) ||
        (card.link && card.link.toLowerCase().includes(query)) ||
        (card.traits && card.traits.some(trait => trait.toLowerCase().includes(query))) ||
        (card.ability && card.ability.toLowerCase().includes(query))
      );
      
      // New multi-select filters
      const normalize = (s: string) => s.replace(/\s+/g, '').toUpperCase();
      const matchesSets = activeFilters.sets.length === 0 || 
                         activeFilters.sets.some(s => normalize(s) === normalize(card.set));
      const matchesRarities = activeFilters.rarities.length === 0 || activeFilters.rarities.includes(card.rarity);
      const matchesColors = activeFilters.colors.length === 0 || activeFilters.colors.includes(card.color);
      const matchesTypes = activeFilters.types.length === 0 || activeFilters.types.some(t => card.type.includes(t as any));
      const matchesVariants = activeFilters.variants.length === 0 || 
                             activeFilters.variants.some(v => {
                               if (v === "Base art") return true;
                               const isDoublePlus = v === "Double Plus (++)";
                               const isChampionship = v === "Championship Participation";
                               
                               if (isDoublePlus && card.doublePlus) return true;
                               if (isChampionship && card.championshipParticipation) return true;
                               
                               return card.variants?.some(cv => cv.type === v);
                             });

      const matchesUsers = activeFilters.users.length === 0 || 
                          activeFilters.users.some(u => {
                            if (u === "Bookmark") return bookmarks.includes(card.id);
                            return true;
                          });

      return matchesSearch && matchesSets && matchesRarities && matchesColors && matchesTypes && matchesVariants && matchesUsers;
    }).sort((a, b) => {
      const normalize = (s: string) => s.replace(/\s+/g, '').toUpperCase();
      const normalizedSets = ALL_SETS.map(normalize);
      const setA = normalizedSets.indexOf(normalize(a.set));
      const setB = normalizedSets.indexOf(normalize(b.set));
      
      // If a set isn't found in ALL_SETS, put it at the end
      const indexA = setA === -1 ? 999 : setA;
      const indexB = setB === -1 ? 999 : setB;
      
      if (indexA !== indexB) return indexA - indexB;
      return a.cardNumber.localeCompare(b.cardNumber, undefined, { numeric: true });
    });
  }, [combinedCards, debouncedSearchQuery, activeFilters]);

  const gridData = useMemo(() => {
    const result: (GundamCard & { isVariant?: boolean; parentId?: string; variantType?: ArtVariantType })[] = [];
    filteredCards.forEach(card => {
      result.push(card);
      
      const activeVariantFilters = activeFilters.variants;
      const isExpanded = expandedCardIds.includes(card.id);
      
      if (isExpanded || activeVariantFilters.length > 0) {
        if (card.variants && card.variants.length > 0) {
          card.variants.forEach(variant => {
            if (variant.type === "Base art") return;
            
            const matchesFilter = activeVariantFilters.includes(variant.type);
            if (isExpanded || matchesFilter) {
              result.push({
                ...card,
                id: `${card.id}-${variant.type}`,
                imageUrl: variant.imageUrl,
                isVariant: true,
                parentId: card.id,
                variantType: variant.type
              });
            }
          });
        }
        
        if (card.altImageUrl) {
          const matchesParallel = activeVariantFilters.includes("Parallel");
          if (isExpanded || matchesParallel) {
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
      }
    });
    return result;
  }, [filteredCards, expandedCardIds, activeFilters.variants]);

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
      setIsCardMaximized(false);
      setShowAnatomy(false);
    }
  };

  const renderAbilityText = (text: string) => {
    if (!text) return null;
    // Smart regex to catch "When Paired", "During Pair", and variations with conditions/pilots
    // Supports spaces or middle dots (･) as separators
    const triggerRegex = /(During Pair|When Paired(?:[\s･]+\([^)]+\))?(?:[\s･]+lvl\s+\d+\s+or\s+Higher)?(?:[\s･]+pilot)?|\[When Paired\]|【When Paired】|【During Pair】|【Deploy】|【Attack】|【During Link】|【When Link】|【Destroyed】|【Repair(?:\s*\d+)?】|【Once per Turn】|【Activate・Main】|【Breach(?:\s*\d+)?】|【Burst】|【First Strike】|【High-Maneuver】|【Support(?:\s*\d+)?】|【Blocker】|【Suppression】)/gi;
    const parts = text.split(triggerRegex);
    
    return (
      <>
        {parts.map((part, i) => {
          if (part && part.match(triggerRegex)) {
            const cleanPart = part.replace(/[【】\[\]]/g, '').toLowerCase();
            let explanation = "";
            let title = part;
            let bgColor = "#C86891"; // Default pink
            let shadow = "none";
            
            if (cleanPart.includes("when paired")) {
              explanation = "【When Paired】is the keyword for an effect that activates when a Pilot is paired with any Unit.";
              title = "【When Paired】";
            } else if (cleanPart.includes("during pair")) {
              explanation = "【During Pair】is the keyword for an effect that is active while the Pilot is paired with a Unit.";
              title = "【During Pair】";
            } else if (cleanPart.includes("deploy")) {
              explanation = "【Deploy】is the keyword for an effect that activates when the card is played to the field.";
              title = "【Deploy】";
              bgColor = "#79B8BA";
            } else if (cleanPart.includes("attack")) {
              explanation = "【Attack】is the keyword for an effect that activates when this card declares an attack.";
              title = "【Attack】";
              bgColor = "#79B8BA";
            } else if (cleanPart.includes("during link")) {
              explanation = "【During Link】is the keyword for an effect that is active while this card is linked to another card.";
              title = "【During Link】";
              bgColor = "#FFEE04";
            } else if (cleanPart.includes("when link")) {
              explanation = "【When Link】is the keyword for an effect that activates when this card is linked to another card.";
              title = "【When Link】";
              bgColor = "#FFEE04";
            } else if (cleanPart.includes("destroyed")) {
              explanation = "【Destroyed】is the keyword for an effect that activates when this card is destroyed and sent to the trash.";
              title = "【Destroyed】";
              bgColor = "#79B8BA";
            } else if (cleanPart.includes("repair")) {
              const value = part.match(/\d+/);
              explanation = value 
                ? `【Repair ${value[0]}】is the keyword for an effect that allows you to pay ${value[0]} cost when this card is destroyed to return it to your hand.`
                : "【Repair】is the keyword for an effect that allows you to pay a cost when this card is destroyed to return it to your hand.";
              title = value ? `【Repair ${value[0]}】` : "【Repair】";
              bgColor = "#F8F9FA";
              shadow = "0 1px 2px rgba(0,0,0,0.1)";
            } else if (cleanPart.includes("once per turn")) {
              explanation = "【Once per Turn】indicates that this effect can only be activated once during each of your turns.";
              title = "【Once per Turn】";
            } else if (cleanPart.includes("activate・main")) {
              explanation = "【Activate・Main】is an effect that can be manually activated during your Main Phase.";
              title = "【Activate・Main】";
              bgColor = "#79B8BA";
            } else if (cleanPart.includes("breach")) {
              const value = part.match(/\d+/);
              explanation = value 
                ? `【Breach ${value[0]}】is the keyword for an effect that deals ${value[0]} additional damage when this Unit deals damage to the opponent's base.`
                : "【Breach】is the keyword for an effect that deals additional damage when this Unit deals damage to the opponent's base.";
              title = value ? `【Breach ${value[0]}】` : "【Breach】";
              bgColor = "#F8F9FA";
              shadow = "0 1px 2px rgba(0,0,0,0.1)";
            } else if (cleanPart.includes("burst")) {
              explanation = "【Burst】is an effect that activates when this card is triggered or revealed from the top of the deck.";
              title = "【Burst】";
              bgColor = "#DD8402";
            } else if (cleanPart.includes("first strike")) {
              explanation = "【First Strike】allows this Unit to deal damage before the opponent's Unit during battle.";
              title = "【First Strike】";
              bgColor = "#F8F9FA";
              shadow = "0 1px 2px rgba(0,0,0,0.1)";
            } else if (cleanPart.includes("high-maneuver")) {
              explanation = "【High-Maneuver】means this Unit can only be blocked by other Units with 【High-Maneuver】.";
              title = "【High-Maneuver】";
              bgColor = "#F8F9FA";
              shadow = "0 1px 2px rgba(0,0,0,0.1)";
            } else if (cleanPart.includes("support")) {
              const value = part.match(/\d+/);
              explanation = value 
                ? `【Support ${value[0]}】allows this Unit to grant +${value[0]} AP to the attacking Unit when it supports an attack.`
                : "【Support】allows this Unit to grant additional AP to the attacking Unit when it supports an attack.";
              title = value ? `【Support ${value[0]}】` : "【Support】";
              bgColor = "#F8F9FA";
              shadow = "0 1px 2px rgba(0,0,0,0.1)";
            } else if (cleanPart.includes("blocker")) {
              explanation = "【Blocker】allows you to exhaust this Unit to change the target of an opponent's attack to this Unit.";
              title = "【Blocker】";
              bgColor = "#F8F9FA";
              shadow = "0 1px 2px rgba(0,0,0,0.1)";
            } else if (cleanPart.includes("suppression")) {
              explanation = "【Suppression】is an effect that prevents opponent's Units from activating their effects or attacking.";
              title = "【Suppression】";
              bgColor = "#F8F9FA";
              shadow = "0 1px 2px rgba(0,0,0,0.1)";
            }

            if (explanation) {
              return (
                <button 
                  key={i} 
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = rect.left + rect.width / 2;
                    const safeX = Math.max(140, Math.min(window.innerWidth - 140, x));
                    setActiveTooltip({
                      title,
                      description: explanation,
                      x: safeX,
                      y: rect.top,
                      originalX: x
                    });
                  }}
                  style={{ backgroundColor: bgColor, boxShadow: shadow }}
                  className="text-black px-1.5 py-0.5 rounded-sm font-bold not-italic inline-block mx-0.5 hover:opacity-80 transition-all cursor-help"
                >
                  {part}
                </button>
              );
            }

            return (
              <span 
                key={i} 
                style={{ backgroundColor: bgColor, boxShadow: shadow }}
                className="text-black px-1.5 py-0.5 rounded-sm font-bold not-italic inline-block mx-0.5"
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
        const identified = await identifyCard(base64Image, combinedCards);
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

  // Preload first batch of images
  useEffect(() => {
    if (gridData.length > 0) {
      const firstBatch = gridData.slice(0, 20);
      firstBatch.forEach(item => {
        if (item.imageUrl) {
          const img = new Image();
          img.src = item.imageUrl;
        }
      });
    }
  }, [gridData]);

  const virtuosoComponents = React.useMemo(() => ({
    List: (props: any) => <ListContainer {...props} isDeckBuilderMode={isDeckBuilderMode} />
  }), [isDeckBuilderMode]);

  const renderGridItem = React.useCallback((index: number, card: GundamCard) => (
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
        const originalCard = combinedCards.find(gc => gc.id === (c.parentId || c.id));
        if (originalCard && activeDeckId) {
          addToDeck(activeDeckId, originalCard, art);
        }
      }}
      onRemoveFromDeck={(id, art) => activeDeckId && removeFromDeck(activeDeckId, id, art)}
      onUpdateDeckCount={(id, art, delta) => activeDeckId && updateDeckCount(activeDeckId, id, art, delta)}
      priceMode={priceMode}
      isBookmarked={bookmarks.includes(card.id)}
    />
  ), [isDeckBuilderMode, activeDeck, activeDeckId, addToDeck, removeFromDeck, updateDeckCount, priceMode, expandedCardIds, toggleExpanded, combinedCards, bookmarks]);

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-amber-200">
      {/* Deck Mode Notification */}
      <AnimatePresence>
        {showDeckModeNotification && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] pointer-events-none"
          >
            <div className="bg-[#141414] text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10">
              <Layout size={18} className="text-amber-500" />
              <span className="text-sm font-bold tracking-tight">Entering deck building mode</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={cn(
        "transition-all duration-300", 
        isFilterOpen && "blur-[2px] brightness-95"
      )}>
      {/* Header */}
      {currentTab === 'cards' && (
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-stone-200 px-4 py-2">
          <div className={cn(
            "max-w-md landscape:max-w-none mx-auto flex items-center gap-2",
            isDeckBuilderMode && "landscape:max-w-none"
          )}>
            <div className={cn(
              "w-8 h-8 bg-[#141414] rounded-lg flex items-center justify-center text-white shrink-0 shadow-md shadow-black/10",
              isDeckBuilderMode && "landscape:hidden"
            )}>
              <Sparkles size={16} />
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                (e.currentTarget.querySelector('input') as HTMLInputElement)?.blur();
              }}
              className={cn(
                "relative flex-1",
                isDeckBuilderMode && "landscape:flex-none landscape:w-full landscape:max-w-[240px]"
              )}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input 
                type="text"
                enterKeyHint="search"
                placeholder="Search cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-10 py-2 bg-stone-100 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
              />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 rounded-full hover:bg-stone-200 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </form>
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

      {/* Quick Start Screen */}
      {currentTab === 'quick-start' && (
        <div className="flex-1 flex flex-col bg-[#F5F5F0] min-h-screen">
          <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#141414]/10 px-4 py-4">
            <div className="max-w-md mx-auto flex items-center justify-between">
              <h1 className="text-xl font-black text-[#141414] tracking-tight uppercase">Quick Start</h1>
            </div>
          </header>

          <div className="max-w-md mx-auto w-full p-6 pb-32 flex flex-col gap-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#141414]">Ready to play?</h2>
                  <p className="text-xs text-stone-500 font-medium">Quickly access game modes and tools.</p>
                </div>
              </div>

              <div className="grid gap-3">
                <button 
                  onClick={() => {
                    setIsQuickSetupOpen(true);
                  }}
                  className="w-full p-4 bg-[#141414] text-white rounded-2xl flex items-center justify-between group active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                      <Zap size={20} />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-sm">Quick set up</span>
                      <span className="block text-[10px] text-white/50 font-medium">Generic game setup guide</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-white/30" />
                </button>

                <button 
                  onClick={() => {
                    setCurrentTab('scan');
                    setIsScanning(true);
                    startCamera();
                  }}
                  className="w-full p-4 bg-white border border-stone-200 rounded-2xl flex items-center justify-between group active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-stone-600 group-hover:scale-110 transition-transform">
                      <Scan size={20} />
                    </div>
                    <div className="text-left">
                      <span className="block font-bold text-sm text-[#141414]">Card Scanner</span>
                      <span className="block text-[10px] text-stone-400 font-medium">Identify cards instantly</span>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-stone-300" />
                </button>
              </div>
            </div>

            <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 space-y-2">
              <h3 className="text-sm font-black text-amber-800 uppercase tracking-wider">Pro Tip</h3>
              <p className="text-xs text-amber-700 leading-relaxed font-medium">
                Use the Card Scanner to quickly add cards to your deck by enabling "Continuous Scan" in the scanner settings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Profile Screen */}
      {currentTab === 'profile' && user && (
        <div className="flex-1 flex flex-col bg-[#F5F5F0] min-h-screen">
          <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#141414]/10 px-4 py-4">
            <div className="max-w-md mx-auto flex items-center justify-between">
              <h1 className="text-xl font-black text-[#141414] tracking-tight uppercase">Profile</h1>
              {isAdmin && (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-200">
                  Admin
                </span>
              )}
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

              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <button 
                  onClick={() => setShowFeedback(!showFeedback)}
                  className="w-full p-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                      <MessageSquare size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-[#141414]">Send Feedback</p>
                      <p className="text-[10px] text-stone-500 font-medium">Help us improve the app</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className={cn("text-stone-400 transition-transform", showFeedback && "rotate-90")} />
                </button>
                
                <AnimatePresence>
                  {showFeedback && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-stone-100"
                    >
                      <div className="p-4">
                        <FeedbackForm user={user} onComplete={() => setShowFeedback(false)} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {isAdmin && (
                <div className="space-y-3">
                  <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                    <button 
                      onClick={() => setShowCardManager(true)}
                      className="w-full p-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center">
                          <Plus size={18} />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-[#141414]">Card Management</p>
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase tracking-widest rounded border border-amber-200">Admin</span>
                          </div>
                          <p className="text-[10px] text-stone-500 font-medium">Add or edit cards in Firestore</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-stone-400" />
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                    <button 
                      onClick={() => setShowAdminPanel(!showAdminPanel)}
                      className="w-full p-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-stone-900 text-white rounded-lg flex items-center justify-center relative">
                          <ShieldCheck size={18} />
                          {adminFeedback.filter(t => t.status === 'New').length > 0 && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                          )}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-black text-[#141414]">Feedback Management</p>
                          <p className="text-[10px] text-stone-500 font-medium">
                            {adminFeedback.filter(t => t.status === 'New').length} New Tickets
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={16} className={cn("text-stone-400 transition-transform", showAdminPanel && "rotate-90")} />
                    </button>
                    
                    <AnimatePresence>
                      {showAdminPanel && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-stone-100"
                        >
                          <div className="p-4">
                            <AdminFeedbackPanel 
                              tickets={adminFeedback} 
                              onUpdateStatus={handleUpdateFeedbackStatus}
                              onDelete={handleDeleteFeedback}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

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

      <main className={cn(
        "max-w-md landscape:max-w-none lg:max-w-none mx-auto px-4 landscape:px-4 lg:px-12 pt-4 pb-32 transition-all duration-300", 
        isDeckBuilderMode 
          ? (deckBuilderView === 'list' ? "block" : "hidden landscape:block")
          : (currentTab !== 'cards' ? "hidden" : "block"),
        isDeckBuilderMode && "landscape:w-1/2 landscape:ml-0 landscape:max-w-none landscape:px-6 landscape:pb-20 builder-mode"
      )}>
        {/* Filters */}
        {(currentTab === 'cards' || (isDeckBuilderMode && currentTab === 'decks')) && (
          <>
            <div className="mb-6 space-y-4">
          {/* Active Filter Tags */}
          {(activeFilterList.length > 0 || debouncedSearchQuery) && (
            <div className="flex flex-wrap gap-2 mb-2">
              {debouncedSearchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-full text-[9px] font-black uppercase tracking-wider transition-colors border border-stone-200 group"
                >
                  Search: {debouncedSearchQuery}
                  <X size={10} className="text-stone-400 group-hover:text-stone-600" />
                </button>
              )}
              {activeFilterList.map(({ category, value }) => (
                <button
                  key={`${category}-${value}`}
                  onClick={() => toggleFilter(category, value)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-wider transition-colors border border-amber-200 group"
                >
                  {value}
                  <X size={10} className="text-amber-400 group-hover:text-amber-600" />
                </button>
              ))}
              <button
                onClick={resetFilters}
                className="text-[9px] font-black uppercase tracking-wider text-stone-400 hover:text-stone-600 transition-colors py-1 px-1"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
              {cardsLoading ? "..." : filteredCards.length} Cards Found
            </p>
            {/* Price mode switcher hidden as requested */}
            {/* <div className="flex bg-white border border-stone-200 rounded-lg p-0.5">
              {(['JPY', 'SGD130', 'SGD120'] as PriceDisplayMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setPriceMode(m)}
                  className={cn(
                    "px-2 py-1 rounded-md text-[9px] font-bold transition-all",
                    priceMode === m 
                      ? "bg-amber-600 text-white shadow-sm" 
                      : "text-stone-400 hover:text-stone-600"
                  )}
                >
                  {m === 'JPY' ? '¥' : m === 'SGD130' ? 'YYT/130' : 'YYT/120'}
                </button>
              ))}
            </div> */}
          </div>
        </div>

        {/* Card Grid */}
        {cardsLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mb-6">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">Loading Database</h3>
            <p className="text-stone-500 text-sm max-w-[240px]">
              Please wait while we fetch the latest card information...
            </p>
          </div>
        ) : filteredCards.length === 0 ? (
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
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-full text-[10px] font-bold transition-colors border border-stone-200"
                    >
                      Search: {debouncedSearchQuery}
                      <X size={12} />
                    </button>
                  )}
                  {activeFilterList.map(({ category, value }) => (
                    <button
                      key={`${category}-${value}`}
                      onClick={() => toggleFilter(category, value)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold transition-colors border border-amber-200"
                    >
                      {value}
                      <X size={12} />
                    </button>
                  ))}
                </div>

                <button
                  onClick={resetFilters}
                  className="w-full py-3 rounded-2xl bg-[#141414] text-white font-bold text-sm shadow-lg shadow-black/10 active:scale-95 transition-all"
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
            overscan={400}
            components={virtuosoComponents}
            itemContent={renderGridItem}
          />
        )}
      </>
    )}
  </main>

      {/* Sticky Deck Builder Bar */}
      <AnimatePresence>
        {isDeckBuilderMode && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-[100] bg-white flex flex-col shadow-[0_-8px_30px_rgba(0,0,0,0.12)]"
          >
            {/* View Toggle Buttons */}
            <div className="flex bg-stone-100/50 p-1 gap-1 landscape:hidden">
              <button 
                onClick={() => setDeckBuilderView('list')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  deckBuilderView === 'list' 
                    ? "bg-white text-[#141414] shadow-sm ring-1 ring-black/5" 
                    : "text-stone-400 hover:text-stone-600"
                )}
              >
                Card List
              </button>
              <button 
                onClick={() => setDeckBuilderView('editor')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  deckBuilderView === 'editor' 
                    ? "bg-white text-[#141414] shadow-sm ring-1 ring-black/5" 
                    : "text-stone-400 hover:text-stone-600"
                )}
              >
                Deck Editor
              </button>
            </div>

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
                return <div className="w-full h-full bg-stone-100" />;
              })()}
            </div>

            {/* Deck Info Bar */}
            <div className="px-4 py-2.5 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-stone-100 rounded-lg overflow-hidden shrink-0 border border-stone-200">
                  {activeDeck?.coverImageUrl ? (
                    <img src={activeDeck.coverImageUrl} alt="" className="w-full h-full object-cover object-[center_5%] scale-150" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                      <Layout size={18} />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[11px] font-black text-[#141414] truncate leading-tight">
                    {activeDeck?.name || "Untitled Deck"}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[7px] font-black text-stone-400 uppercase tracking-wider">Cards</span>
                    <span className="text-[9px] font-black text-[#141414]">
                      {activeDeck?.items.reduce((s, i) => s + i.count, 0) || 0}/50
                    </span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  setIsDeckBuilderMode(false);
                  setDeckBuilderView('list');
                  setCurrentTab('decks');
                  setIsDeckEditorOpen(true);
                }}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-black text-[8px] uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 active:scale-95"
              >
                Exit Builder
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Sticky Footer Navigation */}
      {!isDeckBuilderMode && (
        <div className={cn(
          "fixed bottom-0 left-0 right-0 z-[100] bg-[#F5F5F0] border-t border-stone-200/60 pb-2 pt-1"
        )}>
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
              setShowFeedback(false);
              setShowAdminPanel(false);
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
                deckEditorRef.current.requestClose();
                return;
              }
              if (currentTab === 'scan') stopCamera();
              
              if (isDeckInPlayMode) {
                setCurrentTab('decks');
                setIsDeckEditorOpen(true);
                setShowFeedback(false);
                setShowAdminPanel(false);
              } else if (isDeckBuilderMode && activeDeckId) {
                setIsDeckEditorOpen(true);
                setShowDeckList(false);
                setCurrentTab('decks');
                setShowFeedback(false);
                setShowAdminPanel(false);
              } else {
                setShowDeckList(true);
                setIsDeckEditorOpen(false);
                setCurrentTab('decks');
                setShowFeedback(false);
                setShowAdminPanel(false);
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
              setCurrentTab('quick-start');
              setShowFeedback(false);
              setShowAdminPanel(false);
              setShowDeckList(false);
              setIsScanning(false);
            }}
            className="flex flex-col items-center gap-0 group transition-all active:scale-95 relative"
          >
            <div className={cn(
              "p-1 rounded-lg transition-colors",
              currentTab === 'quick-start' ? "bg-stone-200/80" : "group-hover:bg-stone-200/50"
            )}>
              <Sparkles size={16} className={cn(
                "transition-colors",
                currentTab === 'quick-start' ? "text-[#141414]" : "text-stone-500 group-hover:text-[#141414]"
              )} strokeWidth={currentTab === 'quick-start' ? 2 : 1.5} />
            </div>
            <span className={cn(
              "text-[8px] font-bold uppercase tracking-tighter transition-colors",
              currentTab === 'quick-start' ? "text-[#141414]" : "text-stone-400 group-hover:text-[#141414]"
            )}>Quick start</span>
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
              setShowFeedback(false);
              setShowAdminPanel(false);
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
                setShowFeedback(false);
                setShowAdminPanel(false);
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
      )}

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
            className="fixed inset-0 z-[60] bg-[#F5F5F0] overflow-y-auto overscroll-contain landscape:overflow-hidden"
          >
            <div className={cn(
              "max-w-md mx-auto min-h-screen flex flex-col landscape:max-w-none landscape:h-screen landscape:overflow-hidden",
              isDeckBuilderMode ? "pb-40 landscape:pb-12" : "pb-24 landscape:pb-12"
            )}>
              {/* Modal Header */}
              <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200 px-4 py-3 flex items-center justify-between landscape:w-full landscape:shrink-0">
                <button 
                  onClick={() => {
                    setSelectedCard(null);
                    setSelectedArtType("Base art");
                    setIsCardMaximized(false);
                    setShowAnatomy(false);
                  }}
                  className="p-2 text-[#141414] hover:bg-stone-100 rounded-full transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>

                <div className="flex items-center gap-3">
                  {(selectedCard.variants && selectedCard.variants.length > 0) || selectedCard.altImageUrl ? (
                    <div className="relative">
                      <select
                        value={selectedArtType}
                        onChange={(e) => {
                          setSelectedArtType(e.target.value as ArtVariantType);
                          setShowAnatomy(false);
                        }}
                        className="appearance-none bg-stone-100 border border-stone-200 rounded-full px-4 py-2 pr-8 text-[9px] font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                      >
                        <option value="Base art">Base art</option>
                        {selectedCard.altImageUrl && <option value="Parallel">Parallel</option>}
                        {selectedCard.variants?.map(v => (
                          <option key={v.type} value={v.type}>{v.type}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronLeft size={12} className="-rotate-90 text-stone-400" />
                      </div>
                    </div>
                  ) : null}

                  <button 
                    onClick={() => {
                      setShowDeckSelector(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#141414] text-white rounded-full hover:bg-stone-800 transition-colors shadow-lg shadow-black/10 active:scale-95"
                  >
                    <Plus size={14} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Add to deck</span>
                  </button>

                  <button 
                    onClick={() => toggleBookmark(selectedCard.id)}
                    className={cn(
                      "p-2 rounded-full transition-all active:scale-95 shadow-lg shadow-black/5 border",
                      bookmarks.includes(selectedCard.id)
                        ? "bg-amber-50 border-amber-200 text-amber-600"
                        : "bg-white border-stone-200 text-stone-400 hover:text-stone-600"
                    )}
                    title={bookmarks.includes(selectedCard.id) ? "Remove bookmark" : "Bookmark card"}
                  >
                    <Bookmark size={18} className={cn(bookmarks.includes(selectedCard.id) && "fill-amber-600")} />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col landscape:flex-row landscape:overflow-hidden">
                <div className="relative w-full h-[372px] mt-1 flex items-center justify-center overflow-hidden landscape:w-1/2 landscape:h-full landscape:mt-0">
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* Previous Card Peek */}
                    {currentIndex > 0 && (
                      <div 
                        key={`peek-prev-${gridData[currentIndex - 1].id}`}
                        className="absolute left-0 -translate-x-[65%] w-[240px] aspect-[5/7] rounded-2xl overflow-hidden opacity-10 scale-90 z-0 landscape:w-auto landscape:h-[75%] landscape:-translate-x-[60%]"
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
                          className="relative w-[260px] aspect-[5/7] bg-stone-100 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-black/5 cursor-pointer group landscape:w-auto landscape:h-[85%]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsCardMaximized(true);
                          }}
                        >
                          {selectedCard.championshipParticipation && (
                            <div className="absolute top-4 right-4 bg-blue-500 text-white p-1.5 rounded-full shadow-2xl z-20 border border-white/30 animate-in zoom-in duration-300">
                              <Trophy size={14} strokeWidth={2} />
                            </div>
                          )}
                          <SmartImage 
                            src={
                              selectedArtType === "Base art" 
                                ? selectedCard.imageUrl 
                                : selectedArtType === "Parallel" 
                                  ? selectedCard.altImageUrl || selectedCard.imageUrl
                                  : selectedCard.variants?.find(v => v.type === selectedArtType)?.imageUrl || selectedCard.imageUrl
                            } 
                            alt={selectedCard.name}
                            className="w-full h-full"
                          />
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Next Card Peek */}
                    {currentIndex < gridData.length - 1 && currentIndex !== -1 && (
                      <div 
                        key={`peek-next-${gridData[currentIndex + 1].id}`}
                        className="absolute right-0 translate-x-[65%] w-[240px] aspect-[5/7] rounded-2xl overflow-hidden opacity-10 scale-90 z-0 landscape:w-auto landscape:h-[75%] landscape:translate-x-[60%]"
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

                <div className="p-4 pb-20 space-y-6 flex-1 landscape:w-1/2 landscape:h-full landscape:overflow-y-auto landscape:pb-10 landscape:bg-white/30">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-2xl font-bold leading-tight text-[#141414]">{selectedCard.name}</h2>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isAdmin && (
                        <button 
                          onClick={() => {
                            setInitialCardIdForManager(selectedCard.id);
                            setShowCardManager(true);
                            setSelectedCard(null);
                          }}
                          className="p-2 text-stone-400 hover:text-[#C86891] hover:bg-[#C86891]/10 rounded-full transition-all"
                          title="Edit card info"
                        >
                          <Edit2 size={20} />
                        </button>
                      )}
                      <button 
                        onClick={() => setShowFeedbackPopup(true)}
                        className="p-2 text-stone-400 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-all"
                        title="Report issue with this card"
                      >
                        <MessageSquare size={20} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center flex-wrap gap-x-3 gap-y-2 mt-1">
                    <p className="text-stone-500 font-mono text-[9px] uppercase tracking-wider">{selectedCard.cardNumber} • {selectedCard.set}</p>
                    
                    <div className="flex items-center gap-1.5">
                      <RarityTag rarity={selectedCard.rarity} />
                      <ColorTag color={selectedCard.color} />
                    </div>
                  </div>

                  <CardPrice 
                    cardNumber={selectedCard.cardNumber} 
                    cardName={selectedCard.name} 
                    artType={selectedArtType} 
                    mode={priceMode}
                    onModeChange={setPriceMode}
                  />

                  {/* Artist Info */}
                  {(() => {
                    let currentArtist;
                    if (selectedArtType === "Base art") {
                      currentArtist = { name: selectedCard.baseArtist, link: selectedCard.baseArtistLink };
                    } else if (selectedArtType === "Parallel") {
                      currentArtist = { name: selectedCard.altArtist, link: selectedCard.altArtistLink };
                    } else {
                      const variant = selectedCard.variants?.find(v => v.type === selectedArtType);
                      currentArtist = { name: variant?.artist, link: variant?.artistLink };
                    }

                    if (!currentArtist.name) return null;

                    return (
                      <div className="flex items-center gap-2 py-1">
                        <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600">
                          <Palette size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black uppercase text-stone-400 leading-none mb-0.5">Artist</span>
                          {currentArtist.link ? (
                            <a 
                              href={currentArtist.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-[#141414] hover:text-amber-600 flex items-center gap-1 transition-colors"
                            >
                              {currentArtist.name}
                              <ExternalLink size={10} className="opacity-50" />
                            </a>
                          ) : (
                            <span className="text-xs font-bold text-[#141414]">{currentArtist.name}</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-white p-2 rounded-xl border border-stone-200 text-center">
                    <p className="text-[8px] text-stone-400 uppercase font-bold mb-0.5">Cost</p>
                    <p className="text-sm font-black">{selectedCard.cost}</p>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-stone-200 text-center">
                    <p className="text-[8px] text-stone-400 uppercase font-bold mb-0.5">Lv.</p>
                    <p className="text-sm font-black">{selectedCard.level || '-'}</p>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-stone-200 text-center">
                    <p className="text-[8px] text-stone-400 uppercase font-bold mb-0.5">AP</p>
                    <p className="text-sm font-black text-red-600">{selectedCard.ap || '-'}</p>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-stone-200 text-center">
                    <p className="text-[8px] text-stone-400 uppercase font-bold mb-0.5">HP</p>
                    <p className="text-sm font-black text-blue-600">{selectedCard.hp || '-'}</p>
                  </div>
                </div>

                {selectedCard.traits && selectedCard.traits.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                      <Tag size={14} /> Traits
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCard.traits.map(trait => (
                        <button 
                          key={trait} 
                          onClick={() => {
                            setSearchQuery(trait);
                            setSelectedCard(null);
                            setCurrentTab('cards');
                          }}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-amber-100 hover:text-amber-700 hover:border-amber-200 rounded-full text-[11px] font-black text-stone-600 border border-stone-200 transition-all active:scale-95"
                        >
                          {trait}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                    <Info size={14} /> Ability
                  </h4>
                  <div className="bg-white p-4 rounded-2xl border border-stone-200 text-sm leading-relaxed whitespace-pre-wrap italic">
                    {renderAbilityText(selectedCard.ability)}
                  </div>
                </div>

                {linkedCards.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                      <RefreshCw size={14} /> {selectedCard.type.includes('Pilot') ? 'Linked Units' : 'Linked Pilot'}
                    </h4>
                    <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-show">
                      {linkedCards.map(card => (
                        <div 
                          key={card.id}
                          onClick={() => {
                            setSelectedCard(card);
                            setSelectedArtType("Base art");
                            setIsCardMaximized(false);
                            setShowAnatomy(false);
                          }}
                          className="group cursor-pointer space-y-2 w-28 shrink-0"
                        >
                          <div className="aspect-[5/7] rounded-lg overflow-hidden ring-1 ring-black/5 shadow-sm group-hover:shadow-md group-hover:ring-amber-500/50 transition-all">
                            <img 
                              src={card.imageUrl} 
                              alt={card.name}
                              className="w-full h-full object-fill"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <p className="text-[10px] font-bold text-stone-600 leading-tight text-center group-hover:text-amber-600 transition-colors line-clamp-2">
                            {card.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {cardFaq.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                      <HelpCircle size={14} /> Card FAQ
                    </h4>
                    <div className="space-y-4">
                      {cardFaq.map((item, index) => (
                        <div key={index} className="bg-white p-4 rounded-2xl border border-stone-200 space-y-2">
                          <div className="flex gap-2">
                            <span className="font-black text-amber-500 shrink-0">Q:</span>
                            <p className="text-sm font-bold text-[#141414]">{item.question}</p>
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-stone-50">
                            <span className="font-black text-stone-400 shrink-0">A:</span>
                            <p className="text-sm text-stone-600 leading-relaxed">{item.answer}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Maximized Card View */}
      <AnimatePresence>
        {isCardMaximized && selectedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6 md:p-12"
            onClick={() => setIsCardMaximized(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-2xl h-full flex items-center justify-center pointer-events-none"
            >
              <div className="relative w-full h-full flex items-center justify-center p-4">
                <img 
                  src={
                    selectedArtType === "Base art" 
                      ? selectedCard.imageUrl 
                      : selectedArtType === "Parallel" 
                        ? selectedCard.altImageUrl || selectedCard.imageUrl
                        : selectedCard.variants?.find(v => v.type === selectedArtType)?.imageUrl || selectedCard.imageUrl
                  } 
                  alt={selectedCard.name}
                  className="w-auto h-auto max-w-full max-h-full rounded-xl shadow-2xl object-contain pointer-events-auto"
                  referrerPolicy="no-referrer"
                  onClick={(e) => e.stopPropagation()}
                />
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCardMaximized(false);
                  }}
                  className="absolute top-4 right-4 md:-right-12 md:top-0 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all backdrop-blur-md border border-white/10 shadow-xl active:scale-90 pointer-events-auto"
                >
                  <X size={24} />
                </button>
              </div>
            </motion.div>
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
            onSetCover={setDeckCover}
            onClose={() => {
              setShowDeckList(false);
              setDeckListAutoCreate(false);
              setCurrentTab('cards');
            }}
            autoStartCreate={deckListAutoCreate}
          />
        )}
      </AnimatePresence>

      {/* Quick Setup Overlay */}
      <QuickSetup 
        isOpen={isQuickSetupOpen}
        onClose={() => setIsQuickSetupOpen(false)}
      />

      {/* Quick Start Deck Picker Modal */}
      <AnimatePresence>
        {isQuickStartDeckPickerOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsQuickStartDeckPickerOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black uppercase tracking-tight">Select Deck</h3>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-0.5">
                    {quickStartMode === 'play' ? 'Start Play Mode' : 'View Stats'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsQuickStartDeckPickerOpen(false)}
                  className="p-2 text-stone-400 hover:text-stone-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {decks.length === 0 ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto text-stone-300">
                      <Layout size={32} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-stone-500 font-bold">No decks found</p>
                      <p className="text-xs text-stone-400">Create a deck first to use this mode.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setIsQuickStartDeckPickerOpen(false);
                        setCurrentTab('decks');
                        setShowDeckList(true);
                      }}
                      className="px-6 py-2 bg-[#141414] text-white rounded-xl text-xs font-black uppercase tracking-widest"
                    >
                      Go to Decks
                    </button>
                  </div>
                ) : (
                  decks.map(deck => (
                    <button 
                      key={deck.id}
                      onClick={() => {
                        setActiveDeckId(deck.id);
                        setIsQuickStartDeckPickerOpen(false);
                        if (quickStartMode === 'play') {
                          setIsDeckInPlayMode(true);
                          setIsDeckEditorOpen(true);
                        }
                      }}
                      className="w-full p-4 bg-stone-50 hover:bg-stone-100 rounded-2xl border border-stone-200 transition-all flex items-center gap-4 group"
                    >
                      <div className="w-12 h-12 bg-stone-200 rounded-xl overflow-hidden shrink-0">
                        {deck.coverImageUrl ? (
                          <img src={deck.coverImageUrl} alt="" className="w-full h-full object-cover object-[center_5%] scale-150" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400">
                            <Layout size={20} />
                          </div>
                        )}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="font-bold text-sm truncate text-[#141414]">{deck.name}</p>
                        <p className="text-[10px] text-stone-400 font-medium">
                          {deck.items.reduce((acc, item) => acc + item.count, 0)} Cards
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-stone-300 group-hover:text-stone-500 transition-colors" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Proxy Printer Overlay */}
      <AnimatePresence>
        {printingDeck && (
          <ProxyPrinter 
            deck={printingDeck}
            onClose={() => setPrintingDeck(null)}
          />
        )}
      </AnimatePresence>

      {/* Deck Editor Overlay */}
      <AnimatePresence>
        {isDeckEditorOpen && activeDeckId && activeDeck && (
          <DeckEditor 
            ref={deckEditorRef}
            deck={activeDeck}
            visible={isDeckBuilderMode ? deckBuilderView === 'editor' : currentTab === 'decks'}
            initialTab={isDeckInPlayMode ? 'play' : 'cards'}
            allCards={combinedCards}
            onUpdateCount={updateDeckCount}
            onRemove={removeFromDeck}
            onPreviewCard={(card) => setSelectedCard(card)}
            onSetCover={setDeckCover}
            isDeckBuilderMode={isDeckBuilderMode}
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
            onRenameDeck={renameDeck}
            onPrintProxy={(deck) => setPrintingDeck(deck)}
            onDuplicateDeck={duplicateDeck}
            onImportDeck={importDeckFromText}
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
                <h2 className="font-bold text-lg text-[#141414]">Filters</h2>
                <button 
                  onClick={() => setIsFilterOpen(false)}
                  className="p-2 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-8 no-scrollbar">
                {/* Users */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Users</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => toggleFilter('users', 'Bookmark')}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-1.5",
                        activeFilters.users.includes('Bookmark')
                          ? "bg-[#141414] text-white border-[#141414] shadow-md shadow-black/10"
                          : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                      )}
                    >
                      <Bookmark size={12} className={cn(activeFilters.users.includes('Bookmark') && "fill-white")} />
                      Bookmark
                    </button>
                  </div>
                </div>

                {/* Sets */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Sets</h3>
                  <div className="flex flex-wrap gap-2">
                    {ALL_SETS.map(setName => (
                      <button
                        key={setName}
                        onClick={() => toggleFilter('sets', setName)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                          activeFilters.sets.includes(setName)
                            ? "bg-[#141414] text-white border-[#141414] shadow-md shadow-black/10"
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
                  <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Rarity</h3>
                  <div className="flex flex-wrap gap-2">
                    {RARITIES.map(rarity => (
                      <button
                        key={rarity}
                        onClick={() => toggleFilter('rarities', rarity)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                          activeFilters.rarities.includes(rarity)
                            ? "bg-[#141414] text-white border-[#141414] shadow-md shadow-black/10"
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
                  <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Color</h3>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => toggleFilter('colors', color)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                          activeFilters.colors.includes(color)
                            ? "bg-[#141414] text-white border-[#141414] shadow-md shadow-black/10"
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
                  <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Type</h3>
                  <div className="flex flex-wrap gap-2">
                    {TYPES.map(type => (
                      <button
                        key={type}
                        onClick={() => toggleFilter('types', type)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                          activeFilters.types.includes(type)
                            ? "bg-[#141414] text-white border-[#141414] shadow-md shadow-black/10"
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
                  <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Art Variant</h3>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_VARIANTS.map(variant => (
                      <button
                        key={variant}
                        onClick={() => toggleFilter('variants', variant)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border",
                          activeFilters.variants.includes(variant)
                            ? "bg-[#141414] text-white border-[#141414] shadow-md shadow-black/10"
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
                  className="py-3 rounded-xl text-sm font-bold bg-[#141414] text-white hover:bg-stone-800 transition-colors shadow-lg shadow-black/10"
                >
                  Apply
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Admin Card Manager */}
      {showCardManager && isAdmin && (
        <AdminCardManager 
          onClose={() => {
            setShowCardManager(false);
            setInitialCardIdForManager(null);
          }} 
          adminFeedback={adminFeedback}
          onUpdateFeedbackStatus={handleUpdateFeedbackStatus}
          initialCardId={initialCardIdForManager}
        />
      )}

      {/* Card Feedback Popup */}
      <AnimatePresence>
        {showFeedbackPopup && selectedCard && (
          <CardFeedbackPopup 
            card={selectedCard} 
            onClose={() => setShowFeedbackPopup(false)} 
          />
        )}
      </AnimatePresence>

      {/* Keyword Tooltip */}
      <AnimatePresence>
        {activeTooltip && (
          <>
            <div 
              className="fixed inset-0 z-[100]" 
              onClick={() => setActiveTooltip(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              style={{ 
                left: activeTooltip.x, 
                top: activeTooltip.y - 10,
                translateX: '-50%',
                translateY: '-100%'
              }}
              className="fixed z-[101] w-64 max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-stone-100 p-4 pointer-events-auto"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#C86891]">
                    {activeTooltip.title}
                  </h4>
                  <button 
                    onClick={() => setActiveTooltip(null)}
                    className="p-1 hover:bg-stone-100 rounded-full transition-colors"
                  >
                    <X size={14} className="text-stone-400" />
                  </button>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed font-medium">
                  {activeTooltip.description}
                </p>
              </div>
              {/* Arrow */}
              <div 
                className="absolute bottom-0 w-3 h-3 bg-white border-r border-b border-stone-100 rotate-45 translate-y-1/2" 
                style={{ 
                  left: `calc(50% + ${activeTooltip.originalX - activeTooltip.x}px)`,
                  transform: 'translateX(-50%) translateY(50%) rotate(45deg)'
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
