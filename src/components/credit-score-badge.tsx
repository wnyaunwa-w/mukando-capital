import { cn } from "@/lib/utils";
import { ShieldCheck, ShieldAlert, Shield, Trophy } from "lucide-react";

export function CreditScoreBadge({ score }: { score: number }) {
  // Determine Tier
  let tier = "Unrated";
  let color = "bg-slate-100 text-slate-600 border-slate-200";
  let Icon = Shield;

  if (score >= 800) {
    tier = "Diamond";
    color = "bg-cyan-100 text-cyan-700 border-cyan-200";
    Icon = Trophy;
  } else if (score >= 700) {
    tier = "Gold";
    color = "bg-amber-100 text-amber-700 border-amber-200";
    Icon = ShieldCheck;
  } else if (score >= 600) {
    tier = "Silver";
    color = "bg-slate-100 text-slate-700 border-slate-200";
    Icon = Shield;
  } else if (score >= 500) {
    tier = "Bronze";
    color = "bg-orange-50 text-orange-700 border-orange-200";
    Icon = Shield;
  } else {
    tier = "Risk";
    color = "bg-red-100 text-red-700 border-red-200";
    Icon = ShieldAlert;
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wider", color)}>
      <Icon className="w-3.5 h-3.5" />
      <span>{score} • {tier}</span>
    </div>
  );
}