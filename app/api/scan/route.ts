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
  try {
    const body = await req.json().catch(() => ({}));
    const { force = false, industryKey = null } = body;

    const todayStr = new Date().toISOString().split('T')[0];
    const settings = getSettings();
    const feeds = getFeeds();

    // Check if we already have today's digest and not forcing
    const existingDigest = getDailyDigest(todayStr);
    if (existingDigest && !force && !industryKey) {
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
      return NextResponse.json(
        { error: 'No active feeds found to scan' },
        { status: 400 }
      );
    }

    // 1. Fetch RSS articles in parallel for all feeds
    const feedWithArticles = await Promise.all(
      activeFeeds.map(async (feed) => {
        const articles = await fetchFeedArticles(feed, 8);
        return { feed, articles };
      })
    );

    let newDigest: DailyDigest;

    // 2. If full scan, use unified single-call multi-industry analyzer (fast & 100% complete)
    if (!industryKey) {
      newDigest = await analyzeAllIndustriesUnified(feedWithArticles, settings);
    } else {
      // Partial single-industry scan
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

    return NextResponse.json({
      success: true,
      cached: false,
      digest: newDigest,
    });
  } catch (error: any) {
    console.error('Error during scan:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during scan' },
      { status: 500 }
    );
  }
}
