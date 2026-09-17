'use client';

import React from 'react';
import {
  Radar,
  RefreshCw,
  Settings,
  Rss,
  Sparkles,
  Calendar,
  Layers,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';
import { ActiveDashboardView } from '@/lib/types';

interface NavbarProps {
  currentDate: string;
  isScanning: boolean;
  onTriggerScan: () => void;
  onOpenFeedManager: () => void;
  onOpenSettings: () => void;
  activeView: ActiveDashboardView;
  onChangeView: (view: ActiveDashboardView) => void;
  hasApiKey?: boolean;
}

export function Navbar({
  currentDate,
  isScanning,
  onTriggerScan,
  onOpenFeedManager,
  onOpenSettings,
  activeView,
  onChangeView,
  hasApiKey = false,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Radar className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                AI Sentiment & Use Case Scanner
              </span>
              <span className="hidden sm:inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Live Alert Ingest
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Daily Google Alert Intelligence Tracker
            </span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium">
          <button
            onClick={() => onChangeView('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeView === 'matrix'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sentiment Matrix</span>
          </button>
          <button
            onClick={() => onChangeView('usecases')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeView === 'usecases'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Use Cases Radar</span>
          </button>
          <button
            onClick={() => onChangeView('trends')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeView === 'trends'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-semibold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Sentiment Trends</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Scan Now button */}
          <button
            onClick={onTriggerScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 text-white text-xs sm:text-sm font-medium shadow-sm transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning Feeds...' : 'Scan Alerts Now'}</span>
          </button>

          {/* Feeds Manager */}
          <button
            onClick={onOpenFeedManager}
            title="Manage Google Alert Feeds & Topics"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Rss className="w-4 h-4" />
          </button>

          {/* Settings / API Key */}
          <button
            onClick={onOpenSettings}
            title={hasApiKey ? 'LLM API Key Active' : 'No API Key set (Running Heuristic Engine)'}
            className="relative p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span
              className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${
                hasApiKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile View Switcher Tabs */}
      <div className="flex md:hidden items-center justify-around border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1.5 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
        <button
          onClick={() => onChangeView('matrix')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
            activeView === 'matrix'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Matrix</span>
        </button>
        <button
          onClick={() => onChangeView('usecases')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
            activeView === 'usecases'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Use Cases</span>
        </button>
        <button
          onClick={() => onChangeView('trends')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all ${
            activeView === 'trends'
              ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Trends</span>
        </button>
      </div>
    </header>
  );
}
