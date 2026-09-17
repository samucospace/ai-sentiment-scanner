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
    modelName: settings.modelName || 'openrouter/free',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if this is a test request
    if (body.testOnly) {
      const { provider = 'openrouter', openrouterApiKey, geminiApiKey } = body;
      const settings = getSettings();

      if (provider === 'openrouter') {
        const key = openrouterApiKey?.trim() || settings.openrouterApiKey || process.env.OPENROUTER_API_KEY;
        if (!key) {
          return NextResponse.json({ success: false, error: 'No OpenRouter API key provided' });
        }

        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://github.com/samucospace/ai-sentiment-scanner',
              'X-Title': 'AI Industry Sentiment Scanner',
            },
            body: JSON.stringify({
              model: 'openrouter/free',
              messages: [{ role: 'user', content: 'Ping' }],
              max_tokens: 5,
            }),
          });

          const json = await res.json();
          if (!res.ok || json.error) {
            const msg = json.error?.message || `HTTP ${res.status}`;
            return NextResponse.json({ success: false, error: msg });
          }

          return NextResponse.json({
            success: true,
            message: `OpenRouter API key is valid and working (model responded: ${json.model || 'openrouter/free'})`,
          });
        } catch (e: any) {
          return NextResponse.json({ success: false, error: e.message || 'Connection failed' });
        }
      } else {
        // Gemini test
        const key = geminiApiKey?.trim() || settings.geminiApiKey || process.env.GEMINI_API_KEY;
        if (!key) {
          return NextResponse.json({ success: false, error: 'No Gemini API key provided' });
        }

        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
          );
          if (!res.ok) {
            const text = await res.text();
            return NextResponse.json({ success: false, error: text.slice(0, 150) });
          }
          return NextResponse.json({ success: true, message: 'Google Gemini API key is valid!' });
        } catch (e: any) {
          return NextResponse.json({ success: false, error: e.message || 'Connection failed' });
        }
      }
    }

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
