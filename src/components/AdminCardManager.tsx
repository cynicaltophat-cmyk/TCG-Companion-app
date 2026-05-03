import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { GundamCard, ALL_SETS, ArtVariantType, ArtVariant, Feedback } from '../types';
import { analyzeCardImage } from '../services/geminiService';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Upload, 
  Loader2, 
  Info,
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronRight,
  ChevronDown,
  Image as ImageIcon,
  Palette,
  Sparkles,
  Trophy,
  FileJson,
  Download,
  Link2,
  Flag,
  Tag,
  MessageSquare
} from 'lucide-react';
import { cn } from '../lib/utils';

interface AdminCardManagerProps {
  onClose: () => void;
  adminFeedback: Feedback[];
  onUpdateFeedbackStatus: (id: string, status: Feedback['status']) => void;
  initialCardId?: string | null;
}

export const AdminCardManager: React.FC<AdminCardManagerProps> = ({ onClose, adminFeedback, onUpdateFeedbackStatus, initialCardId }) => {
  const [cards, setCards] = useState<GundamCard[]>([]);
  const mainRef = React.useRef<HTMLElement>(null);
  const abilityRef = React.useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [editingCard, setEditingCard] = useState<Partial<GundamCard> | null>(null);
  const [cardToDelete, setCardToDelete] = useState<GundamCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [traitsInput, setTraitsInput] = useState("");
  const [lastEditingId, setLastEditingId] = useState<string | null>(null);
  const [traitSuggestions, setTraitSuggestions] = useState<string[]>([]);
  const [showTraitSuggestions, setShowTraitSuggestions] = useState(false);
  const [linkSuggestions, setLinkSuggestions] = useState<string[]>([]);
  const [showLinkSuggestions, setShowLinkSuggestions] = useState(false);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [showOnlyFlagged, setShowOnlyFlagged] = useState(false);
  const [activeArtTab, setActiveArtTab] = useState<string | number>('Base art');

  useEffect(() => {
    console.log("Initializing AdminCardManager listener...");
    const q = query(collection(db, 'cards'), orderBy('cardNumber', 'asc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log(`Received snapshot with ${snapshot.size} cards`);
        const cardsData: GundamCard[] = [];
        snapshot.forEach((doc) => {
          cardsData.push(doc.data() as GundamCard);
        });
        setCards(cardsData);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore snapshot error:", error);
        setLoading(false);
        alert(`Error loading cards: ${error.message}`);
      }
    );
    return () => unsubscribe();
  }, []);

  const allUniqueTraits = React.useMemo(() => {
    const set = new Set<string>();
    cards.forEach(c => {
      c.traits?.forEach(t => set.add(t));
    });
    return Array.from(set).sort();
  }, [cards]);

  const allUniqueLinks = React.useMemo(() => {
    const set = new Set<string>();
    cards.forEach(c => {
      if (c.link) set.add(c.link);
    });
    return Array.from(set).sort();
  }, [cards]);

  useEffect(() => {
    if (initialCardId && cards.length > 0) {
      const card = cards.find(c => c.id === initialCardId);
      if (card) {
        setEditingCard(card);
        setTraitsInput(card.traits?.join(', ') || '');
        setLastEditingId(card.id);
        setActiveArtTab('Base art');
        setShowForm(true);
      }
    }
  }, [initialCardId, cards]);

  // Sync traits input when editing card changes
  useEffect(() => {
    if (editingCard?.id && editingCard.id !== lastEditingId) {
      setTraitsInput(editingCard.traits?.join(', ') || '');
      setLastEditingId(editingCard.id);
    } else if (!editingCard?.id && lastEditingId !== null) {
      setTraitsInput("");
      setLastEditingId(null);
    }
  }, [editingCard?.id, lastEditingId]);

  const importST02Cards = async () => {
    const st02Cards: GundamCard[] = [
      {
        id: "st02-003",
        name: "Gundam Heavyarms",
        set: "ST02",
        cardNumber: "ST02-003",
        type: ["Unit"],
        color: "Green",
        rarity: "C",
        cost: 3,
        level: 5,
        ap: 3,
        hp: 4,
        ability: "【During Pair】 During your turn, when this Unit destroys an enemy Unit with battle damage, deal 1 damage to all enemy Units that are Lv.3 or lower.",
        imageUrl: "https://images.gundam-tcg.com/cards/ST02-003.png",
        traits: ["Operation Meteor"],
        link: "[Trowa Barton]"
      },
      {
        id: "st02-004",
        name: "Gundam Sandrock",
        set: "ST02",
        cardNumber: "ST02-004",
        type: ["Unit"],
        color: "Green",
        rarity: "C",
        cost: 2,
        level: 4,
        ap: 4,
        hp: 3,
        ability: "",
        imageUrl: "https://images.gundam-tcg.com/cards/ST02-004.png",
        traits: ["Operation Meteor"],
        link: "[Quatre Raberba Winner]"
      },
      {
        id: "st02-005",
        name: "Maganac",
        set: "ST02",
        cardNumber: "ST02-005",
        type: ["Unit"],
        color: "Green",
        rarity: "C",
        cost: 2,
        level: 2,
        ap: 3,
        hp: 2,
        ability: "",
        imageUrl: "https://images.gundam-tcg.com/cards/ST02-005.png",
        traits: ["Maganac Corps"]
      },
      {
        id: "st02-006",
        name: "Tallgeese",
        set: "ST02",
        cardNumber: "ST02-006",
        type: ["Unit"],
        color: "Blue",
        rarity: "LR",
        cost: 4,
        level: 5,
        ap: 4,
        hp: 4,
        ability: "【Activate・Main】 【Once per Turn】 4: Set this Unit as active.",
        imageUrl: "https://images.gundam-tcg.com/cards/ST02-006.png",
        traits: ["OZ"],
        link: "[Zechs Merquise]"
      },
      {
        id: "st02-007",
        name: "Leo",
        set: "ST02",
        cardNumber: "ST02-007",
        type: ["Unit"],
        color: "Blue",
        rarity: "C",
        cost: 2,
        level: 2,
        ap: 2,
        hp: 2,
        ability: "",
        imageUrl: "https://images.gundam-tcg.com/cards/ST02-007.png",
        traits: ["OZ"],
        link: "(OZ) Trait"
      },
      {
        id: "st02-008",
        name: "Aries",
        set: "ST02",
        cardNumber: "ST02-008",
        type: ["Unit"],
        color: "Blue",
        rarity: "C",
        cost: 2,
        level: 2,
        ap: 2,
        hp: 1,
        ability: "【Blocker】 (Rest this Unit to change the attack target to it.)",
        imageUrl: "https://images.gundam-tcg.com/cards/ST02-008.png",
        traits: ["OZ"],
        link: "(OZ)"
      },
      {
        id: "st02-009",
        name: "Tragos",
        set: "ST02",
        cardNumber: "ST02-009",
        type: ["Unit"],
        color: "Blue",
        rarity: "C",
        cost: 1,
        level: 1,
        ap: 1,
        hp: 1,
        ability: "【Blocker】 (Rest this Unit to change the attack target to it.)",
        imageUrl: "https://images.gundam-tcg.com/cards/ST02-009.png",
        traits: ["OZ"],
        link: "(OZ)"
      },
      {
        id: "st02-011",
        name: "Zechs Merquise",
        set: "ST02",
        cardNumber: "ST02-011",
        type: ["Pilot"],
        color: "Blue",
        rarity: "C",
        cost: 1,
        level: 5,
        ap: "+2",
        hp: "+1",
        ability: "【Burst】 Add this card to your hand. 【During Link】 During your turn, when this Unit destroys an enemy Unit with battle damage, draw 1.",
        imageUrl: "https://images.gundam-tcg.com/cards/ST02-011.png",
        traits: ["OZ"]
      },
      {
        id: "st02-012",
        name: "Simultaneous Fire",
        set: "ST02",
        cardNumber: "ST02-012",
        type: ["Command"],
        color: "Green",
        rarity: "C",
        cost: 1,
        level: 4,
        ap: "+1",
        hp: "+1",
        ability: "【Main】 Choose 1 of your Units. It gains 【Breach 3】 during this turn. (When this Unit's attack destroys an enemy Unit, deal the specified amount of damage to the first card in that opponent's shield area.)",
        imageUrl: "https://images.gundam-tcg.com/cards/ST02-012.png",
        link: "Trowa Barton (Operation Meteor)"
      },
      {
        id: "st02-013",
        name: "Peaceful Timbre",
        set: "ST02",
        cardNumber: "ST02-013",
        type: ["Command"],
        color: "Green",
        rarity: "C",
        cost: 1,
        level: 4,
        ap: "+1",
        hp: "+1",
        ability: "【Action】 During this battle, your shield area cards can't receive damage from enemy Units that are Lv.4 or lower.",
        imageUrl: "https://images.gundam-tcg.com/cards/ST02-013.png",
        link: "Quatre Raberba Winner (Operation Meteor)"
      },
      {
        id: "st02-014",
        name: "Siege Ploy",
        set: "ST02",
        cardNumber: "ST02-014",
        type: ["Command"],
        color: "Blue",
        rarity: "C",
        cost: 1,
        level: 3,
        ability: "【Burst】 Activate this card's 【Main】. 【Main / Action】 Choose 1 enemy Unit with 5 or less HP. Rest it.",
        imageUrl: "https://images.gundam-tcg.com/cards/ST02-014.png"
      },
      {
        id: "st02-015",
        name: "Saint Gabriel Institute",
        set: "ST02",
        cardNumber: "ST02-015",
        type: ["Base"],
        color: "Green",
        rarity: "C",
        cost: 2,
        level: 2,
        hp: 5,
        ability: "【Burst】 【Deploy】 this card. 【Deploy】 Add 1 of your Shields to your hand. Then, look at the top 2 cards of your deck and return 1 to the top and 1 to the bottom.",
        imageUrl: "https://images.gundam-tcg.com/cards/ST02-015.png",
        traits: ["Academy", "Stronghold"]
      }
    ];

    if (!window.confirm(`Import 12 cards for ST02 set? Existing cards with same IDs will be overwritten.`)) return;

    setIsBulkImporting(true);
    setStatusMessage("Importing ST02 cards...");

    try {
      const batch = writeBatch(db);
      st02Cards.forEach(card => {
        const cardRef = doc(db, 'cards', card.id);
        batch.set(cardRef, card);
      });
      await batch.commit();
      setStatusMessage("Successfully imported 12 ST02 cards!");
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error: any) {
      console.error("Import error:", error);
      setStatusMessage(`Import failed: ${error.message}`);
    } finally {
      setIsBulkImporting(false);
    }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsBulkImporting(true);
    setStatusMessage("Parsing bulk data...");

    try {
      const text = await file.text();
      const rawData = JSON.parse(text);
      
      const cardsToImport: GundamCard[] = Array.isArray(rawData) ? rawData : [rawData];
      
      if (cardsToImport.length === 0) {
        throw new Error("No cards found in the file.");
      }

      setStatusMessage(`Importing ${cardsToImport.length} cards in batches...`);
      
      // Process in batches of 500 (Firestore limit)
      const batchSize = 500;
      for (let i = 0; i < cardsToImport.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = cardsToImport.slice(i, i + batchSize);
        
        chunk.forEach(card => {
          // Ensure ID exists, if not use cardNumber
          const id = card.id || card.cardNumber?.toLowerCase() || Math.random().toString(36).substring(7);
          const cardRef = doc(db, 'cards', id);
          batch.set(cardRef, { ...card, id });
        });
        
        await batch.commit();
        setStatusMessage(`Imported ${Math.min(i + batchSize, cardsToImport.length)} / ${cardsToImport.length} cards...`);
      }

      setStatusMessage(`Successfully imported ${cardsToImport.length} cards!`);
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error: any) {
      console.error("Bulk import error:", error);
      setStatusMessage(`Import failed: ${error.message}`);
    } finally {
      setIsBulkImporting(false);
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  };

  const fixGD01Sets = async () => {
    const gd01Cards = cards.filter(c => c.cardNumber.toUpperCase().startsWith("GD01") && c.set !== "GD01");
    
    if (gd01Cards.length === 0) {
      setStatusMessage("All GD01 cards are already correctly paired!");
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }

    if (!window.confirm(`Found ${gd01Cards.length} cards with cardNumber GD01 but incorrect set. Update them all to set "GD01"?`)) return;

    setIsBulkImporting(true);
    setStatusMessage("Fixing GD01 set pairings...");

    try {
      const batchSize = 500;
      for (let i = 0; i < gd01Cards.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = gd01Cards.slice(i, i + batchSize);
        
        chunk.forEach(card => {
          const cardRef = doc(db, 'cards', card.id);
          batch.update(cardRef, { set: "GD01" });
        });
        
        await batch.commit();
      }

      setStatusMessage(`Fixed ${gd01Cards.length} cards!`);
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error: any) {
      console.error("Fix error:", error);
      setStatusMessage(`Fix failed: ${error.message}`);
    } finally {
      setIsBulkImporting(false);
    }
  };

  const normalizeKeywords = async () => {
    if (!window.confirm(`This will scan all ${cards.length} cards and add brackets to keywords like Attack, Deploy, Main, etc. where missing. Continue?`)) return;

    setIsBulkImporting(true);
    setStatusMessage("Normalizing keywords...");

    try {
      const keywords = [
        "Attack", "Deploy", "During Link", "When Link", "Once per Turn", 
        "Activate・Main", "Main", "Repair", "Breach", "Destroyed", "When Paired", "During Pair",
        "Burst", "First Strike", "High-Maneuver", "Support", "Blocker", "Suppression"
      ];
      
      // Regex to match keywords NOT already in brackets 【】 or []
      // We look for the keyword preceded by something that isn't a bracket and followed by something that isn't a bracket
      // Or at the start/end of string
      
      const batchSize = 500;
      let updatedCount = 0;

      for (let i = 0; i < cards.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = cards.slice(i, i + batchSize);
        let batchHasChanges = false;

        chunk.forEach(card => {
          let newAbility = card.ability || "";
          let changed = false;

          keywords.forEach(kw => {
            // Escape dots for regex
            const escapedKw = kw.replace(/・/g, '・');
            
            // This regex finds the keyword if it's NOT inside 【】 or []
            // It uses negative lookbehind and lookahead
            // Since JS support for lookbehind varies, we'll use a simpler approach:
            // Replace all instances, then fix double brackets if they occur, 
            // but better yet, use a regex that matches the keyword only if it's not already bracketed.
            
            // Match keyword that is NOT preceded by 【 or [ AND NOT followed by 】 or ]
            // We'll use a global replace with a function to check context
            const regex = new RegExp(`(?<![【\\[])${escapedKw}(?![】\\]])`, 'gi');
            
            if (regex.test(newAbility)) {
              // We use the original casing from the keyword list for the replacement
              newAbility = newAbility.replace(regex, `【${kw}】`);
              changed = true;
            }
            
            // Special case for Repair, Breach, and Support which often have numbers
            if (kw === "Repair" || kw === "Breach" || kw === "Support") {
              const numRegex = new RegExp(`(?<![【\\[])${kw}\\s*(\\d+)(?![】\\]])`, 'gi');
              if (numRegex.test(newAbility)) {
                newAbility = newAbility.replace(numRegex, (match, p1) => `【${kw} ${p1}】`);
                changed = true;
              }
            }
          });

          if (changed) {
            const cardRef = doc(db, 'cards', card.id);
            batch.update(cardRef, { ability: newAbility });
            batchHasChanges = true;
            updatedCount++;
          }
        });

        if (batchHasChanges) {
          await batch.commit();
        }
      }

      setStatusMessage(`Successfully normalized keywords in ${updatedCount} cards!`);
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error: any) {
      console.error("Normalization error:", error);
      setStatusMessage(`Normalization failed: ${error.message}`);
    } finally {
      setIsBulkImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template: GundamCard[] = [{
      id: "st01-001",
      name: "Gundam Exia",
      set: "ST 01",
      cardNumber: "ST01-001",
      type: ["Unit"],
      color: "Blue",
      rarity: "R",
      cost: "4",
      level: "4",
      ap: "5000",
      hp: "5000",
      ability: "【Deploy】 Draw 1 card.",
      imageUrl: "https://example.com/image.png",
      traits: ["Celestial Being", "Gundam"],
      zones: ["Space", "Earth"],
      faq: [
        { question: "Sample Question?", answer: "Sample Answer." }
      ]
    }];

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gundam_cards_template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAllCards = () => {
    const blob = new Blob([JSON.stringify(cards, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gundam_cards_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAIIdentify = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setStatusMessage("AI is analyzing the card...");

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const result = await analyzeCardImage(base64);
      if (result) {
        // Normalize type to array if it's a string
        if (result.type && typeof result.type === 'string') {
          result.type = [result.type as any];
        }

        setEditingCard(prev => ({
          ...prev,
          ...result,
          id: result.cardNumber?.toLowerCase() || prev?.id || '',
          traits: result.traits || prev?.traits || [],
          zones: result.zones || prev?.zones || []
        }));
        setTraitsInput(result.traits?.join(', ') || '');
        setHasUnsavedChanges(true);
        setStatusMessage("AI identification complete!");
      } else {
        setStatusMessage("AI could not identify the card.");
      }
    } catch (error: any) {
      console.error("AI identification error:", error);
      setStatusMessage(`AI error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, variantType: ArtVariantType) => {
    const file = e.target.files?.[0];
    if (!file || !editingCard?.cardNumber) return;

    setUploading(true);
    try {
      // Get file extension
      const extension = file.name.split('.').pop() || 'png';
      
      // Clean up the set name (remove spaces)
      const cleanSet = (editingCard.set || '').replace(/\s+/g, '');
      const cardNumber = editingCard.cardNumber || '';
      
      // Construct the filename: ensure it starts with the set prefix
      let fileName = cardNumber;
      if (cleanSet && !cardNumber.startsWith(cleanSet)) {
        fileName = `${cleanSet}-${cardNumber}`;
      }

      // Add suffix for variants
      if (variantType !== 'Base art') {
        fileName += `-${variantType.replace(/\s+/g, '').toUpperCase()}`;
      }
      
      // Use the constructed filename for a clean naming convention
      const storageRef = ref(storage, `cards/${fileName}.${extension}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      if (variantType === 'Base art') {
        setEditingCard({ ...editingCard, imageUrl: downloadURL });
      } else if (variantType === 'Parallel') {
        setEditingCard({ ...editingCard, altImageUrl: downloadURL });
      } else {
        const currentVariants = editingCard.variants || [];
        const existingIndex = currentVariants.findIndex(v => v.type === variantType);
        
        let newVariants;
        if (existingIndex >= 0) {
          newVariants = [...currentVariants];
          newVariants[existingIndex] = { ...newVariants[existingIndex], imageUrl: downloadURL };
        } else {
          newVariants = [...currentVariants, { type: variantType, imageUrl: downloadURL }];
        }
        setEditingCard({ ...editingCard, variants: newVariants });
      }

      setHasUnsavedChanges(true);
      setStatusMessage(`Uploaded ${variantType} image`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error: any) {
      console.error("Upload error:", error);
      setStatusMessage(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveCard = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingCard || !editingCard.id) return;

    try {
      await setDoc(doc(db, 'cards', editingCard.id), editingCard);
      setEditingCard(null);
      setShowForm(false);
      setHasUnsavedChanges(false);
      setStatusMessage("Card saved successfully!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error) {
      console.error("Error saving card:", error);
      alert("Failed to save card.");
    }
  };

  const addBrackets = () => {
    const textarea = abilityRef.current;
    if (!textarea || !editingCard) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = editingCard.ability || "";

    if (start === end) return; // No selection

    const selectedText = text.substring(start, end);
    const newText = text.substring(0, start) + "【" + selectedText + "】" + text.substring(end);
    
    setEditingCard({ ...editingCard, ability: newText });
    setHasUnsavedChanges(true);

    // Focus back and restore selection (optional, but nice)
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, end + 2);
    }, 0);
  };

  const handleDeleteCard = async () => {
    if (!cardToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'cards', cardToDelete.id));
      setCardToDelete(null);
      setStatusMessage("Card deleted successfully");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error: any) {
      console.error("Error deleting card:", error);
      alert(`Failed to delete card: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCards = cards.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         c.cardNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (showOnlyFlagged) {
      const hasFeedback = adminFeedback.some(f => f.cardId === c.id && f.status !== 'Closed' && f.status !== 'Resolved');
      return matchesSearch && hasFeedback;
    }
    
    return matchesSearch;
  });

  // Sort by feedback count if showOnlyFlagged is true
  const sortedCards = [...filteredCards].sort((a, b) => {
    if (showOnlyFlagged) {
      const countA = adminFeedback.filter(f => f.cardId === a.id && f.status !== 'Closed' && f.status !== 'Resolved').length;
      const countB = adminFeedback.filter(f => f.cardId === b.id && f.status !== 'Closed' && f.status !== 'Resolved').length;
      return countB - countA;
    }
    return 0; // Keep original order (cardNumber asc)
  });

  // Auto-populate ST 09-001 FAQ if empty
  useEffect(() => {
    const isImpulse = editingCard && (
      editingCard.cardNumber?.replace(/[^a-z0-9]/gi, '') === 'ST09001' || 
      editingCard.name?.toLowerCase().includes('impulse')
    );

    if (editingCard && isImpulse && (!editingCard.faq || editingCard.faq.length === 0)) {
      setEditingCard({
        ...editingCard,
        faq: [
          {
            question: "When deploying a Unit with this effect, do I have to pay that Unit's cost?",
            answer: "No, you do not."
          },
          {
            question: "If the Unit deployed by this effect has a 【Deploy】 effect, does it activate?",
            answer: "Yes, it does."
          }
        ]
      });
      setHasUnsavedChanges(true);
    }
  }, [editingCard?.cardNumber, editingCard?.name]);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-300">
      <header className="p-4 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X size={20} />
          </button>
          <h2 className="text-lg font-black text-[#141414]">Card Database Manager</h2>
        </div>
        <div className="flex items-center gap-2">
          {statusMessage && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 rounded-xl text-[10px] font-bold text-stone-600 animate-in fade-in slide-in-from-right-2">
              <Info size={12} className="text-amber-500" />
              {statusMessage}
            </div>
          )}

          {showForm && (
            <button 
              onClick={() => handleSaveCard()}
              disabled={uploading || !hasUnsavedChanges}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all animate-in fade-in zoom-in-95",
                hasUnsavedChanges 
                  ? "bg-amber-500 text-white hover:bg-amber-600" 
                  : "bg-stone-200 text-stone-400 cursor-not-allowed"
              )}
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {uploading ? "Saving..." : hasUnsavedChanges ? "Save Changes" : "Saved"}
            </button>
          )}
          
          <button 
            onClick={() => {
              setEditingCard({
                id: '',
                name: '',
                set: ALL_SETS[0],
                cardNumber: '',
                type: ['Unit'],
                color: 'Red',
                rarity: 'C',
                cost: '1',
                level: '1',
                ap: '0',
                hp: '0',
                ability: '',
                imageUrl: '',
                altImageUrl: '',
                traits: [],
                zones: [],
                link: '',
                baseArtist: '',
                baseArtistLink: '',
                altArtist: '',
                altArtistLink: '',
                variants: [],
                faq: []
              });
              setTraitsInput("");
              setActiveArtTab('Base art');
              setHasUnsavedChanges(false);
              setShowForm(true);
              mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-stone-800 transition-all"
          >
            <Plus size={14} />
            Add New Card
          </button>
        </div>
      </header>

      <main ref={mainRef} className="flex-1 overflow-y-auto px-4 pt-4 pb-48 space-y-6">
        {showForm && editingCard && (
          <div className="bg-stone-50 border border-stone-200 rounded-3xl p-6 space-y-6 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-stone-400">
                  Edit card
                </h3>
              </div>
              <div className="flex items-center gap-3">
                  {!editingCard.id && (
                    <label className={cn(
                      "flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold cursor-pointer hover:bg-amber-100 transition-all border border-amber-100",
                      isAnalyzing && "opacity-50 cursor-not-allowed"
                    )}>
                      {isAnalyzing ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Sparkles size={12} />
                      )}
                      {isAnalyzing ? "Analyzing..." : "Identify with AI"}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleAIIdentify}
                        disabled={isAnalyzing}
                      />
                    </label>
                  )}
                  <button 
                    type="button"
                    onClick={() => handleSaveCard()}
                    disabled={uploading || !hasUnsavedChanges}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
                      hasUnsavedChanges 
                        ? "bg-amber-500 text-white hover:bg-amber-600" 
                        : "bg-stone-200 text-stone-400 cursor-not-allowed"
                    )}
                  >
                    <Save size={12} />
                    {uploading ? "Uploading..." : hasUnsavedChanges ? "Save Card" : "Saved"}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="text-stone-400 hover:text-stone-600 p-1">
                    <X size={20} />
                  </button>
                </div>
              </div>

            <form onSubmit={handleSaveCard} className="space-y-8">
              {/* Feedback Section at the top */}
              {editingCard.id && adminFeedback.some(f => f.cardId === editingCard.id && f.status !== 'Resolved' && f.status !== 'Closed') && (
                <div className="space-y-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-red-500" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-red-600">
                      Active User Feedback for this card
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2 scrollbar-hide">
                    {adminFeedback
                      .filter(f => f.cardId === editingCard.id && f.status !== 'Resolved' && f.status !== 'Closed')
                      .sort((a, b) => b.createdAt - a.createdAt)
                      .map(f => (
                        <div key={f.id} className="bg-white p-3 rounded-xl border border-red-100 shadow-sm space-y-2 flex flex-col">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                              f.status === 'New' ? "bg-red-100 text-red-600" :
                              f.status === 'In Progress' ? "bg-amber-100 text-amber-600" :
                              "bg-emerald-100 text-emerald-600"
                            )}>
                              {f.status}
                            </span>
                            <span className="text-[8px] text-stone-400 font-bold">
                              {new Date(f.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="text-[9px] font-black text-stone-600 uppercase tracking-tighter">
                              {f.category}
                            </p>
                            <p className="text-xs text-stone-700 leading-tight">
                              {f.message}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onUpdateFeedbackStatus(f.id, 'Resolved')}
                            className="mt-2 w-full py-1.5 bg-emerald-500 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-sm"
                          >
                            Resolve this ticket
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Basic Info */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Line 1: Set, Card Number, Card ID, Name */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 leading-tight">Set</label>
                      <select 
                        value={editingCard.set} 
                        onChange={e => {
                          setEditingCard({...editingCard, set: e.target.value});
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                      >
                        {ALL_SETS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 leading-tight">Card Number</label>
                      <input 
                        type="text" 
                        value={editingCard.cardNumber} 
                        onChange={e => {
                          setEditingCard({...editingCard, cardNumber: e.target.value});
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 leading-tight">Card ID</label>
                      <input 
                        type="text" 
                        value={editingCard.id} 
                        onChange={e => {
                          setEditingCard({...editingCard, id: e.target.value});
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 leading-tight">Name of card</label>
                      <input 
                        type="text" 
                        value={editingCard.name} 
                        onChange={e => {
                          setEditingCard({...editingCard, name: e.target.value});
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>

                  {/* Line 1.5: Stats (Cost, Level, AP, HP) */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 leading-tight">Level</label>
                      <input 
                        type="text" 
                        value={editingCard.level || ''} 
                        onChange={e => {
                          setEditingCard({...editingCard, level: e.target.value});
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 leading-tight">Cost</label>
                      <input 
                        type="text" 
                        value={editingCard.cost} 
                        onChange={e => {
                          setEditingCard({...editingCard, cost: e.target.value});
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 text-center"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 leading-tight">AP</label>
                      <input 
                        type="text" 
                        value={editingCard.ap || ''} 
                        onChange={e => {
                          setEditingCard({...editingCard, ap: e.target.value});
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 leading-tight">HP</label>
                      <input 
                        type="text" 
                        value={editingCard.hp || ''} 
                        onChange={e => {
                          setEditingCard({...editingCard, hp: e.target.value});
                          setHasUnsavedChanges(true);
                        }}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 text-center"
                      />
                    </div>
                  </div>

                  {/* Line 2: Color, Rarity, Type, Zones */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 leading-tight">Color</label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { name: "Red", bg: "bg-red-500" },
                          { name: "Blue", bg: "bg-blue-500" },
                          { name: "Green", bg: "bg-green-500" },
                          { name: "White", bg: "bg-white", border: "border-stone-200" },
                          { name: "Purple", bg: "bg-purple-600" }
                        ].map(c => (
                          <button
                            key={c.name}
                            type="button"
                            title={c.name}
                            onClick={() => {
                              setEditingCard({...editingCard, color: c.name as any});
                              setHasUnsavedChanges(true);
                            }}
                            className={cn(
                              "w-6 h-6 rounded-md transition-all border-2",
                              c.bg,
                              c.border || "border-transparent",
                              editingCard.color === c.name 
                                ? "ring-2 ring-amber-500 ring-offset-1 scale-110 shadow-sm" 
                                : "opacity-60 hover:opacity-100"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 leading-tight">Rarity</label>
                      <div className="flex flex-wrap gap-1">
                        {["C", "U", "R", "LR"].map(r => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              setEditingCard({...editingCard, rarity: r as any});
                              setHasUnsavedChanges(true);
                            }}
                            className={cn(
                              "w-7 h-7 rounded-lg text-[10px] font-black transition-all border flex items-center justify-center",
                              editingCard.rarity === r 
                                ? "bg-[#141414] text-white border-[#141414] shadow-sm" 
                                : "bg-white text-stone-400 border-stone-200 hover:border-stone-300"
                            )}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 leading-tight">Type</label>
                      <div className="flex flex-wrap gap-1">
                        {["Unit", "Pilot", "Command", "Base"].map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              const currentTypes = editingCard.type || [];
                              const newTypes = currentTypes.includes(t as any)
                                ? currentTypes.filter(type => type !== t)
                                : [...currentTypes, t as any];
                              setEditingCard({...editingCard, type: newTypes});
                              setHasUnsavedChanges(true);
                            }}
                            className={cn(
                              "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all border",
                              editingCard.type?.includes(t as any) 
                                ? "bg-[#141414] text-white border-[#141414] shadow-sm" 
                                : "bg-white text-stone-400 border-stone-200 hover:border-stone-300"
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400 leading-tight">Zones</label>
                      <div className="flex items-center gap-3 h-7">
                        {["Earth", "Space"].map(z => (
                          <label key={z} className="flex items-center gap-1.5 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={editingCard.zones?.includes(z)} 
                              onChange={e => {
                                const currentZones = editingCard.zones || [];
                                const newZones = e.target.checked 
                                  ? [...currentZones, z]
                                  : currentZones.filter(zone => zone !== z);
                                setEditingCard({...editingCard, zones: newZones});
                                setHasUnsavedChanges(true);
                              }}
                              className="w-3.5 h-3.5 rounded border-stone-300 text-amber-500 focus:ring-amber-500"
                            />
                            <span className="text-[10px] font-bold text-stone-600 group-hover:text-stone-900 transition-colors">{z}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Line 3: Traits, Linked Card Name */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 relative p-4 bg-amber-50/20 border border-amber-100/50 rounded-2xl transition-all hover:bg-amber-50/40 group/traits">
                      <label className="text-[10px] font-black uppercase text-amber-600/60 leading-tight flex items-center gap-1.5">
                        <Tag size={10} />
                        Traits (comma separated)
                      </label>
                      <input 
                        type="text" 
                        value={traitsInput} 
                        onFocus={() => {
                          if (traitsInput.trim().length === 0) {
                            setTraitSuggestions(allUniqueTraits.slice(0, 5));
                            setShowTraitSuggestions(true);
                          }
                        }}
                        onChange={e => {
                          const val = e.target.value;
                          setTraitsInput(val);
                          const traits = val.split(',').map(s => s.trim()).filter(Boolean);
                          setEditingCard(prev => prev ? {...prev, traits} : null);
                          setHasUnsavedChanges(true);

                          // Handle suggestions
                          const parts = val.split(',');
                          const currentPart = parts[parts.length - 1].trim();
                          if (currentPart.length >= 1) {
                            const filtered = allUniqueTraits.filter(t => 
                              t.toLowerCase().includes(currentPart.toLowerCase()) && 
                              !traits.includes(t)
                            ).slice(0, 8);
                            setTraitSuggestions(filtered);
                            setShowTraitSuggestions(filtered.length > 0);
                          } else {
                            // Show top traits if empty part but focus is active
                            setTraitSuggestions(allUniqueTraits.slice(0, 5));
                            setShowTraitSuggestions(true);
                          }
                        }}
                        onBlur={() => {
                          // Small delay to allow click on suggestion
                          setTimeout(() => setShowTraitSuggestions(false), 200);
                        }}
                        placeholder="e.g. Mobile Suit, Zeon, Char Aznable"
                        className="w-full bg-white/50 border border-amber-200/50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-amber-500 focus:bg-white transition-all placeholder:text-stone-300"
                      />
                      <div className="mt-2 flex flex-wrap gap-1">
                        {editingCard.traits?.map((trait, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black uppercase rounded-full border border-amber-200">
                            {trait}
                          </span>
                        ))}
                      </div>
                      {showTraitSuggestions && (
                        <div className="absolute z-50 bottom-full left-4 right-4 mb-2 bg-white border border-stone-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 max-h-48 overflow-y-auto">
                          <div className="px-3 py-2 bg-stone-50 border-b border-stone-100">
                            <span className="text-[8px] font-black uppercase tracking-widest text-stone-400">Suggestions</span>
                          </div>
                          {traitSuggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                const parts = traitsInput.split(',').map(s => s.trim());
                                // If last part is partial, replace it, else append
                                const lastPart = parts[parts.length - 1];
                                if (suggestion.toLowerCase().includes(lastPart.toLowerCase()) && lastPart.length > 0) {
                                  parts[parts.length - 1] = suggestion;
                                } else {
                                  parts.push(suggestion);
                                }
                                
                                const newVal = parts.filter(Boolean).join(', ') + ', ';
                                setTraitsInput(newVal);
                                const traits = newVal.split(',').map(s => s.trim()).filter(Boolean);
                                setEditingCard(prev => prev ? {...prev, traits} : null);
                                setTraitSuggestions([]);
                                setShowTraitSuggestions(false);
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-stone-600 hover:bg-amber-50 hover:text-amber-600 transition-colors flex items-center justify-between border-b border-stone-50 last:border-none"
                            >
                              {suggestion}
                              <Plus size={10} className="text-amber-400" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1 relative p-4 bg-stone-50/20 border border-stone-100/50 rounded-2xl transition-all hover:bg-stone-50/40 group/link">
                      <label className="text-[10px] font-black uppercase text-stone-400 leading-tight flex items-center gap-1.5 group-hover/link:text-stone-500 transition-colors">
                        <Link2 size={10} />
                        Linked Card Name (e.g. Amuro Ray)
                      </label>
                      <input 
                        type="text" 
                        value={editingCard.link || ''} 
                        onChange={e => {
                          const val = e.target.value;
                          setEditingCard({...editingCard, link: val});
                          setHasUnsavedChanges(true);

                          if (val.length >= 2) {
                            const filtered = allUniqueLinks.filter(n => 
                              n.toLowerCase().includes(val.toLowerCase())
                            ).slice(0, 5);
                            setLinkSuggestions(filtered);
                            setShowLinkSuggestions(filtered.length > 0);
                          } else {
                            setLinkSuggestions([]);
                            setShowLinkSuggestions(false);
                          }
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowLinkSuggestions(false), 200);
                        }}
                        className="w-full bg-white/50 border border-stone-200/50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-stone-400 focus:bg-white transition-all placeholder:text-stone-300"
                      />
                      {showLinkSuggestions && (
                        <div className="absolute z-50 bottom-full left-4 right-4 mb-2 bg-white border border-stone-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <div className="px-3 py-2 bg-stone-50 border-b border-stone-100">
                            <span className="text-[8px] font-black uppercase tracking-widest text-stone-400">Suggestions</span>
                          </div>
                          {linkSuggestions.map((suggestion, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setEditingCard(prev => prev ? {...prev, link: suggestion} : null);
                                setLinkSuggestions([]);
                                setShowLinkSuggestions(false);
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors flex items-center justify-between border-b border-stone-50 last:border-none"
                            >
                              {suggestion}
                              <Plus size={10} className="text-stone-400" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Line 4: Ability Text */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase text-stone-400 leading-tight">Ability Text</label>
                      <button 
                        type="button"
                        onClick={addBrackets}
                        className="px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-[10px] font-black text-amber-600 transition-colors flex items-center gap-1.5"
                      >
                        Add 【Brackets】
                      </button>
                    </div>
                    <textarea 
                      ref={abilityRef}
                      value={editingCard.ability} 
                      onChange={e => {
                        setEditingCard({...editingCard, ability: e.target.value});
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500 h-32 resize-none leading-relaxed"
                    />
                  </div>

                  {/* Line 5: FAQ Section */}
                  <div className="space-y-4 pt-6 border-t border-stone-200">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase text-stone-400">Card FAQ</label>
                      <button 
                        type="button"
                        onClick={() => {
                          const currentFaq = editingCard.faq || [];
                          setEditingCard({
                            ...editingCard,
                            faq: [...currentFaq, { question: '', answer: '' }]
                          });
                          setHasUnsavedChanges(true);
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-[10px] font-bold text-stone-600 transition-colors"
                      >
                        <Plus size={12} />
                        Add FAQ
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {(editingCard.faq || []).map((item, index) => (
                        <div key={index} className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3 relative group">
                          <button 
                            type="button"
                            onClick={() => {
                              const newFaq = [...(editingCard.faq || [])];
                              newFaq.splice(index, 1);
                              setEditingCard({ ...editingCard, faq: newFaq });
                              setHasUnsavedChanges(true);
                            }}
                            className="absolute top-2 right-2 p-1 text-stone-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-stone-400">Question</label>
                            <input 
                              type="text"
                              value={item.question}
                              onChange={e => {
                                const newFaq = [...(editingCard.faq || [])];
                                newFaq[index] = { ...newFaq[index], question: e.target.value };
                                setEditingCard({ ...editingCard, faq: newFaq });
                                setHasUnsavedChanges(true);
                              }}
                              className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                              placeholder="e.g. When deploying a Unit..."
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-stone-400">Answer</label>
                            <textarea 
                              value={item.answer}
                              onChange={e => {
                                const newFaq = [...(editingCard.faq || [])];
                                newFaq[index] = { ...newFaq[index], answer: e.target.value };
                                setEditingCard({ ...editingCard, faq: newFaq });
                                setHasUnsavedChanges(true);
                              }}
                              className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500 h-20 resize-none"
                              placeholder="e.g. No, you do not."
                            />
                          </div>
                        </div>
                      ))}
                      {(editingCard.faq || []).length === 0 && (
                        <p className="text-[10px] text-stone-400 italic text-center py-4">No FAQ items added yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Images */}
                <div className="space-y-6">
                  {/* Art Selections */}
                  <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase text-stone-400">Card Art & Variants</label>
                    <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
                      <button 
                        type="button"
                        onClick={() => setActiveArtTab('Base art')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                          activeArtTab === 'Base art' ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-600"
                        )}
                      >
                        Base
                      </button>
                      <button 
                        type="button"
                        onClick={() => setActiveArtTab('Parallel')}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
                          activeArtTab === 'Parallel' ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-600"
                        )}
                      >
                        Parallel
                      </button>
                      {(editingCard.variants || []).map((v, i) => (
                        <button 
                          key={i}
                          type="button"
                          onClick={() => setActiveArtTab(i)}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1",
                            activeArtTab === i ? "bg-white text-stone-900 shadow-sm" : "text-stone-400 hover:text-stone-600"
                          )}
                        >
                          {v.type || `V${i + 1}`}
                          <Trash2 
                            size={8} 
                            className="hover:text-red-500 transition-colors ml-1" 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Delete this variant?")) {
                                const newVariants = [...(editingCard.variants || [])];
                                newVariants.splice(i, 1);
                                setEditingCard({ ...editingCard, variants: newVariants });
                                setActiveArtTab('Base art');
                                setHasUnsavedChanges(true);
                              }
                            }}
                          />
                        </button>
                      ))}
                      <button 
                        type="button"
                        onClick={() => {
                          const currentVariants = editingCard.variants || [];
                          const newIndex = currentVariants.length;
                          setEditingCard({
                            ...editingCard,
                            variants: [...currentVariants, { type: '', imageUrl: '' }]
                          });
                          setActiveArtTab(newIndex);
                          setHasUnsavedChanges(true);
                        }}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-amber-500 hover:bg-white transition-all"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-stone-100 rounded-3xl p-4 shadow-sm min-h-[400px]">
                    {activeArtTab === 'Base art' && (
                      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="relative w-72 mx-auto aspect-[3/4] bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 group shrink-0 shadow-lg">
                          {editingCard.imageUrl ? (
                            <img 
                              src={editingCard.imageUrl} 
                              alt="Base Art" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 border-2 border-dashed border-stone-200 rounded-2xl">
                              <ImageIcon size={32} strokeWidth={1} />
                              <span className="text-[10px] font-bold mt-2">No Image</span>
                            </div>
                          )}
                          <label 
                            className={cn(
                              "absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white",
                              (!editingCard.cardNumber || uploading) && "cursor-not-allowed opacity-0 group-hover:opacity-0"
                            )}
                          >
                            <Upload size={24} />
                            <span className="text-xs font-bold mt-2">Upload Base Art</span>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={e => handleImageUpload(e, 'Base art')}
                              disabled={uploading || !editingCard.cardNumber}
                            />
                          </label>
                          {uploading && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                              <Loader2 size={24} className="animate-spin text-amber-500" />
                            </div>
                          )}
                        </div>
                        <div className="w-72 mx-auto space-y-2 p-3 bg-stone-100/50 rounded-2xl border border-stone-200/50">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-stone-400 tracking-widest pl-1">Image URL</label>
                            <input 
                              type="text" 
                              value={editingCard.imageUrl} 
                              onChange={e => {
                                setEditingCard({...editingCard, imageUrl: e.target.value});
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="https://..."
                              className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-[9px] focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[8px] font-black uppercase text-stone-400 tracking-widest pl-1">Artist Name</label>
                              <input 
                                type="text" 
                                value={editingCard.baseArtist || ''} 
                                onChange={e => {
                                  setEditingCard({...editingCard, baseArtist: e.target.value});
                                  setHasUnsavedChanges(true);
                                }}
                                placeholder="Artist Name"
                                className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-[9px] focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black uppercase text-stone-400 tracking-widest pl-1">Artist Link</label>
                              <input 
                                type="text" 
                                value={editingCard.baseArtistLink || ''} 
                                onChange={e => {
                                  setEditingCard({...editingCard, baseArtistLink: e.target.value});
                                  setHasUnsavedChanges(true);
                                }}
                                placeholder="Social Link"
                                className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-[9px] focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeArtTab === 'Parallel' && (
                      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="relative w-72 mx-auto aspect-[3/4] bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 group shrink-0 shadow-lg">
                          {editingCard.altImageUrl ? (
                            <img 
                              src={editingCard.altImageUrl} 
                              alt="Parallel Art" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 border-2 border-dashed border-stone-200 rounded-2xl">
                              <ImageIcon size={32} strokeWidth={1} />
                              <span className="text-[10px] font-bold mt-2">No Image</span>
                            </div>
                          )}
                          <label 
                            className={cn(
                              "absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white",
                              (!editingCard.cardNumber || uploading) && "cursor-not-allowed opacity-0 group-hover:opacity-0"
                            )}
                          >
                            <Upload size={24} />
                            <span className="text-xs font-bold mt-2">Upload Parallel Art</span>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={e => handleImageUpload(e, 'Parallel')}
                              disabled={uploading || !editingCard.cardNumber}
                            />
                          </label>
                        </div>
                        <div className="w-72 mx-auto space-y-2 p-3 bg-stone-100/50 rounded-2xl border border-stone-200/50">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-stone-400 tracking-widest pl-1">Parallel Image URL</label>
                            <input 
                              type="text" 
                              value={editingCard.altImageUrl || ''} 
                              onChange={e => {
                                setEditingCard({...editingCard, altImageUrl: e.target.value});
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Parallel Art URL"
                              className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-[9px] focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[8px] font-black uppercase text-stone-400 tracking-widest pl-1">Artist Name</label>
                              <input 
                                type="text" 
                                value={editingCard.altArtist || ''} 
                                onChange={e => {
                                  setEditingCard({...editingCard, altArtist: e.target.value});
                                  setHasUnsavedChanges(true);
                                }}
                                placeholder="Artist Name"
                                className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-[9px] focus:outline-none focus:border-amber-500"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black uppercase text-stone-400 tracking-widest pl-1">Artist Link</label>
                              <input 
                                type="text" 
                                value={editingCard.altArtistLink || ''} 
                                onChange={e => {
                                  setEditingCard({...editingCard, altArtistLink: e.target.value});
                                  setHasUnsavedChanges(true);
                                }}
                                placeholder="Social Link"
                                className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-[9px] focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {typeof activeArtTab === 'number' && editingCard.variants?.[activeArtTab] && (
                      <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-stone-400">Variant Name</label>
                            <input 
                              type="text" 
                              value={editingCard.variants[activeArtTab].type} 
                              onChange={e => {
                                const newVariants = [...(editingCard.variants || [])];
                                newVariants[activeArtTab] = { ...newVariants[activeArtTab], type: e.target.value };
                                setEditingCard({...editingCard, variants: newVariants});
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="e.g. Galvin"
                              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-[10px] focus:outline-none focus:border-amber-500 font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-stone-400">Artist Name</label>
                            <input 
                              type="text" 
                              value={editingCard.variants[activeArtTab].artist || ''} 
                              onChange={e => {
                                const newVariants = [...(editingCard.variants || [])];
                                newVariants[activeArtTab] = { ...newVariants[activeArtTab], artist: e.target.value };
                                setEditingCard({...editingCard, variants: newVariants});
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Artist Name"
                              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-[10px] focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>

                        <div className="relative w-72 mx-auto aspect-[3/4] bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 group shrink-0 shadow-lg">
                          {editingCard.variants[activeArtTab].imageUrl ? (
                            <img 
                              src={editingCard.variants[activeArtTab].imageUrl} 
                              alt={editingCard.variants[activeArtTab].type || 'Variant'} 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 border-2 border-dashed border-stone-200 rounded-2xl">
                              <ImageIcon size={32} strokeWidth={1} />
                              <span className="text-[10px] font-bold mt-2">No Image</span>
                            </div>
                          )}
                          <label 
                            className={cn(
                              "absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white",
                              (!editingCard.cardNumber || uploading || !editingCard.variants[activeArtTab].type) && "cursor-not-allowed opacity-0 group-hover:opacity-0"
                            )}
                          >
                            <Upload size={24} />
                            <span className="text-xs font-bold mt-2">Upload Variant Art</span>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={e => handleImageUpload(e, editingCard.variants![activeArtTab as number].type)}
                              disabled={uploading || !editingCard.cardNumber || !editingCard.variants[activeArtTab as number].type}
                            />
                          </label>
                        </div>
                        <div className="w-72 mx-auto space-y-2 p-3 bg-stone-100/50 rounded-2xl border border-stone-200/50">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-stone-400 tracking-widest pl-1">Variant Art URL</label>
                            <input 
                              type="text" 
                              value={editingCard.variants[activeArtTab].imageUrl || ''} 
                              onChange={e => {
                                const newVariants = [...(editingCard.variants || [])];
                                newVariants[activeArtTab as number] = { ...newVariants[activeArtTab as number], imageUrl: e.target.value };
                                setEditingCard({...editingCard, variants: newVariants});
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Art URL"
                              className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-[9px] focus:outline-none focus:border-amber-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-stone-400 tracking-widest pl-1">Artist Link</label>
                            <input 
                              type="text" 
                              value={editingCard.variants[activeArtTab].artistLink || ''} 
                              onChange={e => {
                                const newVariants = [...(editingCard.variants || [])];
                                newVariants[activeArtTab as number] = { ...newVariants[activeArtTab as number], artistLink: e.target.value };
                                setEditingCard({...editingCard, variants: newVariants});
                                setHasUnsavedChanges(true);
                              }}
                              placeholder="Social Link"
                              className="w-full bg-white border border-stone-200 rounded-lg px-2 py-1 text-[9px] focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </form>
          </div>
        )}

        <div className="space-y-4">
          {/* Delete Confirmation Modal */}
          {cardToDelete && (
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500">
                    <Trash2 size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-stone-900">Delete Card?</h3>
                    <p className="text-sm text-stone-500">
                      Are you sure you want to delete <span className="font-bold text-stone-900">{cardToDelete.name}</span> ({cardToDelete.cardNumber})? This action cannot be undone.
                    </p>
                  </div>
                  <div className="flex gap-3 w-full pt-2">
                    <button 
                      onClick={() => setCardToDelete(null)}
                      disabled={isDeleting}
                      className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-stone-500 hover:bg-stone-100 transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleDeleteCard}
                      disabled={isDeleting}
                      className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isDeleting ? <Loader2 size={16} className="animate-spin" /> : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-200">
            <div className="flex items-center gap-3 flex-1 w-full">
              <Search className="text-stone-400" size={18} />
              <input 
                type="text" 
                placeholder="Search cards in Firestore..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-sm w-full"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
              <button
                onClick={() => setShowOnlyFlagged(!showOnlyFlagged)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap",
                  showOnlyFlagged 
                    ? "bg-red-500 text-white border-red-500 shadow-sm" 
                    : "bg-white text-stone-400 border-stone-200 hover:border-stone-300"
                )}
              >
                <Flag size={12} />
                {showOnlyFlagged ? "Flagged Only" : "Show Flagged"}
              </button>
              <div className="text-[10px] font-bold text-stone-400 whitespace-nowrap px-2 border-l border-stone-200">
                {sortedCards.length} Cards
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedCards.map(card => {
              const cardFeedback = adminFeedback.filter(f => f.cardId === card.id && f.status !== 'Closed' && f.status !== 'Resolved');
              const hasFeedback = cardFeedback.length > 0;
              
              return (
                <div key={card.id} className={cn(
                  "bg-white border rounded-2xl p-3 flex items-center gap-4 shadow-sm hover:border-stone-300 transition-all group relative",
                  hasFeedback ? "border-red-200 bg-red-50/10" : "border-stone-200"
                )}>
                  <div className="w-12 h-16 bg-stone-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                    {card.championshipParticipation && (
                      <div className="absolute top-0.5 right-0.5 bg-blue-500 text-white p-0.5 rounded-full shadow-sm z-10">
                        <Trophy size={8} strokeWidth={2} />
                      </div>
                    )}
                    {hasFeedback && (
                      <div className="absolute top-0.5 left-0.5 bg-red-500 text-white p-0.5 rounded-full shadow-sm z-10 animate-pulse">
                        <Flag size={8} strokeWidth={2} />
                      </div>
                    )}
                    <img src={card.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black text-[#141414] truncate">{card.name}</h4>
                      {hasFeedback && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[8px] font-black rounded uppercase">
                          {cardFeedback.length}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-400 font-bold">{card.cardNumber} • {card.set}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setEditingCard(card);
                        setTraitsInput(card.traits?.join(', ') || '');
                        setActiveArtTab('Base art');
                        setHasUnsavedChanges(false);
                        setShowForm(true);
                        mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="p-2 text-stone-400 hover:text-amber-500 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => setCardToDelete(card)}
                      className="p-2 text-stone-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};
