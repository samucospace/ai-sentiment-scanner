'use client';

import React, { useState, useMemo } from 'react';
import { DailyDigest, RawArticle, LinkedInTopicSuggestion } from '@/lib/types';
import { generateLinkedInTopics } from '@/lib/linkedin';
import {
  Newspaper,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Search,
  Filter,
  Sparkles,
  Lightbulb,
  MessageSquare,
  Users,
  ShieldAlert,
  Flame,
  ArrowRight,
  BookOpen,
  Send,
  FileText,
  Layers,
} from 'lucide-react';

interface HeadlinesLinkedInTabProps {
  digest: DailyDigest;
}

export function HeadlinesLinkedInTab({ digest }: HeadlinesLinkedInTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeModalTopic, setActiveModalTopic] = useState<LinkedInTopicSuggestion | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'topics' | 'headlines'>('all');

  // Generate or use stored 3 LinkedIn topics
  const linkedInTopics = useMemo(() => {
    if (digest.linkedInTopics && digest.linkedInTopics.length === 3) {
      return digest.linkedInTopics;
    }
    return generateLinkedInTopics(digest);
  }, [digest]);

  // Aggregate all articles across industries
  const allArticlesWithContext = useMemo(() => {
    const list: Array<RawArticle & { industryName: string; industryKey: string }> = [];
    const seenUrls = new Set<string>();

    for (const ind of digest.industries || []) {
      for (const art of ind.topArticles || []) {
        if (!art.link || !seenUrls.has(art.link)) {
          if (art.link) seenUrls.add(art.link);
          list.push({
            ...art,
            industryName: ind.industryName,
            industryKey: ind.industryKey,
          });
        }
      }
    }
    return list;
  }, [digest]);

  // Unique industry list for filter
  const industriesList = useMemo(() => {
    const unique = new Set((digest.industries || []).map((i) => i.industryName));
    return Array.from(unique);
  }, [digest]);

  // Filtered headlines
  const filteredArticles = useMemo(() => {
    return allArticlesWithContext.filter((art) => {
      const matchIndustry =
        selectedIndustry === 'all' || art.industryName === selectedIndustry;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        art.title.toLowerCase().includes(q) ||
        art.snippet.toLowerCase().includes(q) ||
        art.source.toLowerCase().includes(q) ||
        art.industryName.toLowerCase().includes(q);

      return matchIndustry && matchSearch;
    });
  }, [allArticlesWithContext, selectedIndustry, searchQuery]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner / Studio Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/80 to-slate-900 p-6 md:p-8 text-white border border-indigo-500/30 shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold uppercase tracking-wider">
              <Newspaper className="w-3.5 h-3.5 text-blue-400" />
              <span>Daily Intelligence Feed • {digest.date}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Daily Headlines & LinkedIn Thought Leadership
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Full collection of raw Google Alert stories ingested for this date, paired with 3 structured LinkedIn post blueprints designed for executive reach and practitioner debate.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <div className="px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-center min-w-[110px]">
              <div className="text-2xl font-bold text-white">{allArticlesWithContext.length}</div>
              <div className="text-[11px] text-slate-400 font-medium">Headlines Today</div>
            </div>
            <div className="px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-center min-w-[110px]">
              <div className="text-2xl font-bold text-indigo-400">{industriesList.length}</div>
              <div className="text-[11px] text-slate-400 font-medium">Tracked Sectors</div>
            </div>
            <div className="px-4 py-3 rounded-xl bg-blue-900/40 border border-blue-500/40 text-center min-w-[110px]">
              <div className="text-2xl font-bold text-blue-300">3</div>
              <div className="text-[11px] text-blue-200 font-medium">LinkedIn Topics</div>
            </div>
          </div>
        </div>

        {/* Section View Switcher Pills */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'all'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Full Studio View</span>
            </button>
            <button
              onClick={() => setViewMode('topics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'topics'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>LinkedIn Posts (3)</span>
            </button>
            <button
              onClick={() => setViewMode('headlines')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'headlines'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" />
              <span>Headlines Feed ({allArticlesWithContext.length})</span>
            </button>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Ready-to-use post outlines & cited sources</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: 3 SUGGESTED LINKEDIN TOPICS */}
      {(viewMode === 'all' || viewMode === 'topics') && (
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                  {/* Official style LinkedIn icon badge */}
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.79v8.37H6.46v-8.37M7.86 6.31a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24Z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  3 Suggested Topics for a LinkedIn Post
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Derived directly from today's sentiment friction, deployed use cases, and regulatory headlines. Includes detailed outlines and what to write.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-800 self-start sm:self-auto">
              Optimized for Engagement & Comments
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {linkedInTopics.map((topic, index) => {
              const topicNumber = index + 1;
              const isOutlineCopied = copiedId === `outline-${topic.id}`;
              const isDraftCopied = copiedId === `draft-${topic.id}`;

              return (
                <div
                  key={topic.id}
                  className="rounded-2xl bg-slate-900 border border-slate-800/90 hover:border-slate-700 transition-all shadow-md flex flex-col justify-between overflow-hidden group"
                >
                  {/* Topic Card Top */}
                  <div className="p-5 md:p-6 space-y-4">
                    {/* Header badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-950/80 border border-blue-800 text-blue-300">
                        <span>Topic #{topicNumber}</span>
                        <span>•</span>
                        <span>{topic.category}</span>
                      </span>

                      <span className="text-[10px] text-slate-400 font-medium px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                        {topic.targetAudience}
                      </span>
                    </div>

                    {/* Title / Hook */}
                    <h3 className="text-base font-bold text-white group-hover:text-blue-300 transition-colors leading-snug">
                      {topic.title}
                    </h3>

                    {/* Short description of what the post should include */}
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 space-y-2">
                      <div className="flex items-center gap-1.5 font-semibold text-blue-400 text-[11px] uppercase tracking-wider">
                        <FileText className="w-3.5 h-3.5" />
                        <span>What this post should include</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {topic.description}
                      </p>
                    </div>

                    {/* Step-by-step Post Outline */}
                    <div className="space-y-2.5 pt-1">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Post Structure & Angles
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-800 flex items-start gap-2">
                          <span className="text-amber-400 font-bold shrink-0">1. Hook:</span>
                          <span className="text-slate-300 leading-snug">{topic.postOutline.hook}</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-800 flex items-start gap-2">
                          <span className="text-emerald-400 font-bold shrink-0">2. Data:</span>
                          <span className="text-slate-300 leading-snug">{topic.postOutline.evidenceAndData}</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-800 flex items-start gap-2">
                          <span className="text-indigo-400 font-bold shrink-0">3. Takeaway:</span>
                          <span className="text-slate-300 leading-snug">{topic.postOutline.keyInsight}</span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-800 flex items-start gap-2">
                          <span className="text-rose-400 font-bold shrink-0">4. Question:</span>
                          <span className="text-slate-300 leading-snug">{topic.postOutline.callToAction}</span>
                        </div>
                      </div>
                    </div>

                    {/* Connected Headlines Citations */}
                    {topic.relevantHeadlines && topic.relevantHeadlines.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                          <BookOpen className="w-3 h-3 text-slate-500" />
                          <span>Cited from today's scan:</span>
                        </div>
                        <div className="space-y-1">
                          {topic.relevantHeadlines.map((h, hIdx) => (
                            <a
                              key={hIdx}
                              href={h.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 truncate"
                              title={h.title}
                            >
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{h.title} ({h.source})</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Hashtags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {topic.suggestedHashtags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Topic Card Bottom Buttons */}
                  <div className="p-4 bg-slate-950/90 border-t border-slate-800/80 flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleCopy(
                          `outline-${topic.id}`,
                          `TOPIC: ${topic.title}\n\nWHAT TO INCLUDE:\n${topic.description}\n\nOUTLINE:\n1. Hook: ${topic.postOutline.hook}\n2. Data: ${topic.postOutline.evidenceAndData}\n3. Insight: ${topic.postOutline.keyInsight}\n4. CTA: ${topic.postOutline.callToAction}\n\nHASHTAGS:\n${topic.suggestedHashtags.join(' ')}`
                        )
                      }
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors border border-slate-700"
                    >
                      {isOutlineCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied Outline!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Outline</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setActiveModalTopic(topic)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white transition-all shadow-sm active:scale-95"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>View Full Draft</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 2: LIST OF ALL HEADLINES FOR THAT DAY'S DATA PULL */}
      {(viewMode === 'all' || viewMode === 'headlines') && (
        <section className="space-y-5 pt-2">
          {/* Section Header with Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-indigo-400" />
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Headlines for Today's Data Pull ({digest.date})
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {filteredArticles.length} Stories
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Every story retrieved from Google Alerts across all active sectors. Click to read source or copy citation for your posts.
              </p>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter headlines or sources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56 sm:w-64"
                />
              </div>

              {/* Industry Dropdown */}
              <div className="relative">
                <select
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                  className="text-xs py-1.5 px-3 rounded-xl border border-slate-700 bg-slate-900 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Sectors ({allArticlesWithContext.length})</option>
                  {industriesList.map((ind) => {
                    const count = allArticlesWithContext.filter((a) => a.industryName === ind).length;
                    return (
                      <option key={ind} value={ind}>
                        {ind} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Headlines Grid / List */}
          {filteredArticles.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 space-y-3">
              <Newspaper className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-300">No headlines match your search filter.</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try clearing your search query or selecting "All Sectors" to see the full list of ingested news.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedIndustry('all');
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredArticles.map((article, index) => {
                const isHeadlineCopied = copiedId === `headline-${article.id || index}`;
                const isCitationCopied = copiedId === `cite-${article.id || index}`;

                return (
                  <div
                    key={article.id || index}
                    className="p-4 md:p-5 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 hover:bg-slate-900 transition-all shadow-sm flex flex-col justify-between gap-3 group"
                  >
                    <div className="space-y-2.5">
                      {/* Meta Tags: Industry & Source */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[11px] px-2.5 py-0.5 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800/80">
                          {article.industryName}
                        </span>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-300 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                            {article.source}
                          </span>
                          {article.published && (
                            <span className="text-slate-500 hidden sm:inline">
                              {article.published.length > 16
                                ? article.published.slice(0, 16)
                                : article.published}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Headline Text */}
                      <h4 className="text-sm font-bold text-slate-100 group-hover:text-blue-300 transition-colors leading-snug">
                        <a
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline flex items-start gap-1.5"
                        >
                          <span>{article.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-60 group-hover:opacity-100 text-blue-400 mt-0.5" />
                        </a>
                      </h4>

                      {/* Snippet */}
                      {article.snippet && (
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {article.snippet}
                        </p>
                      )}
                    </div>

                    {/* Bottom Actions for Headline */}
                    <div className="pt-2 border-t border-slate-800/70 flex items-center justify-between gap-2">
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <span>Open Source Article</span>
                        <ArrowRight className="w-3 h-3" />
                      </a>

                      <div className="flex items-center gap-2">
                        {/* Copy citation */}
                        <button
                          onClick={() =>
                            handleCopy(
                              `cite-${article.id || index}`,
                              `📰 "${article.title}" — ${article.source} (${article.link})`
                            )
                          }
                          title="Copy formatted citation for your LinkedIn post"
                          className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                          {isCitationCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Cite in Post</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* MODAL: Full LinkedIn Post Draft */}
      {activeModalTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.79v8.37H6.46v-8.37M7.86 6.31a1.62 1.62 0 1 0 0 3.24 1.62 1.62 0 0 0 0-3.24Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Ready-to-Post LinkedIn Draft
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {activeModalTopic.category} • {activeModalTopic.targetAudience}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveModalTopic(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                {activeModalTopic.sampleDraft}
              </div>

              {/* What this post includes summary */}
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-300 space-y-1">
                <span className="font-semibold text-blue-400">Post Strategy & Objectives:</span>
                <p className="text-slate-400">{activeModalTopic.description}</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
              <button
                onClick={() => setActiveModalTopic(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Close
              </button>

              <button
                onClick={() => {
                  if (activeModalTopic.sampleDraft) {
                    handleCopy('modal-draft', activeModalTopic.sampleDraft);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm active:scale-95"
              >
                {copiedId === 'modal-draft' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Copied Post to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Full LinkedIn Post</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
