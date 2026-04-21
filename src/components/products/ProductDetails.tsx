import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, HelpCircle, ExternalLink, Bookmark, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Product, GundamCard } from '../../types';

interface ProductDetailsProps {
  product: Product;
  allCards: GundamCard[];
  onBack: () => void;
  onSelectCard: (card: GundamCard) => void;
  onViewAll: (setId: string) => void;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({ 
  product, 
  allCards, 
  onBack,
  onSelectCard,
  onViewAll
}) => {
  const [showMsrpTooltip, setShowMsrpTooltip] = useState(false);

  const featuredCards = product.featuredCards?.map(fc => {
    const card = allCards.find(c => c.id === fc.cardId);
    return card ? { ...card, count: fc.count } : null;
  }).filter(Boolean) || [];

  return (
    <div className="flex-1 flex flex-col bg-white min-h-screen">
      <header className="sticky top-0 z-30 bg-white border-b border-stone-100 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between relative">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-stone-100 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-black text-[#141414] tracking-tight absolute left-1/2 -translate-x-1/2 capitalize">{product.category}</h1>
          <button className="p-2 -mr-2 rounded-full hover:bg-stone-100 transition-colors text-stone-300">
            <Bookmark size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto w-full pb-32">
        {/* Hero Section */}
        <div className="p-6 flex flex-col items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="aspect-[3/4] w-64 bg-stone-100 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/10 border-4 border-white relative mb-8"
          >
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          <div className="w-full text-left space-y-4">
            <h2 className="text-2xl font-black text-[#141414] leading-tight uppercase tracking-tight">
              {product.name.toLowerCase().startsWith(product.id.toLowerCase()) 
                ? product.name.replace(new RegExp(`^${product.id}\\s*[-\\s]*`, 'i'), `${product.id} `)
                : `${product.id} ${product.name}`}
            </h2>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Release date</span>
                <span className="text-[11px] font-bold text-[#141414]">{product.releaseDate}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">MSRP</span>
                <div 
                  className="flex items-center gap-1.5 cursor-help group"
                  onClick={() => setShowMsrpTooltip(true)}
                >
                  <span className="text-[11px] font-bold text-[#141414]">{product.msrp}</span>
                  <HelpCircle size={16} className="text-amber-500 hover:text-amber-600 transition-colors" />
                </div>
              </div>
            </div>

            {/* Where to buy */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Where to buy</span>
                <HelpCircle size={14} className="text-stone-300 hover:text-stone-400" />
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Dynamic Carousell Button */}
                {(() => {
                  const formattedName = product.name.toLowerCase().startsWith(product.id.toLowerCase()) 
                    ? product.name.replace(new RegExp(`^${product.id}\\s*[-\\s]*`, 'i'), `${product.id} `)
                    : `${product.id} ${product.name}`;
                  
                  return (
                    <a 
                      href={`https://www.carousell.sg/search/${encodeURIComponent(formattedName)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-[10px] font-black text-[#C86891] hover:bg-[#C86891]/5 transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      Carousell
                      <ExternalLink size={10} className="opacity-50" />
                    </a>
                  );
                })()}

                {product.whereToBuy?.map((shop, i) => (
                  <a 
                    key={i}
                    href={shop.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-[10px] font-black text-[#141414] hover:bg-stone-100 transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    {shop.name}
                    <ExternalLink size={10} className="text-stone-300" />
                  </a>
                ))}

                {(!product.whereToBuy || product.whereToBuy.length === 0) && (
                  ['Local game stores', 'Whatsapp marketplace'].map(shop => (
                    <button key={shop} className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-[10px] font-black text-[#141414] hover:bg-stone-100 transition-colors shadow-sm">
                      {shop}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Featured Cards */}
            <div className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Featured cards</h3>
                <button 
                  onClick={() => onViewAll(product.id)}
                  className="text-[10px] font-black text-amber-500 uppercase tracking-widest hover:text-amber-600 transition-colors"
                >
                  View all
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-show">
                {featuredCards.length > 0 ? (
                  featuredCards.map((card: any) => (
                    <div 
                      key={card.id} 
                      className="shrink-0 flex flex-col gap-1.5"
                      onClick={() => onSelectCard(card)}
                    >
                      <div className="w-24 aspect-[2/3] bg-stone-100 rounded-xl overflow-hidden border border-stone-100 relative shadow-sm">
                        <img src={card.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-white/90 backdrop-blur-sm rounded text-[8px] font-black">
                          x{card.count}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  [1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="shrink-0 flex flex-col gap-1.5">
                      <div className="w-24 aspect-[2/3] bg-stone-100 rounded-xl border border-dashed border-stone-200 flex items-center justify-center relative">
                        <span className="text-[8px] font-black text-stone-300">x{i}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Contents */}
            <div className="pt-4 p-6 bg-white border border-stone-200 rounded-[2rem] text-[#141414] space-y-4">
              <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Contents</h3>
              <ul className="space-y-2">
                {product.contents?.map((item, i) => (
                  <li key={i} className="text-xs font-bold flex items-start gap-3">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-1 shrink-0" />
                    <span className="leading-tight">{item}</span>
                  </li>
                )) || (
                  <li className="text-xs font-bold text-stone-300 italic">No contents listed</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* MSRP Tooltip Overlay */}
      <AnimatePresence>
        {showMsrpTooltip && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowMsrpTooltip(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowMsrpTooltip(false)}
                className="absolute top-4 right-4 p-2 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X size={20} className="text-stone-400" />
              </button>

              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-2">
                <HelpCircle size={24} className="text-amber-500" />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-black text-[#141414] leading-tight">About MSRP</h3>
                <div className="space-y-4 text-sm text-stone-600 leading-relaxed font-medium">
                  <p>
                    <span className="font-bold text-[#141414]">MSRP (Manufacturer’s Suggested Retail Price)</span> is the price set by the manufacturer as a recommended selling price.
                  </p>
                  <p>
                    Local stores and online sellers may charge more or less than MSRP due to factors like import costs, demand, or limited supply.
                  </p>
                  <p className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs">
                    While actual prices may vary, MSRP is a useful baseline to help you spot when a product may be overpriced.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowMsrpTooltip(false)}
                className="w-full py-4 bg-[#141414] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-stone-800 transition-all shadow-lg shadow-black/10 mt-2"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
