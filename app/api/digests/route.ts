import { NextRequest, NextResponse } from 'next/server';
import { getAllDigests, getDailyDigest } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  if (date) {
    const digest = getDailyDigest(date);
    if (!digest) {
      return NextResponse.json({ error: 'Digest not found for date' }, { status: 404 });
    }
    return NextResponse.json({ digest });
  }

  const digests = getAllDigests();
  return NextResponse.json({ digests });
}
