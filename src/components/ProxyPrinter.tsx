import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Download, Loader2, Image as ImageIcon } from 'lucide-react';
import { toPng } from 'html-to-image';
import { Deck, DeckItem } from '../types';
import { cn } from '../lib/utils';

interface ProxyPrinterProps {
  deck: Deck;
  onClose: () => void;
}

export const ProxyPrinter: React.FC<ProxyPrinterProps> = ({ deck, onClose }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Flatten deck items into a single array of cards based on their count
  const flattenedCards = React.useMemo(() => {
    const cards: { imageUrl: string; name: string }[] = [];
    deck.items.forEach(item => {
      const imageUrl = item.card.variants 
        ? item.card.variants.find(v => v.type === item.artType)?.imageUrl || item.card.imageUrl
        : (item.artType === "Parallel" && item.card.altImageUrl ? item.card.altImageUrl : item.card.imageUrl);
      
      for (let i = 0; i < item.count; i++) {
        cards.push({ imageUrl, name: item.card.name });
      }
    });
    return cards;
  }, [deck]);

  // Split cards into pages of 9
  const pages = React.useMemo(() => {
    const p = [];
    for (let i = 0; i < flattenedCards.length; i += 9) {
      p.push(flattenedCards.slice(i, i + 9));
    }
    return p;
  }, [flattenedCards]);

  const handleDownload = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      for (let i = 0; i < pageRefs.current.length; i++) {
        const pageRef = pageRefs.current[i];
        if (pageRef) {
          // Wait a bit for images to be fully ready if needed, 
          // though crossOrigin="anonymous" should handle most cases
          const dataUrl = await toPng(pageRef, {
            pixelRatio: 2, // Higher quality
            backgroundColor: '#ffffff',
          });
          
          const link = document.createElement('a');
          link.download = `${deck.name.replace(/\s+/g, '_')}_Page_${i + 1}.png`;
          link.href = dataUrl;
          link.click();
          
          // Small delay between downloads to avoid browser throttling
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error('Error generating PNGs:', error);
      alert('Failed to generate images. Please ensure all card images are loaded correctly.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-stone-900/90 backdrop-blur-md flex flex-col"
    >
      {/* Header */}
      <div className="p-3 md:p-4 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="p-1.5 md:p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0">
            <ImageIcon size={18} className="md:w-5 md:h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm md:text-lg leading-none truncate">Download Proxies</h2>
            <p className="text-[8px] md:text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-0.5 md:mt-1 truncate">
              {deck.name} • {flattenedCards.length} Cards
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className="flex items-center gap-1.5 md:gap-2 px-3 md:px-6 py-1.5 md:py-2 bg-[#141414] text-white rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest hover:bg-stone-800 transition-all active:scale-95 shadow-lg shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 size={14} className="animate-spin md:w-4 md:h-4" />
                <span className="hidden xs:inline">Generating...</span>
                <span className="xs:hidden">...</span>
              </>
            ) : (
              <>
                <Download size={14} className="md:w-4 md:h-4" />
                <span className="hidden xs:inline">Download PNGs</span>
                <span className="xs:hidden">PNGs</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 md:p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-all"
          >
            <X size={20} className="md:w-6 md:h-6" />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center gap-4 md:gap-8 bg-stone-100/50">
        <div className="max-w-4xl w-full">
          <div className="bg-amber-50 border border-amber-200 p-3 md:p-4 rounded-xl md:rounded-2xl flex items-start gap-3">
            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg shrink-0">
              <Download size={14} className="md:w-4 md:h-4" />
            </div>
            <div className="text-[10px] md:text-xs text-amber-800 leading-relaxed">
              <p className="font-bold mb-0.5 md:mb-1 uppercase tracking-wider">Download Info:</p>
              <p className="opacity-80">
                PNGs are sized for A4 printing at 300 DPI. For best results, print at 100% scale.
              </p>
            </div>
          </div>
        </div>

        {pages.map((page, pageIndex) => (
          <div 
            key={pageIndex}
            className="w-full flex justify-center overflow-hidden shrink-0"
            style={{ height: 'calc(297mm * var(--page-scale, 1))' }}
          >
            {/* Scaling container for mobile */}
            <div className="relative origin-top transition-transform duration-300"
                 style={{ 
                   transform: 'scale(var(--page-scale, 1))',
                   width: '210mm', 
                   height: '297mm',
                 }}>
              <div 
                ref={el => { pageRefs.current[pageIndex] = el; }}
                className="bg-white shadow-2xl relative overflow-hidden flex items-center justify-center"
                style={{
                  width: '210mm',
                  height: '297mm',
                  minWidth: '210mm',
                  minHeight: '297mm',
                }}
              >
                {/* Extended Guiding Lines */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Vertical Lines */}
                  {[10.5, 73.5, 136.5, 199.5].map(x => (
                    <div 
                      key={`v-${x}`}
                      className="absolute top-0 bottom-0 border-l border-stone-200"
                      style={{ left: `${x}mm` }}
                    />
                  ))}
                  {/* Horizontal Lines */}
                  {[16.5, 104.5, 192.5, 280.5].map(y => (
                    <div 
                      key={`h-${y}`}
                      className="absolute left-0 right-0 border-t border-stone-200"
                      style={{ top: `${y}mm` }}
                    />
                  ))}
                </div>

                {/* 3x3 Grid centered */}
                <div 
                  className="grid grid-cols-3 relative z-10"
                  style={{
                    width: '189mm', // 3 * 63mm
                    height: '264mm', // 3 * 88mm
                  }}
                >
                  {page.map((card, cardIndex) => (
                    <div 
                      key={cardIndex}
                      className="relative"
                      style={{
                        width: '63mm',
                        height: '88mm',
                      }}
                    >
                      <img 
                        src={card.imageUrl} 
                        alt={card.name}
                        className="w-full h-full object-fill"
                        style={{ imageRendering: 'auto' }}
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        :root {
          --page-scale: 0.4;
        }
        @media (min-width: 400px) {
          :root { --page-scale: 0.5; }
        }
        @media (min-width: 640px) {
          :root { --page-scale: 0.7; }
        }
        @media (min-width: 768px) {
          :root { --page-scale: 1; }
        }
      `}} />
    </motion.div>
  );
};
