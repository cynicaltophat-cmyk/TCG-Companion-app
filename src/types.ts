import { GundamCard, ArtVariantType } from './data/cards';

export interface DeckItem {
  card: GundamCard;
  count: number;
  artType: ArtVariantType;
}

export interface Deck {
  id: string;
  name: string;
  items: DeckItem[];
  lastModified: number;
}

export type MatchNature = 'Free & Casual' | 'Shop battle' | 'Newtype challenge';

export interface DeckSnapshot {
  id: string;
  name: string;
  items: DeckItem[];
}

export interface MatchRound {
  id: string;
  roundNumber: number;
  myDeckSnapshot: DeckSnapshot;
  opponentDeckName: string;
  opponentColors: string[];
  result: 'Win' | 'Lose';
  notes: string;
}

export interface MatchEntry {
  id: string;
  nature: MatchNature;
  shopName: string;
  date: string;
  rounds: MatchRound[];
  createdAt: number;
}

export type FeedbackCategory = 'Bug' | 'Feature Request' | 'General' | 'Other';
export type FeedbackStatus = 'New' | 'In Progress' | 'Resolved' | 'Closed';

export interface Feedback {
  id: string;
  uid: string;
  userEmail?: string;
  userName?: string;
  category: FeedbackCategory;
  message: string;
  createdAt: number;
  status: FeedbackStatus;
}
