'use client';

import React, { useState, useEffect } from 'react';
import { DailyDigest, FeedTrack, RawArticle } from '@/lib/types';
import { Navbar } from '@/components/Navbar';
import { ExecutiveBriefing } from '@/components/ExecutiveBriefing';
import { SentimentMatrix } from '@/components/SentimentMatrix';
import { UseCasesRadar } from '@/components/UseCasesRadar';
import { FeedManagerModal } from '@/components/FeedManagerModal';
import { SettingsModal } from '@/components/SettingsModal';
import { ArticleDetailModal } from '@/components/ArticleDetailModal';
import { RefreshCw, Sparkles, AlertCircle, Radar } from 'lucide-react';

export default function DashboardPage() {
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'matrix' | 'usecases'>('matrix');

  // Modal states
  const [isFeedManagerOpen, setIsFeedManagerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [feeds, setFeeds] = useState<FeedTrack[]>([]);

  // Source articles modal
  const [selectedArticles, setSelectedArticles] = useState<{
    industryName: string;
    articles: RawArticle[];
  } | null>(null);

  const [hasApiKey, setHasApiKey] = useState(false);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setHasApiKey(!!data.hasApiKey);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const fetchCurrentDigest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/digests');
      const data = await res.json();

      if (data.digests && data.digests.length > 0) {
        setDigest(data.digests[0]);
      } else {
        // Automatically trigger first scan
        await handleScan(false);
      }
    } catch (err: any) {
      console.error('Failed to load digest:', err);
      setError(err.message || 'Failed to connect to scanner API');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFeeds = async () => {
    try {
      const res = await fetch('/api/feeds');
      const data = await res.json();
      if (data.feeds) setFeeds(data.feeds);
    } catch (err) {
      console.error('Failed to load feeds:', err);
    }
  };

  const handleScan = async (force = true) => {
    setIsScanning(true);
    setError(null);
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (data.digest) {
        setDigest(data.digest);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setError(err.message || 'Error occurred while scanning feeds');
    } finally {
      setIsScanning(false);
      setIsLoading(false);
    }
  };

  const handleSaveFeeds = async (newFeeds: FeedTrack[]) => {
    const res = await fetch('/api/feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feeds: newFeeds }),
    });
    const data = await res.json();
    if (data.feeds) {
      setFeeds(data.feeds);
    }
  };

  useEffect(() => {
    fetchCurrentDigest();
    loadFeeds();
    loadSettings();
  }, []);

  // Collect all use cases across all industries
  const allUseCases = digest
    ? digest.industries.flatMap((ind) => ind.useCases)
    : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        currentDate={digest?.date || new Date().toISOString().split('T')[0]}
        isScanning={isScanning}
        onTriggerScan={() => handleScan(true)}
        onOpenFeedManager={() => setIsFeedManagerOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeView={activeView}
        onChangeView={setActiveView}
        hasApiKey={hasApiKey}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => handleScan(true)}
              className="text-xs font-semibold px-3 py-1 bg-rose-900/80 hover:bg-rose-800 rounded-lg text-white"
            >
              Retry Scan
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && !digest ? (
          <div className="text-center py-24 space-y-4">
            <div className="inline-flex p-4 rounded-2xl bg-indigo-950/60 border border-indigo-800 text-indigo-400">
              <Radar className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Parsing Live Google Alert & News Feeds...
            </h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Fetching real-time articles across 8 industry tracks and running dual-perspective sentiment analysis.
            </p>
          </div>
        ) : digest ? (
          <>
            {/* Executive Briefing Section */}
            <ExecutiveBriefing digest={digest} />

            {/* Main Tabs/View Section */}
            {activeView === 'matrix' ? (
              <SentimentMatrix
                industries={digest.industries}
                onSelectArticles={(industryName, articles) =>
                  setSelectedArticles({ industryName, articles })
                }
              />
            ) : (
              <UseCasesRadar useCases={allUseCases} />
            )}
          </>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>
          AI Industry Sentiment & Use Case Scanner • Tracking Google Alert digests & live industry feeds
        </p>
      </footer>

      {/* Modals */}
      <FeedManagerModal
        isOpen={isFeedManagerOpen}
        onClose={() => setIsFeedManagerOpen(false)}
        feeds={feeds}
        onSaveFeeds={handleSaveFeeds}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={() => {
          loadSettings();
          handleScan(true);
        }}
      />

      {selectedArticles && (
        <ArticleDetailModal
          isOpen={true}
          onClose={() => setSelectedArticles(null)}
          industryName={selectedArticles.industryName}
          articles={selectedArticles.articles}
        />
      )}
    </div>
  );
}
