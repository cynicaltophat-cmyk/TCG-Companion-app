import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  query, 
  orderBy,
  where
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Deck, TournamentEvent, DeckSubmission, EventType, Placement } from '../types';
import { 
  X, 
  ChevronDown, 
  Calendar, 
  Trophy, 
  User, 
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Layout
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ProgressiveImage } from './ProgressiveImage';

interface DeckSubmissionFormProps {
  deck: Deck;
  onClose: () => void;
  onSuccess: () => void;
}

const SEASONS = [
  { id: "GD04", name: "GD04 - Phantom Aria" },
  { id: "GD03", name: "GD03 - Steel Requiem" },
  { id: "GD02", name: "GD02 - Clan unity" },
  { id: "GD01", name: "GD01 - Newtype Rising" }
];

const EVENT_TYPES: EventType[] = ["Shop Battle", "Newtype challenge", "Organized Event"];
const PLACEMENTS: Placement[] = ["Top 1", "Top 4", "Top 8", "Top 16", "Top 32"];

export const DeckSubmissionForm: React.FC<DeckSubmissionFormProps> = ({ deck, onClose, onSuccess }) => {
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    playerName: auth.currentUser?.displayName || "",
    season: SEASONS[0].id,
    eventType: EVENT_TYPES[0] as EventType,
    tournamentId: "",
    date: new Date().toISOString().split('T')[0],
    placement: PLACEMENTS[0] as Placement
  });

  useEffect(() => {
    const q = query(
      collection(db, 'tournament_events'), 
      where('season', '==', formData.season),
      orderBy('date', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData: TournamentEvent[] = [];
      snapshot.forEach((doc) => {
        eventsData.push(doc.data() as TournamentEvent);
      });
      setEvents(eventsData);
      
      // Select first event if available and it's an organized event
      if (eventsData.length > 0 && formData.eventType === 'Organized Event') {
        setFormData(prev => ({ ...prev, tournamentId: eventsData[0].id }));
      }
    });

    return () => unsubscribe();
  }, [formData.season, formData.eventType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      alert("Please log in to submit a deck");
      return;
    }

    const totalCards = deck.items.reduce((acc, item) => acc + item.count, 0);
    if (totalCards !== 50) {
      alert("Please submit a 50 card decklist");
      return;
    }

    setSubmitting(true);
    const submissionId = `sub-${Date.now()}`;
    
    // Find tournament name if applicable
    const selectedTournament = events.find(e => e.id === formData.tournamentId);

    const submission: any = {
      id: submissionId,
      uid: auth.currentUser.uid,
      deckId: deck.id,
      deckName: deck.name,
      deckItems: deck.items,
      playerName: formData.playerName,
      season: formData.season,
      eventType: formData.eventType,
      date: formData.date,
      placement: formData.placement,
      createdAt: Date.now(),
      status: 'pending'
    };

    if (deck.coverImageUrl) submission.coverImageUrl = deck.coverImageUrl;

    if (formData.eventType === 'Organized Event') {
      if (formData.tournamentId) submission.tournamentId = formData.tournamentId;
      if (selectedTournament?.name) submission.tournamentName = selectedTournament.name;
    }

    try {
      await setDoc(doc(db, 'deck_submissions', submissionId), submission);
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      console.error("Error submitting deck:", err);
      alert("Failed to submit deck. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-6 animate-bounce">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-2xl font-black text-stone-900 mb-2">Submission Successful!</h2>
        <p className="text-stone-500 max-w-xs">Your winning decklist has been submitted and is pending review by our admins.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white flex flex-col animate-in slide-in-from-right duration-300">
      <header className="px-4 py-4 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <button onClick={onClose} className="p-2 hover:bg-stone-50 rounded-full">
          <ArrowLeft size={20} className="text-stone-600" />
        </button>
        <h2 className="text-lg font-black tracking-tight text-stone-900">Submit deck</h2>
        <div className="w-10 h-10" /> {/* Spacer */}
      </header>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        {/* Deck List Preview */}
        <section className="space-y-4">
          <label className="text-xs font-black text-stone-900 uppercase tracking-widest pl-1">Deck list</label>
          <div className="relative h-40 bg-stone-100 rounded-[2rem] overflow-hidden border border-stone-100 shadow-lg">
            {deck.coverImageUrl ? (
              <ProgressiveImage src={deck.coverImageUrl} imageClassName="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-300">
                <Layout size={48} />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-between">
              <h3 className="text-white font-black text-2xl drop-shadow-md">{deck.name}</h3>
              <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 text-white text-[10px] font-black uppercase tracking-widest">
                {deck.items.reduce((acc, i) => acc + i.count, 0)} cards
              </div>
            </div>
          </div>
        </section>

        {/* Season */}
        <section className="space-y-2">
          <label className="text-xs font-black text-stone-900 uppercase tracking-widest pl-1">Season</label>
          <div className="relative">
            <select 
              value={formData.season}
              onChange={(e) => setFormData(prev => ({ ...prev, season: e.target.value }))}
              className="w-full pl-4 pr-10 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-sm font-bold appearance-none outline-none focus:ring-2 focus:ring-stone-200 transition-all"
            >
              {SEASONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Event Type */}
          <section className="space-y-2">
            <label className="text-xs font-black text-stone-900 uppercase tracking-widest pl-1">Event type</label>
            <div className="relative">
              <select 
                value={formData.eventType}
                onChange={(e) => setFormData(prev => ({ ...prev, eventType: e.target.value as EventType }))}
                className="w-full pl-4 pr-10 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-sm font-bold appearance-none focus:ring-2 focus:ring-stone-200 transition-all"
              >
                {EVENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
            </div>
          </section>

          {/* Tournament Organizer */}
          <section className="space-y-2">
            <label className="text-xs font-black text-stone-900 uppercase tracking-widest pl-1">Tournament Organizer</label>
            <div className="relative">
              <select 
                disabled={formData.eventType !== 'Organized Event'}
                value={formData.tournamentId}
                onChange={(e) => setFormData(prev => ({ ...prev, tournamentId: e.target.value }))}
                className={cn(
                  "w-full pl-4 pr-10 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-sm font-bold appearance-none focus:ring-2 focus:ring-stone-200 transition-all",
                  formData.eventType !== 'Organized Event' && "opacity-50 cursor-not-allowed bg-stone-200"
                )}
              >
                {events.length === 0 ? (
                  <option value="">No events found for this season</option>
                ) : (
                  events.map(event => <option key={event.id} value={event.id}>{event.name}</option>)
                )}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date */}
          <section className="space-y-2">
            <label className="text-xs font-black text-stone-900 uppercase tracking-widest pl-1">Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
              <input 
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-stone-200 transition-all outline-none"
              />
            </div>
          </section>

          {/* Placement */}
          <section className="space-y-2">
            <label className="text-xs font-black text-stone-900 uppercase tracking-widest pl-1">Placement</label>
            <div className="relative">
              <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
              <select 
                value={formData.placement}
                onChange={(e) => setFormData(prev => ({ ...prev, placement: e.target.value as Placement }))}
                className="w-full pl-12 pr-10 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-sm font-bold appearance-none focus:ring-2 focus:ring-stone-200 transition-all outline-none"
              >
                {PLACEMENTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown className="absolute right-10 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
            </div>
          </section>
        </div>

        {/* Player Name */}
        <section className="space-y-2">
          <label className="text-xs font-black text-stone-900 uppercase tracking-widest pl-1">Player name</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
            <input 
              type="text"
              value={formData.playerName}
              onChange={(e) => setFormData(prev => ({ ...prev, playerName: e.target.value }))}
              placeholder="e.g. kaisenesse"
              className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-stone-200 transition-all outline-none"
              required
            />
          </div>
        </section>

        <div className="pt-8 pb-12">
          <button 
            type="submit"
            disabled={submitting}
            className="w-full py-5 bg-[#E5E5E0] hover:bg-[#DEDECB] text-stone-900 rounded-[2rem] font-black text-xl shadow-xl shadow-stone-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {submitting ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                Submitting...
              </>
            ) : (
              "SUBMIT"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
