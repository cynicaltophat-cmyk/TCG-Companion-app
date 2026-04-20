import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, Filter, Search, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Product } from '../../types';

interface ProductListProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onBack: () => void;
}

export const ProductList: React.FC<ProductListProps> = ({ products, onSelectProduct, onBack }) => {
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'Starter Deck' | 'Booster box'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products
    .filter(p => activeCategory === 'ALL' || p.category === activeCategory)
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const categories: ('ALL' | 'Starter Deck' | 'Booster box')[] = ['ALL', 'Starter Deck', 'Booster box'];

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
          <h1 className="text-xl font-black text-[#141414] tracking-tight absolute left-1/2 -translate-x-1/2">Product list</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </header>

      <div className="max-w-md mx-auto w-full p-4 space-y-6 pb-32">
        {/* Filters */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <span className="text-xs font-bold text-stone-500 whitespace-nowrap mr-2">Filter by category</span>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border shrink-0",
                  activeCategory === cat
                    ? "bg-[#141414] text-white border-[#141414]"
                    : "bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input 
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
            />
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map(product => (
            <motion.button
              key={product.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onSelectProduct(product)}
              className="flex flex-col text-left group"
            >
              <div className="aspect-[3/4] bg-stone-100 rounded-3xl overflow-hidden mb-3 border border-stone-200 shadow-sm relative group-hover:shadow-md transition-shadow duration-300">
                <img 
                  src={product.imageUrl} 
                  alt={product.name} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="px-1">
                <h2 className="text-[11px] font-black text-[#141414] leading-tight line-clamp-2 mb-1 uppercase tracking-tight">
                  {product.name.toLowerCase().startsWith(product.id.toLowerCase()) 
                    ? product.name.replace(new RegExp(`^${product.id}\\s*[-\\s]*`, 'i'), `${product.id} `)
                    : `${product.id} ${product.name}`}
                </h2>
                <p className="text-[10px] font-bold text-stone-500">MSRP: {product.msrp}</p>
              </div>
            </motion.button>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-stone-400 font-medium">No products found holding those search parameters.</p>
          </div>
        )}
      </div>
    </div>
  );
};
