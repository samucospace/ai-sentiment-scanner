'use client';

import React from 'react';

interface SentimentGaugeProps {
  score: number; // -1.0 to 1.0
  label: string;
  type: 'worker' | 'customer';
  rationale?: string;
  quotes?: string[];
  professions?: string[];
}

export function SentimentGauge({
  score,
  label,
  type,
  rationale,
  quotes,
  professions,
}: SentimentGaugeProps) {
  // Map -1.0 ... 1.0 to percentage 0% ... 100%
  const normalizedPercent = Math.round(((score + 1) / 2) * 100);

  // Determine color theme based on score
  const getColorClass = (s: number) => {
    if (s <= -0.35) return { bg: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
    if (s < 0.1) return { bg: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
    return { bg: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' };
  };

  const colors = getColorClass(score);

  return (
    <div className="rounded-xl bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {type === 'worker' ? '👷' : '👥'}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {type === 'worker' ? 'Workforce / Practitioners' : 'Customers / End-Users'}
            </span>
          </div>
          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${colors.badge}`}>
            {label}
          </span>
        </div>

        {/* Progress Bar Gauge */}
        <div className="my-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
            <span>Critical (-1.0)</span>
            <span className={`font-bold ${colors.text}`}>
              {score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2)} ({normalizedPercent}%)
            </span>
            <span>Enthusiastic (+1.0)</span>
          </div>
          <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
            <div
              className={`h-full ${colors.bg} transition-all duration-500 ease-out`}
              style={{ width: `${normalizedPercent}%` }}
            />
          </div>
        </div>

        {rationale && (
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            {rationale}
          </p>
        )}
      </div>

      {professions && professions.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-wrap gap-1.5 items-center">
          <span className="text-[10px] text-slate-400 font-medium uppercase">Roles:</span>
          {professions.slice(0, 3).map((role, idx) => (
            <span
              key={idx}
              className="text-[11px] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700"
            >
              {role}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
