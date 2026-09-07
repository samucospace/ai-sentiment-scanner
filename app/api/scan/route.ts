import { NextRequest, NextResponse } from 'next/server';
import { getFeeds, getSettings, saveDailyDigest, getDailyDigest } from '@/lib/db';
import { fetchFeedArticles } from '@/lib/feeds';
import { analyzeIndustryArticles, synthesizeDailyDigest } from '@/lib/analyzer';
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

    const industryDigests: IndustryDigest[] = [];
    let totalArticles = 0;

    // Scan each feed concurrently or in sequence
    for (const feed of activeFeeds) {
      const articles = await fetchFeedArticles(feed, 12);
      totalArticles += articles.length;

      const industryAnalysis = await analyzeIndustryArticles(
        feed.industryKey,
        feed.name,
        articles,
        settings
      );

      industryDigests.push(industryAnalysis);
    }

    // Merge with any existing industries from today if doing a partial scan
    let fullIndustriesList = industryDigests;
    if (existingDigest && industryKey) {
      const remaining = existingDigest.industries.filter(
        (i) => i.industryKey !== industryKey
      );
      fullIndustriesList = [...remaining, ...industryDigests];
    }

    const { executiveSummary, keyTakeaways } = synthesizeDailyDigest(fullIndustriesList);
    const activeLLMEngine = fullIndustriesList.find((i) => i.engineUsed && !i.engineUsed.includes('Heuristic'))?.engineUsed;
    const dominantEngine = activeLLMEngine || fullIndustriesList[0]?.engineUsed || 'Heuristic Engine';

    const newDigest: DailyDigest = {
      id: `digest-${todayStr}`,
      date: todayStr,
      createdAt: new Date().toISOString(),
      executiveSummary,
      keyTakeaways,
      industries: fullIndustriesList,
      totalArticlesScanned: totalArticles,
      engineUsed: dominantEngine,
    };

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
