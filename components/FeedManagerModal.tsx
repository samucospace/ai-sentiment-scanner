'use client';

import React, { useState } from 'react';
import { FeedTrack } from '@/lib/types';
import { X, Rss, Plus, Trash2, Check, AlertCircle } from 'lucide-react';

interface FeedManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeds: FeedTrack[];
  onSaveFeeds: (feeds: FeedTrack[]) => Promise<void>;
}

export function FeedManagerModal({
  isOpen,
  onClose,
  feeds,
  onSaveFeeds,
}: FeedManagerModalProps) {
  const [localFeeds, setLocalFeeds] = useState<FeedTrack[]>(feeds);
  const [newName, setNewName] = useState('');
  const [newQuery, setNewQuery] = useState('');
  const [newRssUrl, setNewRssUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleToggleFeed = (id: string) => {
    setLocalFeeds((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const handleAddFeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || (!newQuery.trim() && !newRssUrl.trim())) return;

    const newFeed: FeedTrack = {
      id: `custom-feed-${Date.now()}`,
      name: newName.trim(),
      industryKey: 'custom',
      iconName: 'Sparkles',
      query: newQuery.trim() || newName.trim(),
      rssUrl: newRssUrl.trim() || undefined,
      description: 'Custom user-configured Google Alert / News feed.',
      enabled: true,
    };

    setLocalFeeds((prev) => [...prev, newFeed]);
    setNewName('');
    setNewQuery('');
    setNewRssUrl('');
  };

  const handleDeleteFeed = (id: string) => {
    setLocalFeeds((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveFeeds(localFeeds);
      onClose();
    } catch (err) {
      console.error('Failed to save feeds', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Rss className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Google Alert Feeds & Topics
              </h3>
              <p className="text-xs text-slate-500">
                Configure industry tracks, search keywords, or custom Google Alert RSS URLs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {/* Active Feeds List */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Tracked Industry Feeds ({localFeeds.filter((f) => f.enabled).length} Enabled)
            </h4>

            <div className="space-y-2">
              {localFeeds.map((feed) => (
                <div
                  key={feed.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <input
                      type="checkbox"
                      checked={feed.enabled}
                      onChange={() => handleToggleFeed(feed.id)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900 dark:text-white">
                          {feed.name}
                        </span>
                        {feed.rssUrl && (
                          <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded font-mono">
                            Custom RSS
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {feed.rssUrl || `Query: ${feed.query}`}
                      </p>
                    </div>
                  </div>

                  {feed.industryKey === 'custom' && (
                    <button
                      onClick={() => handleDeleteFeed(feed.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add New Feed Form */}
          <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-500" />
              <span>Add Custom Topic or Google Alert RSS URL</span>
            </h4>
            <form onSubmit={handleAddFeed} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Industry / Track Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Real Estate & Architecture"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Search Keywords (Optional if RSS provided)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AI architecture CAD blueprints"
                    value={newQuery}
                    onChange={(e) => setNewQuery(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Google Alert RSS URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://www.google.com/alerts/feeds/..."
                  value={newRssUrl}
                  onChange={(e) => setNewRssUrl(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
                >
                  Add Track
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
