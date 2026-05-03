export type ArtVariantType = string;

export interface ArtVariant {
  type: ArtVariantType;
  imageUrl: string;
  artist?: string;
  artistLink?: string;
}

export type CardType = "Unit" | "Pilot" | "Command" | "Base";

export interface GundamCard {
  id: string;
  name: string;
  set: string;
  cardNumber: string;
  type: CardType[];
  color: "Red" | "Blue" | "Green" | "White" | "Purple";
  rarity: "C" | "U" | "R" | "LR";
  cost: string | number;
  level?: string | number;
  ap?: string | number;
  hp?: string | number;
  ability: string;
  imageUrl: string;
  link?: string;
  baseArtist?: string;
  baseArtistLink?: string;
  altImageUrl?: string;
  altArtist?: string;
  altArtistLink?: string;
  variants?: ArtVariant[];
  traits?: string[];
  zones?: string[];
  doublePlus?: boolean;
  championshipParticipation?: boolean;
  faq?: { question: string; answer: string }[];
}

export const ALL_SETS = [
  "GD04",
  "ST09",
  "ST08",
  "ST07",
  "ST06",
  "ST05",
  "ST04",
  "ST03",
  "ST02",
  "ST01"
];

export interface Product {
  id: string;
  name: string;
  category: "Starter Deck" | "Booster box" | "Other";
  imageUrl: string;
  releaseDate: string;
  msrp: string;
  whereToBuy: { name: string; url: string }[];
  featuredCards: { cardId: string; count: number }[];
  contents: string[];
  order: number;
}

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
  coverImageUrl?: string;
  folderId?: string | null;
}

export interface DeckFolder {
  id: string;
  uid: string;
  name: string;
  icon?: string;
  createdAt: number;
}

export interface TournamentEvent {
  id: string;
  name: string;
  season: string;
  date: string;
  type: 'Organized Event';
}

export type EventType = 'Shop Battle' | 'Newtype challenge' | 'Organized Event';
export type Placement = string;
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface DeckSubmission {
  id: string;
  uid: string;
  deckId: string;
  deckName: string;
  deckItems: DeckItem[];
  coverImageUrl?: string;
  playerName: string;
  season: string;
  eventType: EventType;
  tournamentId?: string; 
  tournamentName?: string;
  date: string;
  placement: Placement;
  createdAt: number;
  status: SubmissionStatus;
}

export type FeedbackCategory = 
  | 'Incorrect ability effect' 
  | 'Incorrect color' 
  | 'Incorrect/Missing links' 
  | 'Incorrect stats' 
  | 'Incorrect ID number' 
  | 'Incorrect trait' 
  | 'Other'
  | 'Bug' 
  | 'Feature Request' 
  | 'General';

export type FeedbackStatus = 'New' | 'In Progress' | 'Resolved' | 'Closed';

export interface Feedback {
  id: string;
  uid: string;
  userEmail?: string;
  userName?: string;
  category: FeedbackCategory;
  message: string;
  cardId?: string;
  cardName?: string;
  createdAt: number;
  status: FeedbackStatus;
  _collection?: 'feedback' | 'card_feedback';
}
