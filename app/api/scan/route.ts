import { NextRequest, NextResponse } from 'next/server';
import { getFeeds, getSettings, saveDailyDigest, getDailyDigest } from '@/lib/db';
import { fetchFeedArticles } from '@/lib/feeds';
import {
  analyzeIndustryArticles,
  analyzeAllIndustriesUnified,
  synthesizeDailyDigest,
} from '@/lib/analyzer';
import { DailyDigest, IndustryDigest } from '@/lib/types';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const { force = false, industryKey = null } = body;

    const todayStr = new Date().toISOString().split('T')[0];
    const settings = getSettings();
    const feeds = getFeeds();

    console.log(`\n========================================`);
    console.log(`[Scan API] 🚀 Received scan request (force=${force}, industry=${industryKey || 'all'})`);
    console.log(`[Scan API] ⚙️ Provider: ${settings.provider || 'default'}, Model: ${settings.modelName || 'default'}`);

    // Check if we already have today's digest and not forcing
    const existingDigest = getDailyDigest(todayStr);
    if (existingDigest && !force && !industryKey) {
      console.log(`[Scan API] 📦 Returning cached digest for today (${todayStr})`);
      return NextResponse.json({
        success: true,
        cached: true,
        digest: existingDigest,
      });
    }

    const activeFeeds = feeds.filter(
      (f) => f.enabled && (!industryKey || f.industryKey === industryKey)
    );

    if (activeFeeds.length === 0) {
      console.warn(`[Scan API] ⚠️ No active feeds found.`);
      return NextResponse.json(
        { error: 'No active feeds found to scan' },
        { status: 400 }
      );
    }

    console.log(`[Scan API] 📡 Step 1/2: Ingesting articles for ${activeFeeds.length} feeds in parallel...`);
    const feedFetchStart = Date.now();

    // 1. Fetch RSS articles in parallel for all feeds (with strict 4.5s timeout per feed)
    const feedWithArticles = await Promise.all(
      activeFeeds.map(async (feed) => {
        const articles = await fetchFeedArticles(feed, 8);
        return { feed, articles };
      })
    );

    const totalArticles = feedWithArticles.reduce((sum, item) => sum + item.articles.length, 0);
    console.log(`[Scan API] 📡 Feed ingestion complete in ${Date.now() - feedFetchStart}ms. Total articles collected: ${totalArticles}`);

    let newDigest: DailyDigest;

    // 2. If full scan, use unified single-call multi-industry analyzer (fast & 100% complete)
    if (!industryKey) {
      console.log(`[Scan API] 🤖 Step 2/2: Performing unified multi-industry analysis...`);
      newDigest = await analyzeAllIndustriesUnified(feedWithArticles, settings);
    } else {
      // Partial single-industry scan
      console.log(`[Scan API] 🤖 Step 2/2: Performing single industry analysis for ${industryKey}...`);
      const target = feedWithArticles[0];
      const singleIndustryAnalysis = await analyzeIndustryArticles(
        target.feed.industryKey,
        target.feed.name,
        target.articles,
        settings
      );

      const remaining = existingDigest
        ? existingDigest.industries.filter((i) => i.industryKey !== industryKey)
        : [];
      const fullIndustriesList = [...remaining, singleIndustryAnalysis];

      const { executiveSummary, keyTakeaways } = synthesizeDailyDigest(fullIndustriesList);
      const activeLLMEngine = fullIndustriesList.find((i) => i.engineUsed && !i.engineUsed.includes('Heuristic'))?.engineUsed;
      const dominantEngine = activeLLMEngine || fullIndustriesList[0]?.engineUsed || 'Heuristic Engine';

      newDigest = {
        id: `digest-${todayStr}`,
        date: todayStr,
        createdAt: new Date().toISOString(),
        executiveSummary,
        keyTakeaways,
        industries: fullIndustriesList,
        totalArticlesScanned: target.articles.length,
        engineUsed: dominantEngine,
      };
    }

    saveDailyDigest(newDigest);
    console.log(`[Scan API] ✅ Scan completed successfully in ${Date.now() - startTime}ms. Engine: ${newDigest.engineUsed}`);
    console.log(`========================================\n`);

    return NextResponse.json({
      success: true,
      cached: false,
      digest: newDigest,
    });
  } catch (error: any) {
    console.error(`[Scan API] ❌ Error during scan (${Date.now() - startTime}ms):`, error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during scan' },
      { status: 500 }
    );
  }
}
