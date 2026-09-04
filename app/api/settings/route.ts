import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/db';
import { AppSettings } from '@/lib/types';

export async function GET() {
  const settings = getSettings();
  // Mask API key for security
  const maskedKey = settings.geminiApiKey
    ? `${settings.geminiApiKey.slice(0, 4)}...${settings.geminiApiKey.slice(-4)}`
    : '';

  return NextResponse.json({
    hasApiKey: !!settings.geminiApiKey,
    maskedApiKey: maskedKey,
    modelName: settings.modelName || 'gemini-1.5-flash',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { geminiApiKey, modelName } = body as Partial<AppSettings>;

    const update: Partial<AppSettings> = {};
    if (geminiApiKey !== undefined) update.geminiApiKey = geminiApiKey.trim();
    if (modelName !== undefined) update.modelName = modelName;

    const saved = saveSettings(update);

    return NextResponse.json({
      success: true,
      hasApiKey: !!saved.geminiApiKey,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
