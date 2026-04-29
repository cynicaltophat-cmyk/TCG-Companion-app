import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layout, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

// Simple global cache to track loaded image URLs across component remounts
const loadedImageCache = new Set<string>();

interface ProgressiveImageProps {
  src: string;
  className?: string;
  imageClassName?: string;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  alt?: string;
  showIcon?: boolean;
  priority?: boolean;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({ 
  src, 
  className, 
  imageClassName, 
  referrerPolicy, 
  alt = "",
  showIcon = true,
  priority = false
}) => {
  const [isLoaded, setIsLoaded] = useState(loadedImageCache.has(src));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;
    
    // If not in cache, start loading
    if (!loadedImageCache.has(src)) {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setIsLoaded(true);
        loadedImageCache.add(src);
      };
      img.onerror = () => {
        setError(true);
      };
    } else {
      setIsLoaded(true);
      setError(false);
    }
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden w-full h-full bg-stone-100", className)}>
      {/* Placeholder - Simple CSS visibility instead of Framer Motion */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100 z-0">
          {showIcon ? (
            <Layout className="text-stone-300 animate-pulse" size={className?.includes('w-9') ? 16 : 24} strokeWidth={1} />
          ) : (
            <Loader2 className="text-stone-300 animate-spin" size={className?.includes('w-9') ? 16 : 24} />
          )}
        </div>
      )}

      {(src && !error) && (
        <img
          src={src}
          alt={alt}
          referrerPolicy={referrerPolicy}
          onLoad={() => {
            setIsLoaded(true);
            loadedImageCache.add(src);
          }}
          loading={priority ? "eager" : "lazy"}
          className={cn(
            "w-full h-full transition-opacity duration-300 ease-out",
            imageClassName,
            isLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-4 text-center bg-stone-100">
          <p className="text-[10px] text-stone-400 font-medium leading-tight">
            Image unavailable
          </p>
        </div>
      )}
    </div>
  );
};
