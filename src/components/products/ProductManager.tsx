import React, { useState, useEffect, useRef } from 'react';
import { db, storage, auth } from '../../firebase';
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Package, 
  Search, 
  ChevronRight, 
  Info,
  Loader2,
  List,
  Sparkles,
  Download,
  ExternalLink,
  ChevronDown,
  LayoutGrid,
  Image as ImageIcon,
  Upload
} from 'lucide-react';
import { Product, GundamCard, ALL_SETS } from '../../types';
import { cn } from '../../lib/utils';

interface ProductManagerProps {
  onClose: () => void;
  allCards: GundamCard[];
}

export const ProductManager: React.FC<ProductManagerProps> = ({ onClose, allCards }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cardSearchQuery, setCardSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
        setProducts(data);
        setLoading(false);
      },
      (error) => {
        console.error("Products fetch error:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.imageUrl) return;

    try {
      if (editingProduct.id && products.find(p => p.id === editingProduct.id)) {
        await setDoc(doc(db, 'products', editingProduct.id), editingProduct);
        setStatusMessage("Product updated successfully!");
      } else {
        const docId = editingProduct.id || Math.random().toString(36).substr(2, 9);
        await setDoc(doc(db, 'products', docId), { ...editingProduct, id: docId });
        setStatusMessage("Product added successfully!");
      }
      setEditingProduct(null);
      setShowForm(false);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error: any) {
      console.error("Error saving product:", error);
      alert(`Save failed: ${error.message}`);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      await deleteDoc(doc(db, 'products', id));
      setStatusMessage("Product deleted");
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const handleAddListItem = (field: 'whereToBuy' | 'contents' | 'featuredCards', val: any) => {
    setEditingProduct(prev => ({
      ...prev,
      [field]: [...(prev?.[field] || []), val]
    }));
  };

  const handleRemoveListItem = (field: 'whereToBuy' | 'contents' | 'featuredCards', index: number) => {
    setEditingProduct(prev => ({
      ...prev,
      [field]: (prev?.[field] || []).filter((_, i) => i !== index)
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProduct?.id) {
      if (!editingProduct?.id) alert("Please select a Reference ID first.");
      return;
    }

    setUploading(true);
    setStatusMessage("Uploading product image...");
    
    try {
      // Ensure user is authenticated for Firebase Storage
      if (!auth.currentUser) {
        throw new Error("You must be signed in to upload images. Please check your login status.");
      }

      const extension = file.name.split('.').pop() || 'png';
      const fileName = `product-${editingProduct.id.toLowerCase()}`;
      const storageRef = ref(storage, `cards/${fileName}.${extension}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      setEditingProduct(prev => ({ ...prev, imageUrl: downloadURL }));
      setStatusMessage("Image uploaded successfully!");
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const seedMockData = async () => {
    const mockProducts = [
      { id: "ST01", name: "ST01 - Heroic Beginnings", category: "Starter Deck", imageUrl: "https://picsum.photos/seed/st01/600/800", releaseDate: "January 16, 2026", msrp: "$15.99 USD", order: 1, contents: ["x1 Ready-to-play 50-card deck", "x10 Resource Cards", "x2 Token Cards"] },
      { id: "ST02", name: "ST02 - Wings of Advance", category: "Starter Deck", imageUrl: "https://picsum.photos/seed/st02/600/800", releaseDate: "January 16, 2026", msrp: "$15.99 USD", order: 2, contents: ["x1 Ready-to-play 50-card deck", "x10 Resource Cards"] },
      { id: "ST03", name: "ST03 - Zeon's Rush", category: "Starter Deck", imageUrl: "https://picsum.photos/seed/st03/600/800", releaseDate: "January 16, 2026", msrp: "$15.99 USD", order: 3, contents: ["x1 Ready-to-play 50-card deck", "x10 Resource Cards"] },
      { id: "ST04", name: "ST04 - SEED Strike", category: "Starter Deck", imageUrl: "https://picsum.photos/seed/st04/600/800", releaseDate: "February 2026", msrp: "$15.99 USD", order: 4, contents: ["x1 Ready-to-play 50-card deck", "x10 Resource Cards"] },
      { id: "ST05", name: "ST05 - Iron Bloom", category: "Starter Deck", imageUrl: "https://picsum.photos/seed/st05/600/800", releaseDate: "February 2026", msrp: "$15.99 USD", order: 5, contents: ["x1 Ready-to-play 50-card deck", "x10 Resource Cards"] },
      { id: "ST06", name: "ST06 - Clan Unity", category: "Starter Deck", imageUrl: "https://picsum.photos/seed/st06/600/800", releaseDate: "March 2026", msrp: "$15.99 USD", order: 6, contents: ["x1 Ready-to-play 50-card deck", "x10 Resource Cards"] },
      { id: "ST07", name: "ST07 - Celestial Drive", category: "Starter Deck", imageUrl: "https://picsum.photos/seed/st07/600/800", releaseDate: "March 2026", msrp: "$15.99 USD", order: 7, contents: ["x1 Ready-to-play 50-card deck", "x10 Resource Cards"] },
      { id: "ST08", name: "ST08 - Flash Radiance", category: "Starter Deck", imageUrl: "https://picsum.photos/seed/st08/600/800", releaseDate: "April 2026", msrp: "$15.99 USD", order: 8, contents: ["x1 Ready-to-play 50-card deck", "x10 Resource Cards"] },
      { id: "ST09", name: "ST09 - Destiny Ignition", category: "Starter Deck", imageUrl: "https://picsum.photos/seed/st09/600/800", releaseDate: "April 2026", msrp: "$15.99 USD", order: 9, contents: ["x1 Ready-to-play 50-card deck", "x10 Resource Cards"] },
    ];

    if (window.confirm("Seed ST01-ST09 mock products?")) {
      setStatusMessage("Seeding data...");
      for (const p of mockProducts) {
        await setDoc(doc(db, 'products', p.id), p);
      }
      setStatusMessage("Mock data seeded!");
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-300">
      <header className="p-4 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X size={20} />
          </button>
          <h2 className="text-lg font-black text-[#141414]">Product Listings Manager</h2>
        </div>
        <div className="flex items-center gap-2">
          {statusMessage && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 rounded-xl text-[10px] font-bold text-stone-600 animate-in fade-in slide-in-from-right-2">
              <Info size={12} className="text-amber-500" />
              {statusMessage}
            </div>
          )}

          {products.length === 0 && (
            <button 
              onClick={seedMockData}
              className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-bold hover:bg-amber-100 transition-all border border-amber-100"
            >
              <Sparkles size={14} />
              Seed ST01-ST09
            </button>
          )}

          <button 
            onClick={() => {
              setEditingProduct({
                name: '',
                category: 'Starter Deck',
                imageUrl: '',
                releaseDate: '',
                msrp: '',
                whereToBuy: [],
                featuredCards: [],
                contents: [],
                order: products.length + 1
              });
              setShowForm(true);
              mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#141414] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-stone-800 transition-all"
          >
            <Plus size={14} />
            Add New Product
          </button>
        </div>
      </header>

      <main ref={mainRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {showForm && editingProduct && (
          <div className="bg-stone-50 border border-stone-200 rounded-3xl p-6 space-y-6 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-stone-400">
                {editingProduct.id ? "Edit Product" : "New Product"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-stone-400 hover:text-stone-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400">Reference ID (Set Selection)</label>
                      <select 
                        value={editingProduct.id || ''} 
                        onChange={e => {
                          const newId = e.target.value;
                          const associatedCards = allCards
                            .filter(c => c.set === newId)
                            .map(c => ({ cardId: c.id, count: 1 }));
                            
                          setEditingProduct({ 
                            ...editingProduct, 
                            id: newId,
                            featuredCards: associatedCards.length > 0 ? associatedCards : editingProduct.featuredCards
                          });
                          
                          if (associatedCards.length > 0) {
                            setStatusMessage(`Auto-pulled ${associatedCards.length} cards from ${newId}`);
                            setTimeout(() => setStatusMessage(null), 3000);
                          }
                        }}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      >
                        <option value="">Select a Set Reference</option>
                        {ALL_SETS.map(set => (
                          <option key={set} value={set}>{set}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400">Product Name</label>
                      <input 
                        type="text" 
                        value={editingProduct.name || ''} 
                        onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400">Category</label>
                      <select 
                        value={editingProduct.category} 
                        onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value as any })}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs"
                      >
                        <option value="Starter Deck">Starter Deck</option>
                        <option value="Booster box">Booster box</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    {/* Image Section */}
                    <div className="space-y-1 col-span-2">
                      <label className="text-[10px] font-black uppercase text-stone-400">Product Image</label>
                      <div className="flex gap-4 items-start">
                        <div className="relative w-24 aspect-[3/4] bg-white border border-stone-200 rounded-xl overflow-hidden group shrink-0 shadow-sm">
                          {editingProduct.imageUrl ? (
                            <img 
                              src={editingProduct.imageUrl} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                              <ImageIcon size={24} strokeWidth={1} />
                            </div>
                          )}
                          <label className={cn(
                            "absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-[10px] font-bold",
                            (!editingProduct.id || uploading) && "cursor-not-allowed hidden"
                          )}>
                            <Upload size={16} className="mb-1" />
                            Upload
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*" 
                              onChange={handleImageUpload}
                              disabled={uploading || !editingProduct.id}
                            />
                          </label>
                          {uploading && (
                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                              <Loader2 size={16} className="animate-spin text-amber-500" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <input 
                            type="text" 
                            value={editingProduct.imageUrl || ''} 
                            onChange={e => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                            placeholder="Direct Image URL"
                            className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                          />
                          <p className="text-[9px] text-stone-400 italic">Select a Reference ID top-left before uploading.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400">Release Date</label>
                      <input 
                        type="text" 
                        value={editingProduct.releaseDate || ''} 
                        onChange={e => setEditingProduct({ ...editingProduct, releaseDate: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-stone-400">MSRP</label>
                      <input 
                        type="text" 
                        value={editingProduct.msrp || ''} 
                        onChange={e => setEditingProduct({ ...editingProduct, msrp: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 text-left">
                  {/* Contents Management */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase text-stone-400">Package Contents (One item per line)</label>
                    <textarea 
                      value={editingProduct.contents?.join('\n') || ''} 
                      onChange={e => {
                        const lines = e.target.value.split('\n');
                        setEditingProduct({ ...editingProduct, contents: lines });
                      }}
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-3 text-xs min-h-[160px] focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium leading-relaxed"
                      placeholder={"x1 Ready-to-play 50-card deck\nx10 Resource Cards\nx8 Token Cards..."}
                    />
                  </div>

                  {/* Featured Cards Management */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase text-stone-400">Featured Cards</label>
                      <span className="text-[10px] font-bold text-amber-600">Manual Selection</span>
                    </div>
                    
                    {/* Add Card Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" size={14} />
                      <input 
                        type="text" 
                        placeholder="Search cards to feature..."
                        value={cardSearchQuery}
                        onChange={e => setCardSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                      
                      {cardSearchQuery.length >= 2 && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto overflow-x-hidden p-1">
                          {allCards
                            .filter(c => 
                              c.name.toLowerCase().includes(cardSearchQuery.toLowerCase()) || 
                              c.cardNumber.toLowerCase().includes(cardSearchQuery.toLowerCase())
                            )
                            .slice(0, 10)
                            .map(card => (
                              <button
                                key={card.id}
                                type="button"
                                onClick={() => {
                                  const exists = editingProduct.featuredCards?.find(fc => fc.cardId === card.id);
                                  if (!exists) {
                                    setEditingProduct(prev => ({
                                      ...prev,
                                      featuredCards: [...(prev?.featuredCards || []), { cardId: card.id, count: 1 }]
                                    }));
                                  }
                                  setCardSearchQuery("");
                                }}
                                className="w-full flex items-center gap-3 p-2 hover:bg-stone-50 rounded-xl transition-colors text-left"
                              >
                                <img src={card.imageUrl} className="w-6 h-8 object-cover rounded shadow-sm" referrerPolicy="no-referrer" />
                                <div className="min-w-0">
                                  <p className="text-[10px] font-black text-[#141414] truncate">{card.name}</p>
                                  <p className="text-[8px] font-bold text-stone-400">{card.cardNumber}</p>
                                </div>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Featured Cards List */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {editingProduct.featuredCards && editingProduct.featuredCards.length > 0 ? (
                        editingProduct.featuredCards.map((fc, i) => {
                          const card = allCards.find(c => c.id === fc.cardId);
                          return (
                            <div key={fc.cardId} className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-2xl shadow-sm group">
                              <div className="flex items-center gap-3">
                                <img src={card?.imageUrl} alt="" className="w-8 h-10 object-cover rounded shadow-sm" referrerPolicy="no-referrer" />
                                <div>
                                  <p className="text-[10px] font-black text-[#141414]">{card?.name || fc.cardId}</p>
                                  <p className="text-[8px] font-bold text-stone-400">{card?.cardNumber}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 bg-stone-50 px-2 py-1 rounded-lg border border-stone-100">
                                  <span className="text-[9px] font-black text-stone-400 uppercase">Qty</span>
                                  <input 
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={fc.count}
                                    onChange={e => {
                                      const newCount = parseInt(e.target.value) || 1;
                                      setEditingProduct(prev => ({
                                        ...prev,
                                        featuredCards: prev?.featuredCards?.map((item, idx) => 
                                          idx === i ? { ...item, count: newCount } : item
                                        )
                                      }));
                                    }}
                                    className="w-10 bg-transparent text-xs font-black text-amber-600 text-center focus:outline-none"
                                  />
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveListItem('featuredCards', i)}
                                  className="p-1.5 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="w-full py-12 text-center border-2 border-dashed border-stone-100 rounded-[2rem] flex flex-col items-center gap-2">
                          <LayoutGrid size={24} className="text-stone-200" />
                          <p className="text-[10px] font-bold text-stone-400 italic">No featured cards added yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-stone-200">
                <button type="submit" className="flex-1 py-4 bg-[#141414] text-white font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-black/10 active:scale-95 transition-all">
                  <Save size={18} />
                  {editingProduct.id && products.find(p => p.id === editingProduct.id) ? "Update Product" : "Save New Product"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)} 
                  className="px-8 py-4 bg-white text-stone-500 font-bold rounded-2xl border border-stone-200 active:scale-95 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-400">
              Collection ({filteredProducts.length} items)
            </h3>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
              <input 
                type="text" 
                placeholder="Search products..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-stone-400 gap-3">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-xs font-bold">Connecting to inventory...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-2xl p-2.5 border border-stone-200 shadow-sm flex flex-col group hover:shadow-md transition-all duration-300">
                  <div className="aspect-[3/4] bg-stone-50 rounded-xl overflow-hidden mb-3 relative">
                    <img src={product.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-white/90 backdrop-blur-sm rounded-lg text-[7px] font-black uppercase tracking-widest shadow-sm">
                      {product.id}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div>
                      <p className="text-[7px] font-black text-amber-600 uppercase tracking-tighter">{product.category}</p>
                      <h4 className="text-[11px] font-black text-[#141414] leading-tight line-clamp-2">
                        {product.name.toLowerCase().startsWith(product.id.toLowerCase()) 
                          ? product.name.replace(new RegExp(`^${product.id}\\s*[-\\s]*`, 'i'), `${product.id} `)
                          : `${product.id} ${product.name}`}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-stone-50">
                      <span className="text-[9px] font-bold text-stone-400">{product.msrp}</span>
                      <div className="flex gap-0.5">
                        <button onClick={() => handleEdit(product)} className="p-1 text-stone-400 hover:text-amber-500 transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="p-1 text-stone-400 hover:text-red-500 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredProducts.length === 0 && !loading && (
            <div className="py-20 text-center bg-stone-50 rounded-3xl border border-dashed border-stone-200">
              <Package size={48} className="mx-auto text-stone-200 mb-4" />
              <p className="text-stone-400 font-medium italic">No products found in the database.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
