import { NextRequest, NextResponse } from 'next/server';
import { getFeeds, saveFeeds } from '@/lib/db';
import { FeedTrack } from '@/lib/types';

export async function GET() {
  const feeds = getFeeds();
  return NextResponse.json({ feeds });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { feeds } = body as { feeds: FeedTrack[] };

    if (!Array.isArray(feeds)) {
      return NextResponse.json({ error: 'Feeds must be an array' }, { status: 400 });
    }

    saveFeeds(feeds);
    return NextResponse.json({ success: true, feeds });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
