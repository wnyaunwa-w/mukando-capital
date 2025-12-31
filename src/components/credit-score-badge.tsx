"use client";

import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function CreditScoreBadge({ score }: { score: number }) {
  
  // Same logic as Gauge for consistency
  const getConfig = (s: number) => {
    if (s >= 800) return "bg-amber-100 text-amber-700 border-amber-200";
    if (s >= 700) return "bg-purple-100 text-purple-700 border-purple-200";
    if (s >= 500) return "bg-blue-100 text-blue-700 border-blue-200";
    if (s >= 400) return "bg-emerald-100 text-emerald-700 border-emerald-200"; // Good
    if (s >= 300) return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-red-100 text-red-700 border-red-200";
  };

  const colorClass = getConfig(score);

  return (
    <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold shadow-sm", colorClass)}>
      <ShieldCheck className="w-3.5 h-3.5" />
      <span>{score} • MUKANDO SCORE</span>
    </div>
  );
}