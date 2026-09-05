import { NextRequest, NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/db';
import { AppSettings, LLMProvider } from '@/lib/types';

export async function GET() {
  const settings = getSettings();
  const mask = (key?: string) =>
    key && key.length > 8 ? `${key.slice(0, 4)}...${key.slice(-4)}` : key ? '****' : '';

  const hasKey = !!(settings.openrouterApiKey || settings.geminiApiKey || process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY);

  return NextResponse.json({
    provider: settings.provider || (settings.openrouterApiKey ? 'openrouter' : 'gemini'),
    hasApiKey: hasKey,
    hasOpenRouterKey: !!(settings.openrouterApiKey || process.env.OPENROUTER_API_KEY),
    hasGeminiKey: !!(settings.geminiApiKey || process.env.GEMINI_API_KEY),
    maskedOpenRouterKey: mask(settings.openrouterApiKey || process.env.OPENROUTER_API_KEY),
    maskedGeminiKey: mask(settings.geminiApiKey || process.env.GEMINI_API_KEY),
    modelName: settings.modelName || 'google/gemini-2.0-flash-exp:free',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, openrouterApiKey, geminiApiKey, modelName } = body as Partial<AppSettings>;

    const update: Partial<AppSettings> = {};
    if (provider !== undefined) update.provider = provider as LLMProvider;
    if (openrouterApiKey !== undefined) update.openrouterApiKey = openrouterApiKey.trim();
    if (geminiApiKey !== undefined) update.geminiApiKey = geminiApiKey.trim();
    if (modelName !== undefined) update.modelName = modelName.trim();

    const saved = saveSettings(update);

    return NextResponse.json({
      success: true,
      provider: saved.provider,
      hasOpenRouterKey: !!saved.openrouterApiKey,
      hasGeminiKey: !!saved.geminiApiKey,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
