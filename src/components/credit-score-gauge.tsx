"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CreditScoreGaugeProps {
  score: number;
}

export function CreditScoreGauge({ score }: CreditScoreGaugeProps) {
  // --- CONFIGURATION BASED ON YOUR NEW RULES ---
  const getConfig = (s: number) => {
    if (s >= 800) return { 
        label: "PERFECT", 
        color: "text-amber-500", 
        stroke: "stroke-amber-500", 
        bg: "bg-amber-100", 
        badgeText: "text-amber-700" 
    };
    if (s >= 700) return { 
        label: "EXCELLENT", 
        color: "text-purple-600", 
        stroke: "stroke-purple-600", 
        bg: "bg-purple-100", 
        badgeText: "text-purple-700" 
    };
    if (s >= 500) return { 
        label: "VERY GOOD", 
        color: "text-blue-600", 
        stroke: "stroke-blue-600", 
        bg: "bg-blue-100", 
        badgeText: "text-blue-700" 
    };
    if (s >= 400) return { 
        label: "GOOD", 
        color: "text-emerald-500", // Green
        stroke: "stroke-emerald-500", 
        bg: "bg-emerald-100", 
        badgeText: "text-emerald-700" 
    };
    if (s >= 300) return { 
        label: "LOW", 
        color: "text-orange-500", 
        stroke: "stroke-orange-500", 
        bg: "bg-orange-100", 
        badgeText: "text-orange-700" 
    };
    return { 
        label: "BAD", 
        color: "text-red-500", 
        stroke: "stroke-red-500", 
        bg: "bg-red-100", 
        badgeText: "text-red-700" 
    };
  };

  const config = getConfig(score);
  
  // Calculate SVG Circle properties
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  // Max score is 800 for the visual calculation
  const percentage = Math.min(Math.max(score / 800, 0), 1);
  const offset = circumference - percentage * circumference;

  return (
    <div className="flex flex-col items-center justify-center relative">
      <div className="relative h-40 w-40 flex items-center justify-center">
        {/* Background Circle */}
        <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 120 120">
          <circle
            className="text-slate-100"
            strokeWidth="12"
            stroke="currentColor"
            fill="transparent"
            r="50"
            cx="60"
            cy="60"
          />
          {/* Progress Circle */}
          <circle
            className={cn("transition-all duration-1000 ease-out", config.stroke)}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="50"
            cx="60"
            cy="60"
          />
        </svg>

        {/* Text in Middle */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-4xl font-bold transition-colors", config.color)}>
            {score}
          </span>
          <span className="text-xs text-slate-400 font-medium">out of 800</span>
        </div>
      </div>

      {/* Status Badge */}
      <div className={cn("mt-4 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider shadow-sm", config.bg, config.badgeText)}>
        {config.label}
      </div>
    </div>
  );
}