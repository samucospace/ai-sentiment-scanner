'use client';

import React, { useState } from 'react';
import { IndustryDigest, RawArticle } from '@/lib/types';
import { SentimentGauge } from './SentimentGauge';
import {
  Activity,
  Scale,
  GraduationCap,
  Landmark,
  Code,
  Palette,
  ShoppingBag,
  Cpu,
  Sparkles,
  ExternalLink,
  BookOpen,
  MessageSquareQuote,
  Lightbulb,
} from 'lucide-react';

interface SentimentMatrixProps {
  industries: IndustryDigest[];
  onSelectArticles: (industryName: string, articles: RawArticle[]) => void;
}

const ICON_MAP: Record<string, any> = {
  healthcare: Activity,
  legal: Scale,
  education: GraduationCap,
  finance: Landmark,
  software: Code,
  creative: Palette,
  retail: ShoppingBag,
  manufacturing: Cpu,
};

export function SentimentMatrix({ industries, onSelectArticles }: SentimentMatrixProps) {
  const [activeTab, setActiveTab] = useState<'all' | string>('all');

  const filteredIndustries =
    activeTab === 'all'
      ? industries
      : industries.filter((ind) => ind.industryKey === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Industry Sentiment Radar</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Dual Perspective
            </span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Comparing sentiment between people working inside the industry vs. customers & the public.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Tracks ({industries.length})
          </button>
          {industries.map((ind) => (
            <button
              key={ind.industryKey}
              onClick={() => setActiveTab(ind.industryKey)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                activeTab === ind.industryKey
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {ind.industryName.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Industry Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredIndustries.map((industry) => {
          const Icon = ICON_MAP[industry.industryKey] || Sparkles;

          return (
            <div
              key={industry.industryKey}
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between"
            >
              <div>
                {/* Card Header */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-slate-900 dark:text-white">
                        {industry.industryName}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {industry.topArticles.length} recent articles analyzed
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectArticles(industry.industryName, industry.topArticles)}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>View Sources</span>
                  </button>
                </div>

                {/* Summary */}
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-5 leading-relaxed bg-slate-50/60 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  {industry.summary}
                </p>

                {/* Dual Sentiment Gauges */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                  <SentimentGauge
                    type="worker"
                    score={industry.workerSentiment.score}
                    label={industry.workerSentiment.label}
                    rationale={industry.workerSentiment.rationale}
                    professions={industry.workerSentiment.professionsImpacted}
                  />
                  <SentimentGauge
                    type="customer"
                    score={industry.customerSentiment.score}
                    label={industry.customerSentiment.label}
                    rationale={industry.customerSentiment.rationale}
                  />
                </div>

                {/* Emerging Use Cases Preview */}
                {industry.useCases.length > 0 && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <span>Emerging AI Use Cases Identified:</span>
                    </div>
                    <div className="space-y-2">
                      {industry.useCases.slice(0, 2).map((uc) => (
                        <div
                          key={uc.id}
                          className="text-xs p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex flex-col gap-1.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {uc.title}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-medium shrink-0 border ${
                                uc.maturityStage === 'Production'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                                  : uc.maturityStage === 'Policy/Banned'
                                  ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300'
                                  : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                              }`}
                            >
                              {uc.maturityStage}
                            </span>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] line-clamp-2">
                            {uc.description}
                          </p>
                          {uc.sourceUrl && (
                            <a
                              href={uc.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-0.5 w-fit"
                            >
                              <span>Ref: {uc.sourceTitle}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
