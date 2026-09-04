'use client';

import React, { useState, useMemo } from 'react';
import { ExtractedUseCase } from '@/lib/types';
import {
  Lightbulb,
  ExternalLink,
  Search,
  AlertOctagon,
  Cpu,
  Users,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

interface UseCasesRadarProps {
  useCases: ExtractedUseCase[];
}

export function UseCasesRadar({ useCases }: UseCasesRadarProps) {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [selectedMaturity, setSelectedMaturity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const industries = useMemo(() => {
    const set = new Set(useCases.map((u) => u.industry));
    return Array.from(set);
  }, [useCases]);

  const filteredUseCases = useMemo(() => {
    return useCases.filter((uc) => {
      const matchIndustry =
        selectedIndustry === 'all' || uc.industry === selectedIndustry;
      const matchMaturity =
        selectedMaturity === 'all' || uc.maturityStage === selectedMaturity;
      const matchSearch =
        !searchQuery ||
        uc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        uc.problemSolved.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (uc.howItWorks && uc.howItWorks.toLowerCase().includes(searchQuery.toLowerCase())) ||
        uc.industry.toLowerCase().includes(searchQuery.toLowerCase());

      return matchIndustry && matchMaturity && matchSearch;
    });
  }, [useCases, selectedIndustry, selectedMaturity, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <span>Emerging AI Use Cases Radar</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              {filteredUseCases.length} Actionable Use Cases
            </span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Concrete applications, problem-solution breakdowns, and verified publisher citations.
          </p>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search problem or use case..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52 sm:w-64"
            />
          </div>

          {/* Industry Filter */}
          <select
            value={selectedIndustry}
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Industries</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>

          {/* Maturity Filter */}
          <select
            value={selectedMaturity}
            onChange={(e) => setSelectedMaturity(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Maturity Stages</option>
            <option value="Production">Production Deployments</option>
            <option value="Pilot">Active Pilots</option>
            <option value="Research">Research & Experiments</option>
            <option value="Policy/Banned">Policy Guardrails & Bans</option>
          </select>
        </div>
      </div>

      {filteredUseCases.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8">
          <p className="text-sm text-slate-500">No use cases match your filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredUseCases.map((uc) => {
            const getBadgeColor = (stage: string) => {
              switch (stage) {
                case 'Production':
                  return 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                case 'Pilot':
                  return 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
                case 'Research':
                  return 'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
                case 'Policy/Banned':
                  return 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800';
                default:
                  return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
              }
            };

            return (
              <div
                key={uc.id}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-5"
              >
                <div className="space-y-4">
                  {/* Top tags */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {uc.industry}
                    </span>
                    <span
                      className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${getBadgeColor(
                        uc.maturityStage
                      )}`}
                    >
                      {uc.maturityStage === 'Policy/Banned' ? (
                        <ShieldAlert className="w-3 h-3" />
                      ) : (
                        <CheckCircle2 className="w-3 h-3" />
                      )}
                      <span>{uc.maturityStage}</span>
                    </span>
                  </div>

                  {/* Use Case Name */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {uc.title}
                  </h3>

                  {/* 1. Problem Solved Section */}
                  <div className="rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>The Problem Being Solved:</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {uc.problemSolved}
                    </p>
                  </div>

                  {/* 2. How AI Works */}
                  {uc.howItWorks && (
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                        <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                        <span>How AI Solves It:</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {uc.howItWorks}
                      </p>
                    </div>
                  )}

                  {/* 3. Beneficiaries & Key Benefit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {uc.targetUsers && (
                      <div className="p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">
                          Target Users:
                        </span>
                        <span className="text-slate-700 dark:text-slate-200 font-medium">
                          {uc.targetUsers}
                        </span>
                      </div>
                    )}
                    {uc.keyBenefit && (
                      <div className="p-2.5 rounded-lg bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400 uppercase block mb-0.5">
                          Key Impact:
                        </span>
                        <span className="text-slate-700 dark:text-slate-200 font-medium">
                          {uc.keyBenefit}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Citation link */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                  <div className="truncate text-slate-400 text-[11px]">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Source: </span>
                    {uc.sourceTitle}
                  </div>
                  <a
                    href={uc.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline shrink-0"
                  >
                    <span>Read Full Article</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
