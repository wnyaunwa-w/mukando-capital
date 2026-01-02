import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ✅ UPDATED: Now supports dynamic currency symbols (Default is "$")
export function formatCurrency(amountCents: number, symbol: string = "$") {
  const amount = amountCents / 100;
  
  // We use standard USD formatting for the numbers (commas/decimals)
  // then swap the symbol to whatever the group uses (e.g., "£", "R", "€")
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount).replace("$", symbol);
}