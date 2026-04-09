import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { GundamCard, FeedbackCategory, Feedback } from '../types';
import { auth, db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface CardFeedbackPopupProps {
  card: GundamCard;
  onClose: () => void;
}

const CATEGORIES: FeedbackCategory[] = [
  'Incorrect ability effect',
  'Incorrect color',
  'Incorrect/Missing links',
  'Incorrect stats',
  'Incorrect ID number',
  'Incorrect trait',
  'Other'
];

export const CardFeedbackPopup: React.FC<CardFeedbackPopupProps> = ({ card, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const feedbackData: Omit<Feedback, 'id'> = {
        uid: auth.currentUser?.uid || 'anonymous',
        userEmail: auth.currentUser?.email || 'anonymous',
        userName: auth.currentUser?.displayName || 'Anonymous',
        category: selectedCategory,
        message: message.trim(),
        cardId: card.id,
        cardName: card.name,
        createdAt: Date.now(),
        status: 'New'
      };

      const path = 'card_feedback';
      try {
        await addDoc(collection(db, path), feedbackData);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
      
      setIsSubmitted(true);
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      // Try to parse the JSON error if it's from handleFirestoreError
      let displayError = 'Failed to submit feedback. Please try again.';
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error.includes('Missing or insufficient permissions')) {
          displayError = 'Permission denied. Please make sure you are logged in or try again later.';
        }
      } catch (e) {
        // Not a JSON error
      }
      setError(displayError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-[#141414]">Card Feedback</h3>
              <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">{card.name} • {card.cardNumber}</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-400 hover:text-stone-600"
            >
              <X size={20} />
            </button>
          </div>

          {isSubmitted ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-black text-[#141414]">Thank You!</h4>
                <p className="text-stone-500 text-sm">Your feedback helps us improve the database.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">What's the issue?</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "px-3 py-2 rounded-xl text-xs font-bold transition-all border",
                        selectedCategory === cat 
                          ? "bg-amber-500 text-white border-amber-500 shadow-md scale-105" 
                          : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Additional Details</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Tell us more about the issue..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 h-32 resize-none leading-relaxed"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-50 p-3 rounded-xl border border-red-100">
                  <AlertCircle size={14} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !selectedCategory}
                className={cn(
                  "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all",
                  isSubmitting || !selectedCategory
                    ? "bg-stone-100 text-stone-400 cursor-not-allowed"
                    : "bg-[#141414] text-white hover:bg-stone-800 shadow-lg active:scale-[0.98]"
                )}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Submit Feedback
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
