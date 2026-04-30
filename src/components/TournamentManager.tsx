import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  where,
  writeBatch,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { TournamentEvent, DeckSubmission, ALL_SETS, EventType, Placement } from '../types';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Search, 
  ChevronRight, 
  Calendar, 
  Trophy, 
  User,
  CheckCircle,
  XCircle,
  Clock,
  Layout,
  Filter,
  Eye,
  ChevronLeft,
  Layers,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ProgressiveImage } from './ProgressiveImage';

interface TournamentManagerProps {
  onClose: () => void;
  showToast?: (message: string) => void;
}

export const TournamentManager: React.FC<TournamentManagerProps> = ({ onClose, showToast }) => {
  const [events, setEvents] = useState<TournamentEvent[]>([]);
  const [submissions, setSubmissions] = useState<DeckSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'submissions'>('events');
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Partial<TournamentEvent> | null>(null);
  const [editingSubmissionData, setEditingSubmissionData] = useState<Partial<DeckSubmission> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [seasonFilter, setSeasonFilter] = useState<string>("All");
  const [selectedSubmission, setSelectedSubmission] = useState<DeckSubmission | null>(null);
  const [focusedEvent, setFocusedEvent] = useState<TournamentEvent | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<DeckSubmission | null>(null);

  useEffect(() => {
    const qEvents = query(collection(db, 'tournament_events'), orderBy('date', 'desc'));
    const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
      const eventsData: TournamentEvent[] = [];
      snapshot.forEach((doc) => {
        eventsData.push(doc.data() as TournamentEvent);
      });
      setEvents(eventsData);
      setLoading(false);
    });

    const qSubmissions = query(collection(db, 'deck_submissions'), orderBy('createdAt', 'desc'));
    const unsubscribeSubmissions = onSnapshot(qSubmissions, (snapshot) => {
      const subsData: DeckSubmission[] = [];
      snapshot.forEach((doc) => {
        // Use document ID from snapshot in case it's missing in data
        const data = doc.data() as DeckSubmission;
        subsData.push({ ...data, id: doc.id });
      });
      setSubmissions(subsData);
    }, (err) => {
      console.error("Submissions listener error:", err);
    });

    return () => {
      unsubscribeEvents();
      unsubscribeSubmissions();
    };
  }, []);

  const handleSaveEvent = async () => {
    if (!editingEvent || !editingEvent.name || !editingEvent.season || !editingEvent.date) {
      alert("Please fill all required fields");
      return;
    }

    const eventId = editingEvent.id || `event-${Date.now()}`;
    const newEvent: TournamentEvent = {
      id: eventId,
      name: editingEvent.name,
      season: editingEvent.season,
      date: editingEvent.date,
      type: 'Organized Event'
    };

    try {
      await setDoc(doc(db, 'tournament_events', eventId), newEvent);
      setEditingEvent(null);
      setShowEventForm(false);
      showToast?.("Event saved successfully");
    } catch (err) {
      console.error("Error saving event:", err);
      alert("Failed to save event");
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!id) return;

    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      showToast?.("Click again to confirm event delete");
      setTimeout(() => setConfirmDeleteId(prev => prev === id ? null : prev), 3000);
      return;
    }

    setIsDeleting(id);
    setConfirmDeleteId(null);
    try {
      await deleteDoc(doc(db, 'tournament_events', id));
      showToast?.("Event deleted");
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Failed to delete event");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleUpdateSubmissionStatus = async (id: string, status: DeckSubmission['status']) => {
    try {
      await updateDoc(doc(db, 'deck_submissions', id), { status });
      showToast?.(`Submission ${status}`);
    } catch (err) {
      console.error("Error updating submission:", err);
      alert("Failed to update status");
    }
  };

  const handleDeleteSubmission = async (id: string) => {
    console.log("Attempting to delete submission with ID:", id);
    if (!id) {
      console.error("No ID provided to handleDeleteSubmission");
      showToast?.("Error: Missing submission ID");
      return;
    }
    
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      showToast?.("Click again to confirm delete");
      setTimeout(() => setConfirmDeleteId(prev => prev === id ? null : prev), 3000);
      return;
    }
    
    console.log("Confirmed delete for ID:", id);
    setIsDeleting(id);
    setConfirmDeleteId(null);
    try {
      await deleteDoc(doc(db, 'deck_submissions', id));
      showToast?.("Submission deleted successfully");
      console.log("Delete successful for ID:", id);
    } catch (err) {
      console.error("Error deleting submission:", err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`Failed to delete submission: ${errorMsg}`);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSaveSubmission = async () => {
    if (!editingSubmissionData || !editingSubmissionData.id) return;
    try {
      await updateDoc(doc(db, 'deck_submissions', editingSubmissionData.id), {
        deckName: editingSubmissionData.deckName,
        playerName: editingSubmissionData.playerName,
        placement: editingSubmissionData.placement,
        eventType: editingSubmissionData.eventType,
        updatedAt: new Date().toISOString()
      });
      setEditingSubmissionData(null);
    } catch (err) {
      console.error("Error saving submission:", err);
      alert("Failed to save changes");
    }
  };

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeason = seasonFilter === "All" || e.season === seasonFilter;
    return matchesSearch && matchesSeason;
  });

  const filteredSubmissions = submissions.filter(s => {
    const matchesSearch = s.deckName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.playerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeason = seasonFilter === "All" || s.season === seasonFilter;
    return matchesSearch && matchesSeason;
  });

  const seasons = ["GD01", "GD02", "GD03", "GD04"];

  return (
    <div className="fixed inset-0 z-50 bg-[#F9F9F7] flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-300">
      <header className="bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (focusedEvent) setFocusedEvent(null);
              else onClose();
            }} 
            className="p-2 hover:bg-stone-50 rounded-full transition-colors"
          >
            {focusedEvent ? <ChevronLeft size={20} className="text-stone-600" /> : <X size={20} className="text-stone-600" />}
          </button>
          <h2 className="text-lg font-black tracking-tight text-stone-900">
            {focusedEvent ? focusedEvent.name : "Tournament Decks Manager"}
          </h2>
        </div>
        {!focusedEvent && (
          <button 
            onClick={() => {
              setEditingEvent({ type: 'Organized Event', season: 'GD04', date: new Date().toISOString().split('T')[0] });
              setShowEventForm(true);
            }}
            className="flex items-center gap-2 bg-[#E5E5E0] hover:bg-[#DEDECB] text-stone-900 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
          >
            <Plus size={16} />
            Create new event
          </button>
        )}
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        {focusedEvent ? (
          <div className="bg-white border-b border-stone-100 p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-stone-100 rounded-2xl">
                <Trophy size={24} className="text-stone-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{focusedEvent.season} • {new Date(focusedEvent.date).toLocaleDateString()}</p>
                <h3 className="font-bold text-stone-900">{focusedEvent.name}</h3>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border-b border-stone-100 p-4 space-y-4">
            <div className="flex gap-1 p-1 bg-stone-100 rounded-xl w-fit">
              <button 
                onClick={() => setActiveTab('events')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                  activeTab === 'events' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                )}
              >
                Organized Events
              </button>
              <button 
                onClick={() => setActiveTab('submissions')}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                  activeTab === 'submissions' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
                )}
              >
                Submissions
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input 
                  type="text"
                  placeholder="Search events or decks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-stone-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-stone-200 outline-none"
                />
              </div>
              <div className="flex gap-2 bg-stone-100 p-1 rounded-xl">
                <button 
                  onClick={() => setSeasonFilter("All")}
                  className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all", seasonFilter === "All" ? "bg-white shadow-sm" : "text-stone-500")}
                >
                  All
                </button>
                {seasons.map(s => (
                  <button 
                    key={s}
                    onClick={() => setSeasonFilter(s)}
                    className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all", seasonFilter === s ? "bg-white shadow-sm" : "text-stone-500")}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4">
          {focusedEvent ? (
            <div className="space-y-4">
              {submissions.filter(s => s.tournamentName === focusedEvent.name).map(sub => (
                <div key={sub.id} className="bg-white p-4 rounded-3xl border border-stone-100 shadow-sm flex flex-col md:flex-row gap-4">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-stone-100">
                    {sub.coverImageUrl ? (
                      <ProgressiveImage src={sub.coverImageUrl} imageClassName="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <Layout size={32} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-bold text-stone-900 truncate">{sub.deckName}</h3>
                      <div className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1",
                        sub.status === 'approved' ? "bg-green-100 text-green-700" :
                        sub.status === 'rejected' ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      )}>
                        {sub.status === 'pending' && <Clock size={10} />}
                        {sub.status === 'approved' && <CheckCircle size={10} />}
                        {sub.status === 'rejected' && <XCircle size={10} />}
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                      <div className="text-[10px] text-stone-500 truncate flex items-center gap-1">
                        <User size={10} /> {sub.playerName}
                      </div>
                      <div className="text-[10px] text-stone-500 truncate flex items-center gap-1">
                        <Trophy size={10} /> {sub.placement}
                      </div>
                      <div className="text-[10px] text-stone-500 truncate flex items-center gap-1">
                        <Filter size={10} /> {sub.eventType}
                      </div>
                      <div className="text-[10px] text-stone-500 truncate flex items-center gap-1">
                        <Clock size={10} /> {new Date(sub.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex md:flex-col gap-2 mt-2 md:mt-0 md:justify-center">
                    <button 
                      onClick={() => setSelectedSubmission(sub)}
                      className="flex-1 md:flex-none p-2 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors"
                      title="Preview Deck"
                    >
                      <Eye size={18} className="mx-auto" />
                    </button>
                    <button 
                      onClick={() => setEditingSubmissionData(sub)}
                      className="flex-1 md:flex-none p-2 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors"
                      title="Edit Submission"
                    >
                      <Edit2 size={18} className="mx-auto" />
                    </button>
                    {sub.status !== 'approved' && (
                      <button 
                        onClick={() => handleUpdateSubmissionStatus(sub.id, 'approved')}
                        className="flex-1 md:flex-none p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-md shadow-green-100"
                        title="Approve"
                      >
                        <CheckCircle size={18} className="mx-auto" />
                      </button>
                    )}
                    {sub.status !== 'rejected' && (
                      <button 
                        onClick={() => handleUpdateSubmissionStatus(sub.id, 'rejected')}
                        className="flex-1 md:flex-none p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-md shadow-red-100"
                        title="Reject"
                      >
                        <XCircle size={18} className="mx-auto" />
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSubmission(sub.id);
                      }}
                      disabled={isDeleting === sub.id}
                      className={cn(
                        "flex-1 md:flex-none p-2 rounded-xl transition-all duration-200",
                        isDeleting === sub.id 
                          ? "bg-stone-50 opacity-50 cursor-not-allowed" 
                          : confirmDeleteId === sub.id
                            ? "bg-red-500 text-white animate-pulse shadow-lg scale-105"
                            : "bg-stone-100 text-stone-600 hover:bg-red-50 hover:text-red-500"
                      )}
                      title={confirmDeleteId === sub.id ? "Confirm Delete" : "Delete"}
                    >
                      {isDeleting === sub.id ? (
                        <Loader2 size={18} className="mx-auto animate-spin" />
                      ) : (
                        <Trash2 size={18} className="mx-auto" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
              {submissions.filter(s => s.tournamentName === focusedEvent.name).length === 0 && (
                <div className="text-center py-20 px-6">
                  <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Layout size={32} className="text-stone-300" />
                  </div>
                  <h3 className="font-bold text-stone-900 mb-1">No decks recorded</h3>
                  <p className="text-sm text-stone-500">This event doesn't have any approved deck submissions yet.</p>
                </div>
              )}
            </div>
          ) : activeTab === 'events' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvents.map(event => (
                <div 
                  key={event.id} 
                  onClick={() => setFocusedEvent(event)}
                  className="bg-white p-4 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-all group cursor-pointer active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-3 bg-stone-100 rounded-2xl">
                      <Trophy size={24} className="text-stone-400" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => {
                          setEditingEvent(event);
                          setShowEventForm(true);
                        }}
                        className="p-2 hover:bg-stone-100 rounded-full text-stone-500 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteEvent(event.id)}
                        disabled={isDeleting === event.id}
                        className={cn(
                          "p-2 rounded-full transition-all duration-200",
                          isDeleting === event.id
                            ? "opacity-50 cursor-not-allowed"
                            : confirmDeleteId === event.id
                              ? "bg-red-500 text-white animate-pulse scale-110 shadow-lg"
                              : "hover:bg-red-50 text-stone-400 hover:text-red-500"
                        )}
                        title={confirmDeleteId === event.id ? "Confirm Delete" : "Delete Event"}
                      >
                        {isDeleting === event.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                  <h3 className="font-bold text-stone-900 group-hover:text-stone-700 transition-colors">{event.name}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-stone-100 rounded-lg text-[10px] font-black tracking-widest text-stone-500 uppercase">{event.season}</span>
                    <span className="px-2 py-1 bg-stone-100 rounded-lg text-[10px] font-bold text-stone-500 flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(event.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-stone-50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                      {submissions.filter(s => s.tournamentName === event.name).length} Decks
                    </span>
                    <ChevronRight size={16} className="text-stone-300 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map(sub => (
                <div key={sub.id} className="bg-white p-4 rounded-3xl border border-stone-100 shadow-sm flex flex-col md:flex-row gap-4">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-stone-100">
                    {sub.coverImageUrl ? (
                      <ProgressiveImage src={sub.coverImageUrl} imageClassName="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-400">
                        <Layout size={32} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-bold text-stone-900 truncate">{sub.deckName}</h3>
                      <div className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1",
                        sub.status === 'approved' ? "bg-green-100 text-green-700" :
                        sub.status === 'rejected' ? "bg-red-100 text-red-700" :
                        "bg-amber-100 text-amber-700"
                      )}>
                        {sub.status === 'pending' && <Clock size={10} />}
                        {sub.status === 'approved' && <CheckCircle size={10} />}
                        {sub.status === 'rejected' && <XCircle size={10} />}
                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                      <div className="text-[10px] text-stone-500 truncate flex items-center gap-1">
                        <User size={10} /> {sub.playerName}
                      </div>
                      <div className="text-[10px] text-stone-500 truncate flex items-center gap-1">
                        <Trophy size={10} /> {sub.placement}
                      </div>
                      <div className="text-[10px] text-stone-500 truncate flex items-center gap-1">
                        <Filter size={10} /> {sub.eventType}
                      </div>
                      <div className="text-[10px] text-stone-500 truncate flex items-center gap-1">
                        <Clock size={10} /> {new Date(sub.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {sub.tournamentName && (
                      <div className="mt-2 text-[10px] font-bold text-stone-600 bg-stone-50 p-2 rounded-xl border border-stone-100">
                        Event: {sub.tournamentName}
                      </div>
                    )}
                  </div>
                  <div className="flex md:flex-col gap-2 mt-2 md:mt-0 md:justify-center">
                    <button 
                      onClick={() => setSelectedSubmission(sub)}
                      className="flex-1 md:flex-none p-2 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors"
                      title="Preview Deck"
                    >
                      <Eye size={18} className="mx-auto" />
                    </button>
                    {sub.status !== 'approved' && (
                      <button 
                        onClick={() => handleUpdateSubmissionStatus(sub.id, 'approved')}
                        className="flex-1 md:flex-none p-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors shadow-md shadow-green-100"
                        title="Approve"
                      >
                        <CheckCircle size={18} className="mx-auto" />
                      </button>
                    )}
                    {sub.status !== 'rejected' && (
                      <button 
                        onClick={() => handleUpdateSubmissionStatus(sub.id, 'rejected')}
                        className="flex-1 md:flex-none p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-md shadow-red-100"
                        title="Reject"
                      >
                        <XCircle size={18} className="mx-auto" />
                      </button>
                    )}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSubmission(sub.id);
                      }}
                      disabled={isDeleting === sub.id}
                      className={cn(
                        "flex-1 md:flex-none p-2 rounded-xl transition-all duration-200",
                        isDeleting === sub.id 
                          ? "opacity-50 cursor-not-allowed" 
                          : confirmDeleteId === sub.id
                            ? "bg-red-500 text-white animate-pulse shadow-lg scale-105"
                            : "bg-stone-100 text-stone-600 hover:bg-red-50 hover:text-red-500"
                      )}
                      title={confirmDeleteId === sub.id ? "Confirm Delete" : "Delete"}
                    >
                      {isDeleting === sub.id ? (
                        <Loader2 size={18} className="mx-auto animate-spin" />
                      ) : (
                        <Trash2 size={18} className="mx-auto" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Edit Submission Form Modal */}
      {editingSubmissionData && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <header className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-stone-900 uppercase tracking-tight">Edit Deck Metadata</h3>
              <button 
                onClick={() => setEditingSubmissionData(null)}
                className="p-2 hover:bg-stone-50 rounded-full text-stone-400"
              >
                <X size={20} />
              </button>
            </header>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">Deck Name</label>
                <input 
                  type="text"
                  value={editingSubmissionData.deckName || ""}
                  onChange={(e) => setEditingSubmissionData(prev => ({ ...prev, deckName: e.target.value }))}
                  className="w-full px-4 py-3 bg-stone-100 border-none rounded-2xl text-sm font-bold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">Player Name</label>
                  <input 
                    type="text"
                    value={editingSubmissionData.playerName || ""}
                    onChange={(e) => setEditingSubmissionData(prev => ({ ...prev, playerName: e.target.value }))}
                    className="w-full px-4 py-3 bg-stone-100 border-none rounded-2xl text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">Placement (1-32)</label>
                  <input 
                    type="number"
                    min="1"
                    max="32"
                    value={(editingSubmissionData.placement || "Top 1").replace('Top ', '')}
                    onChange={(e) => {
                      const val = Math.min(32, Math.max(1, parseInt(e.target.value) || 1));
                      setEditingSubmissionData(prev => ({ ...prev, placement: `Top ${val}` }));
                    }}
                    className="w-full px-4 py-3 bg-stone-100 border-none rounded-2xl text-sm font-bold"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">Event Type</label>
                <select 
                  value={editingSubmissionData.eventType || "Shop Battle"}
                  onChange={(e) => setEditingSubmissionData(prev => ({ ...prev, eventType: e.target.value as EventType }))}
                  className="w-full px-4 py-3 bg-stone-100 border-none rounded-2xl text-sm font-bold appearance-none"
                >
                  <option value="Shop Battle">Shop Battle</option>
                  <option value="Newtype challenge">Newtype challenge</option>
                  <option value="Organized Event">Organized Event</option>
                </select>
              </div>
              <button 
                onClick={handleSaveSubmission}
                className="w-full py-4 bg-stone-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-stone-100 active:scale-95 transition-all mt-4"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Detail Preview Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-[100] bg-[#F9F9F7] flex flex-col animate-in slide-in-from-bottom duration-300">
          <header className="bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
            <button onClick={() => setSelectedSubmission(null)} className="p-2 hover:bg-stone-50 rounded-full">
              <ChevronLeft size={24} />
            </button>
            <h2 className="text-lg font-black tracking-tight text-stone-900">Preview submission</h2>
            <div className="flex gap-2">
              <button 
                onClick={async () => {
                  await handleDeleteSubmission(selectedSubmission.id);
                  if (confirmDeleteId === selectedSubmission.id) {
                    setSelectedSubmission(null);
                  }
                }}
                disabled={isDeleting === selectedSubmission.id}
                className={cn(
                  "p-2 rounded-full transition-all duration-200 mr-2",
                  isDeleting === selectedSubmission.id 
                    ? "opacity-50 cursor-not-allowed" 
                    : confirmDeleteId === selectedSubmission.id
                      ? "bg-red-500 text-white animate-pulse scale-110 shadow-lg"
                      : "text-stone-400 hover:bg-red-50 hover:text-red-500"
                )}
                title={confirmDeleteId === selectedSubmission.id ? "Confirm Delete" : "Delete Submission"}
              >
                {isDeleting === selectedSubmission.id ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <Trash2 size={24} />
                )}
              </button>
              {selectedSubmission.status !== 'approved' && (
                <button 
                  onClick={() => {
                    handleUpdateSubmissionStatus(selectedSubmission.id, 'approved');
                    setSelectedSubmission(null);
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-green-100"
                >
                  Approve
                </button>
              )}
              {selectedSubmission.status !== 'rejected' && (
                <button 
                  onClick={() => {
                    handleUpdateSubmissionStatus(selectedSubmission.id, 'rejected');
                    setSelectedSubmission(null);
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-100"
                >
                  Reject
                </button>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto pb-24">
            <div className="max-w-3xl mx-auto px-6 py-8">
              <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 border border-stone-100">
                <div className="flex flex-col md:flex-row gap-8 mb-8 pb-8 border-b border-stone-50">
                  <div className="w-32 h-32 rounded-3xl overflow-hidden bg-stone-100 flex-shrink-0">
                    {selectedSubmission.coverImageUrl ? (
                      <ProgressiveImage src={selectedSubmission.coverImageUrl} imageClassName="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300">
                        <Layout size={48} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-black text-stone-900 mb-2 uppercase tracking-tight">{selectedSubmission.deckName}</h1>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Player</p>
                        <p className="font-bold text-stone-700">{selectedSubmission.playerName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Placement</p>
                        <p className="font-bold text-stone-700">{selectedSubmission.placement}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Event Type</p>
                        <p className="font-bold text-stone-700">{selectedSubmission.eventType}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Date</p>
                        <p className="font-bold text-stone-700">{new Date(selectedSubmission.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-black text-stone-900 mb-6 flex items-center gap-2">
                  <Layers size={20} className="text-stone-400" />
                  Decklist
                </h2>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {(() => {
                    const typeOrder: Record<string, number> = { 'Unit': 0, 'Pilot': 1, 'Command': 2, 'Base': 3 };
                    const sortedItems = [...selectedSubmission.deckItems].sort((a, b) => {
                      const aType = a.card.type[0] || 'Unit';
                      const bType = b.card.type[0] || 'Unit';
                      
                      if (typeOrder[aType] !== typeOrder[bType]) {
                        return typeOrder[aType] - typeOrder[bType];
                      }
                      
                      const aLevel = Number(a.card.level) || 0;
                      const bLevel = Number(b.card.level) || 0;
                      
                      return aLevel - bLevel;
                    });

                    return sortedItems.map((item, idx) => (
                      <div key={idx} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 flex flex-col group">
                        <div className="relative aspect-[2/3] bg-stone-50 overflow-hidden">
                          <ProgressiveImage 
                            src={item.card.imageUrl} 
                            imageClassName="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                          />
                          <div className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-[#141414]/90 backdrop-blur-sm text-white flex items-center justify-center text-[10px] font-black shadow-lg">
                            x{item.count}
                          </div>
                        </div>
                        <div className="p-2">
                          <p className="text-[8px] font-bold text-stone-400 mb-0.5 leading-none">{item.card.cardNumber}</p>
                          <h4 className="text-[10px] font-black text-stone-900 truncate leading-tight uppercase tracking-tight">{item.card.name}</h4>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEventForm && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <header className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-stone-900">
                {editingEvent?.id ? "Edit Event" : "Create Event"}
              </h3>
              <button 
                onClick={() => {
                  setShowEventForm(false);
                  setEditingEvent(null);
                }}
                className="p-2 hover:bg-stone-50 rounded-full text-stone-400"
              >
                <X size={20} />
              </button>
            </header>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">Event Name</label>
                <input 
                  type="text"
                  value={editingEvent?.name || ""}
                  onChange={(e) => setEditingEvent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Battle Bunker local event"
                  className="w-full px-4 py-3 bg-stone-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-stone-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">Season</label>
                  <select 
                    value={editingEvent?.season || "GD04"}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, season: e.target.value }))}
                    className="w-full px-4 py-3 bg-stone-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-stone-200 appearance-none"
                  >
                    {seasons.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest pl-1">Event Date</label>
                  <input 
                    type="date"
                    value={editingEvent?.date || ""}
                    onChange={(e) => setEditingEvent(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 bg-stone-100 border-none rounded-2xl text-sm focus:ring-2 focus:ring-stone-200"
                  />
                </div>
              </div>

              <button 
                onClick={handleSaveEvent}
                className="w-full py-4 bg-[#141414] text-white rounded-2xl font-black text-sm shadow-xl shadow-stone-200 transition-all hover:bg-stone-800 active:scale-95"
              >
                Save Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
