import { cn } from "@/lib/utils";

interface CreditScoreGaugeProps {
  score: number;
  maxScore?: number;
}

export function CreditScoreGauge({ score, maxScore = 800 }: CreditScoreGaugeProps) {
  // 1. Determine Tier and Color Theme based on score out of 800
  let tier = "Low";
  let colorClass = "text-red-500";
  let bgColorClass = "bg-red-100";
  let borderColorClass = "border-red-200";

  if (score >= 750) {
    tier = "Excellent";
    colorClass = "text-blue-600";
    bgColorClass = "bg-blue-100";
    borderColorClass = "border-blue-200";
  } else if (score >= 650) {
    tier = "Good";
    colorClass = "text-emerald-600";
    bgColorClass = "bg-emerald-100";
    borderColorClass = "border-emerald-200";
  } else if (score >= 500) {
    tier = "Fair";
    colorClass = "text-amber-600";
    bgColorClass = "bg-amber-100";
    borderColorClass = "border-amber-200";
  }

  // 2. Calculate SVG Progress
  // We use a radius of 45 within a 100x100 viewBox
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  // Ensure score doesn't exceed maxScore for calculation
  const clampedScore = Math.min(Math.max(score, 0), maxScore);
  const progressPercentage = (clampedScore / maxScore);
  // Calculate the offset to hide the part of the circle that isn't filled
  const dashOffset = circumference * (1 - progressPercentage);

  return (
    <div className="flex flex-col items-center justify-center">
      {/* Circular Gauge Container */}
      <div className="relative w-40 h-40">
        <svg className="w-full h-full" viewBox="0 0 100 100">
          {/* Background Circle (Gray track) */}
          <circle
            className="text-slate-200 stroke-current"
            strokeWidth="8"
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
          />
          {/* Progress Arc (Colored) */}
          {/* rotate(-90 50 50) starts the progress from the top */}
          <circle
            className={cn("stroke-current transition-all duration-1000 ease-out", colorClass)}
            strokeWidth="8"
            strokeLinecap="round"
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 50 50)"
          />
        </svg>
        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-4xl font-bold leading-none", colorClass)}>
            {score}
          </span>
          <span className="text-sm text-slate-500 font-medium mt-1">
            out of {maxScore}
          </span>
        </div>
      </div>

      {/* Tier Label (`Low`, `Fair`, etc.) */}
      <div className={cn("mt-3 px-4 py-1.5 rounded-full text-sm font-bold border uppercase tracking-wider", bgColorClass, colorClass, borderColorClass)}>
        {tier}
      </div>
    </div>
  );
}