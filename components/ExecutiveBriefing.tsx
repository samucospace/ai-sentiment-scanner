'use client';

import React from 'react';
import { DailyDigest } from '@/lib/types';
import { Sparkles, TrendingUp, TrendingDown, CheckCircle, Newspaper, Lightbulb, Users } from 'lucide-react';

interface ExecutiveBriefingProps {
  digest: DailyDigest;
}

export function ExecutiveBriefing({ digest }: ExecutiveBriefingProps) {
  const industries = digest?.industries || [];

  const totalUseCases = industries.reduce(
    (acc, ind) => acc + (ind?.useCases?.length || 0),
    0
  );

  const avgWorkerSentiment = (
    (industries.reduce((acc, ind) => acc + (ind?.workerSentiment?.score ?? 0), 0) /
      Math.max(1, industries.length)) *
    100
  ).toFixed(0);

  const avgCustomerSentiment = (
    (industries.reduce((acc, ind) => acc + (ind?.customerSentiment?.score ?? 0), 0) /
      Math.max(1, industries.length)) *
    100
  ).toFixed(0);

  return (
    <div className="space-y-6">
      {/* Top Banner / Executive Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 p-6 md:p-8 text-white shadow-lg border border-indigo-500/20">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Daily AI Intelligence Briefing • {digest.date}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono">
              {digest.engineUsed && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-sans font-medium ${
                    digest.engineUsed.includes('Heuristic')
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      digest.engineUsed.includes('Heuristic')
                        ? 'bg-amber-400'
                        : 'bg-emerald-400 animate-pulse'
                    }`}
                  />
                  <span>Engine: {digest.engineUsed}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Newspaper className="w-3.5 h-3.5 text-slate-400" />
                {digest.totalArticlesScanned} Google Alert stories parsed
              </span>
              <span className="flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                {totalUseCases} use cases surfaced
              </span>
            </div>
          </div>

          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-3 max-w-4xl leading-snug">
            State of AI Across Professions & Industries
          </h1>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-4xl mb-6">
            {digest.executiveSummary}
          </p>

          {/* Key takeaways bullet points */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-slate-700/60">
            {digest.keyTakeaways.map((takeaway, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200"
              >
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-snug">{takeaway}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Quick Glance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Average Workforce Sentiment</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {Number(avgWorkerSentiment) > 0 ? `+${avgWorkerSentiment}%` : `${avgWorkerSentiment}%`}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {Number(avgWorkerSentiment) < 0 ? 'Guarded / Protective' : 'Receptive'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Focus on job security, liability, and cognitive offloading.
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Average Customer Sentiment</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {Number(avgCustomerSentiment) > 0 ? `+${avgCustomerSentiment}%` : `${avgCustomerSentiment}%`}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {Number(avgCustomerSentiment) > 0 ? 'Convenience-Driven' : 'Distrustful'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Demanding transparency, low cost, and fast resolution.
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-1">
            <span>Active Tracks Monitored</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {digest.industries.length} Industries
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {totalUseCases} Use Cases
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500">
            Healthcare, Legal, Payments, Finance, Tech & more.
          </div>
        </div>
      </div>
    </div>
  );
}
