import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getColorBg(color: string) {
  switch (color) {
    case 'Red': return 'bg-red-500';
    case 'Blue': return 'bg-blue-500';
    case 'Green': return 'bg-emerald-500';
    case 'White': return 'bg-stone-200';
    case 'Black': return 'bg-stone-900';
    case 'Yellow': return 'bg-amber-400';
    case 'Purple': return 'bg-purple-500';
    default: return 'bg-stone-200';
  }
}

export type PriceDisplayMode = 'JPY' | 'SGD120' | 'SGD130';

export function formatPrice(price: string | null, mode: PriceDisplayMode) {
  if (!price) return null;
  if (mode === 'JPY') return price;
  
  const yenValue = parseInt(price.replace(/[¥,]/g, ''));
  if (isNaN(yenValue)) return null;
  
  const divisor = mode === 'SGD120' ? 120 : 130;
  return `S$${(yenValue / divisor).toFixed(2)}`;
}

export function formatCurrency(yenValue: number, mode: PriceDisplayMode) {
  if (mode === 'JPY') return `¥${yenValue.toLocaleString()}`;
  const divisor = mode === 'SGD120' ? 120 : 130;
  return `S$${(yenValue / divisor).toFixed(2)}`;
}
