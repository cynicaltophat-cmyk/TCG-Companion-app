export type ArtVariantType = string;

export interface ArtVariant {
  type: ArtVariantType;
  imageUrl: string;
  artist?: string;
  artistLink?: string;
}

export interface GundamCard {
  id: string;
  name: string;
  set: string;
  cardNumber: string;
  type: "Unit" | "Pilot" | "Command" | "Base";
  color: "Red" | "Blue" | "Green" | "White" | "Black" | "Yellow" | "Purple";
  rarity: "C" | "U" | "R" | "SR" | "UR" | "LR";
  cost: number;
  level?: number;
  ap?: number;
  hp?: number;
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
  "GD 04",
  "GD03",
  "GD02",
  "GD01",
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
