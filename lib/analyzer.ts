import { GoogleGenerativeAI } from '@google/generative-ai';
import { RawArticle, IndustryDigest, ExtractedUseCase, IndustryKey, AppSettings, DailyDigest } from './types';

interface LLMAnalysisResult {
  workerSentiment: {
    score: number;
    label: string;
    rationale: string;
    keyQuotes: string[];
    professionsImpacted: string[];
  };
  customerSentiment: {
    score: number;
    label: string;
    rationale: string;
    keyQuotes: string[];
  };
  useCases: Array<{
    title: string;
    problemSolved: string;
    howItWorks: string;
    targetUsers: string;
    keyBenefit: string;
    maturityStage: 'Production' | 'Pilot' | 'Research' | 'Policy/Banned';
    sourceTitle: string;
    sourceUrl: string;
  }>;
  summary: string;
}

/**
 * Filters out low-signal noise / garbage news (stock price articles, market size estimates, pure fluff).
 */
function isHighSignalArticle(art: RawArticle): boolean {
  const text = `${art.title} ${art.snippet}`.toLowerCase();
  const garbagePhrases = [
    'stocks to buy',
    'market size is expected to reach',
    'market cap',
    'shares rise',
    'stock surges',
    'quarterly earnings',
    'price target',
    'top 3 stocks',
    'who won the ai race',
    'investors eye',
  ];

  return !garbagePhrases.some((phrase) => text.includes(phrase));
}

function buildAnalysisPrompt(industryName: string, articles: RawArticle[]): string {
  return `You are a Principal AI Strategist and Industry Analyst.
Analyze these Google Alert news articles about AI in "${industryName}".

CRITICAL INSTRUCTIONS FOR USE CASES:
- DO NOT just copy or summarize article headlines.
- Identify 2 to 3 high-impact, concrete technological applications.
- For each use case, provide:
  1. "title": Concise, actionable tool/system name.
  2. "problemSolved": Exact human friction or bottleneck being resolved.
  3. "howItWorks": The underlying technical workflow/mechanism.
  4. "targetUsers": Specific practitioner or customer roles.
  5. "keyBenefit": Measurable outcome/efficiency gain.
  6. "maturityStage": "Production" | "Pilot" | "Research" | "Policy/Banned".
  7. "sourceTitle" & "sourceUrl": Exact citation.

ARTICLES:
${articles
  .slice(0, 8)
  .map(
    (a, idx) =>
      `[Article #${idx + 1}]
Title: ${a.title}
Source: ${a.source}
Date: ${a.published}
Snippet: ${a.snippet}
URL: ${a.link}`
  )
  .join('\n\n')}

Respond strictly in valid JSON matching this schema:
{
  "workerSentiment": {
    "score": number, // -1.0 to 1.0
    "label": string,
    "rationale": string,
    "keyQuotes": string[],
    "professionsImpacted": string[]
  },
  "customerSentiment": {
    "score": number, // -1.0 to 1.0
    "label": string,
    "rationale": string,
    "keyQuotes": string[]
  },
  "useCases": [
    {
      "title": string,
      "problemSolved": string,
      "howItWorks": string,
      "targetUsers": string,
      "keyBenefit": string,
      "maturityStage": "Production" | "Pilot" | "Research" | "Policy/Banned",
      "sourceTitle": string,
      "sourceUrl": string
    }
  ],
  "summary": string
}`;
}

async function callOpenRouter(
  apiKey: string,
  modelName: string,
  prompt: string
): Promise<LLMAnalysisResult> {
  const userModel = modelName?.trim();
  const modelsToTry: string[] = [];

  // If user selected a specific model (other than the generic openrouter/free), try it first
  if (userModel && userModel !== 'openrouter/free') {
    modelsToTry.push(userModel);
  }

  // Fast direct free & low-cost models verified on OpenRouter
  const fastModels = [
    'nvidia/nemotron-3-super-120b-a12b:free',
    'openrouter/free',
    'deepseek/deepseek-chat',
    'openai/gpt-4o-mini',
    'nvidia/nemotron-3.5-lightning:free',
  ];

  for (const m of fastModels) {
    if (!modelsToTry.includes(m)) {
      modelsToTry.push(m);
    }
  }

  let lastError = '';

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelToAttempt = modelsToTry[i];
    const attemptStartTime = Date.now();
    try {
      console.log(`[OpenRouter] 🌐 Attempt ${i + 1}/${modelsToTry.length}: Calling "${modelToAttempt}"...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s fast timeout to avoid long queue stalls

      const requestBody: any = {
        model: modelToAttempt,
        messages: [
          {
            role: 'system',
            content:
              'You are a Principal AI Strategist and Market Intelligence Analyst. Always respond strictly in valid JSON matching the requested schema without conversational filler or markdown notes.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
      };

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/samucospace/ai-sentiment-scanner',
          'X-Title': 'AI Industry Sentiment & Use Case Scanner',
        },
        body: JSON.stringify(requestBody),
      });

      clearTimeout(timeoutId);
      const elapsed = ((Date.now() - attemptStartTime) / 1000).toFixed(1);

      if (!res.ok) {
        const errorBody = await res.text();
        lastError = `OpenRouter error (${res.status}) on ${modelToAttempt}: ${errorBody}`;
        console.warn(`[OpenRouter] ⚠️ ${modelToAttempt} returned status ${res.status} (${elapsed}s): ${errorBody.slice(0, 150)}`);
        continue;
      }

      const json = await res.json();
      const rawText = json.choices?.[0]?.message?.content || '{}';
      console.log(`[OpenRouter] 🟢 Model "${modelToAttempt}" responded in ${elapsed}s (${rawText.length} chars).`);
      
      // Clean possible markdown code fences
      let cleanJson = rawText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.slice(7);
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.slice(3);
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.slice(0, -3);
      }
      cleanJson = cleanJson.trim();

      // Extract outermost JSON object if surrounded by extra text
      const firstBrace = cleanJson.indexOf('{');
      const lastBrace = cleanJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanJson = cleanJson.slice(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(cleanJson);
      return parsed;
    } catch (err: any) {
      const elapsed = ((Date.now() - attemptStartTime) / 1000).toFixed(1);
      console.warn(`[OpenRouter] ⚠️ Attempt ${i + 1} ("${modelToAttempt}") failed after ${elapsed}s: ${err.message}`);
      lastError = err.message;
    }
  }

  throw new Error(lastError || 'All OpenRouter model attempts failed');
}

interface UnifiedAnalysisResult {
  executiveSummary: string;
  keyTakeaways: string[];
  industries: Record<
    string,
    {
      workerSentiment: {
        score: number;
        label: string;
        rationale: string;
        keyQuotes: string[];
        professionsImpacted: string[];
      };
      customerSentiment: {
        score: number;
        label: string;
        rationale: string;
        keyQuotes: string[];
      };
      useCases: Array<{
        title: string;
        problemSolved: string;
        howItWorks: string;
        targetUsers: string;
        keyBenefit: string;
        maturityStage: 'Production' | 'Pilot' | 'Research' | 'Policy/Banned';
        sourceTitle: string;
        sourceUrl: string;
      }>;
      summary: string;
    }
  >;
}

export async function analyzeAllIndustriesUnified(
  feedWithArticles: { feed: import('./types').FeedTrack; articles: RawArticle[] }[],
  settings?: AppSettings
): Promise<DailyDigest> {
  const dateStr = new Date().toISOString().split('T')[0];
  const totalArticles = feedWithArticles.reduce((sum, item) => sum + item.articles.length, 0);
  const provider = settings?.provider || (settings?.openrouterApiKey || process.env.OPENROUTER_API_KEY ? 'openrouter' : 'gemini');

  // Build unified prompt across all industries
  const prompt = `You are a Principal AI Strategist and Market Intelligence Analyst.
Analyze current Artificial Intelligence news across the following industries:

${feedWithArticles
  .map(({ feed, articles }) => {
    const arts = articles.slice(0, 4);
    return `=== Industry: ${feed.name} (Key: ${feed.industryKey}) ===
Articles:
${arts.map((a, idx) => `[#${idx + 1}] Title: ${a.title} | Snippet: ${a.snippet} | Source: ${a.source} | URL: ${a.link}`).join('\n')}`;
  })
  .join('\n\n')}

CRITICAL INSTRUCTIONS:
- For EACH industry, provide 2 actionable concrete use cases (with problemSolved, howItWorks, targetUsers, keyBenefit, maturityStage, sourceTitle, sourceUrl).
- For EACH industry, provide dual workerSentiment and customerSentiment (-1.0 to 1.0 score, label, rationale, quotes).
- Provide an overarching executiveSummary and 3 keyTakeaways.

Respond strictly in valid JSON matching this schema:
{
  "executiveSummary": string,
  "keyTakeaways": string[],
  "industries": {
    "healthcare": {
      "workerSentiment": { "score": number, "label": string, "rationale": string, "keyQuotes": string[], "professionsImpacted": string[] },
      "customerSentiment": { "score": number, "label": string, "rationale": string, "keyQuotes": string[] },
      "useCases": [{ "title": string, "problemSolved": string, "howItWorks": string, "targetUsers": string, "keyBenefit": string, "maturityStage": "Production"|"Pilot"|"Research"|"Policy/Banned", "sourceTitle": string, "sourceUrl": string }],
      "summary": string
    }
    // ... repeat for legal, education, finance, software, creative, retail, manufacturing, payments
  }
}`;

  // 1. Try Unified OpenRouter Analysis
  if (provider === 'openrouter') {
    const openRouterKey = settings?.openrouterApiKey || process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      try {
        const modelName = settings?.modelName || 'openrouter/free';
        console.log(`[Scanner] 🚀 Executing unified multi-industry analysis via OpenRouter (${modelName})...`);
        const parsed: UnifiedAnalysisResult = await callOpenRouter(openRouterKey, modelName, prompt) as any;

        if (parsed && parsed.industries) {
          const industryDigests: IndustryDigest[] = feedWithArticles.map(({ feed, articles }) => {
            const rawInd = parsed.industries[feed.industryKey] || parsed.industries[feed.industryKey.toLowerCase()];
            if (rawInd) {
              const useCases: ExtractedUseCase[] = (rawInd.useCases || []).map((uc, i) => ({
                id: `uc-${feed.industryKey}-${i}-${Date.now()}`,
                title: uc.title || 'Emerging Industry Automation Workflow',
                problemSolved: uc.problemSolved || 'Administrative and operational bottlenecks.',
                howItWorks: uc.howItWorks || 'Automated AI models analyzing workflows in real time.',
                targetUsers: uc.targetUsers || 'Domain Specialists & Practitioners',
                keyBenefit: uc.keyBenefit || 'Improved operational throughput and reduced manual overhead.',
                industry: feed.name,
                maturityStage: uc.maturityStage || 'Pilot',
                sourceTitle: uc.sourceTitle || articles[0]?.source || 'News Source',
                sourceUrl: uc.sourceUrl || articles[0]?.link || '#',
                publishedDate: dateStr,
              }));

              const defaultProfessions = getIndustryProfessions(feed.industryKey);
              const workerScore = typeof rawInd.workerSentiment?.score === 'number' ? rawInd.workerSentiment.score : 0;
              const customerScore = typeof rawInd.customerSentiment?.score === 'number' ? rawInd.customerSentiment.score : 0.1;

              return {
                id: `${feed.industryKey}-${dateStr}`,
                industryKey: feed.industryKey,
                industryName: feed.name,
                date: dateStr,
                workerSentiment: {
                  score: Math.max(-1, Math.min(1, workerScore)),
                  label: rawInd.workerSentiment?.label || (workerScore < 0 ? 'Cautious / Protective' : 'Productivity-Curious'),
                  rationale: rawInd.workerSentiment?.rationale || 'Practitioners observe evolving operational shifts and documentation efficiency.',
                  keyQuotes: Array.isArray(rawInd.workerSentiment?.keyQuotes) ? rawInd.workerSentiment.keyQuotes : [],
                  professionsImpacted: Array.isArray(rawInd.workerSentiment?.professionsImpacted) && rawInd.workerSentiment.professionsImpacted.length > 0
                    ? rawInd.workerSentiment.professionsImpacted
                    : defaultProfessions,
                },
                customerSentiment: {
                  score: Math.max(-1, Math.min(1, customerScore)),
                  label: rawInd.customerSentiment?.label || (customerScore >= 0 ? 'Convenience-Focused' : 'Distrustful & Concerned'),
                  rationale: rawInd.customerSentiment?.rationale || 'Clients and consumers demand transparency, convenience, and fast response times.',
                  keyQuotes: Array.isArray(rawInd.customerSentiment?.keyQuotes) ? rawInd.customerSentiment.keyQuotes : [],
                },
                useCases: useCases.length > 0 ? useCases : extractIndustryIntelligenceHeuristic(feed.industryKey, feed.name, articles, dateStr).useCases,
                topArticles: articles.slice(0, 5),
                summary: rawInd.summary || `Market signals indicate active AI exploration in ${feed.name}.`,
                engineUsed: `OpenRouter (${modelName})`,
              };
            }

            // Fallback for missing industry key in LLM json
            return extractIndustryIntelligenceHeuristic(feed.industryKey, feed.name, articles, dateStr);
          });

          console.log(`[Scanner] 🟢 Unified multi-industry analysis completed successfully for all ${industryDigests.length} tracks!`);

          return {
            id: `digest-${dateStr}`,
            date: dateStr,
            createdAt: new Date().toISOString(),
            executiveSummary: parsed.executiveSummary || 'Daily AI Intelligence across monitored sectors.',
            keyTakeaways: Array.isArray(parsed.keyTakeaways) && parsed.keyTakeaways.length > 0
              ? parsed.keyTakeaways
              : [
                  `Workforce sentiment: cautious around liability and cognitive displacement.`,
                  `Customer sentiment: receptive to 24/7 self-service convenience.`,
                  `High-impact use cases cataloged across tracked industries with problem-solution mapping.`,
                ],
            industries: industryDigests,
            totalArticlesScanned: totalArticles,
            engineUsed: `OpenRouter (${modelName})`,
          };
        }
      } catch (err: any) {
        console.warn(`[Scanner] ⚠️ Unified OpenRouter call failed: ${err.message}. Running fallback engine...`);
      }
    }
  }

  // 2. Try Gemini Unified Analysis
  const geminiKey = settings?.geminiApiKey || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const modelName = settings?.modelName?.includes('/') ? 'gemini-1.5-flash' : (settings?.modelName || 'gemini-1.5-flash');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      console.log(`[Scanner] 🚀 Executing unified multi-industry analysis via Google Gemini (${modelName})...`);
      const response = await model.generateContent(prompt);
      const parsed: UnifiedAnalysisResult = JSON.parse(response.response.text());

        if (parsed && parsed.industries) {
        const industryDigests: IndustryDigest[] = feedWithArticles.map(({ feed, articles }) => {
          const rawInd = parsed.industries[feed.industryKey] || parsed.industries[feed.industryKey.toLowerCase()];
          if (rawInd) {
            const useCases: ExtractedUseCase[] = (rawInd.useCases || []).map((uc, i) => ({
              id: `uc-${feed.industryKey}-${i}-${Date.now()}`,
              title: uc.title || 'Emerging Industry Automation Workflow',
              problemSolved: uc.problemSolved || 'Administrative and operational bottlenecks.',
              howItWorks: uc.howItWorks || 'Automated AI models analyzing workflows in real time.',
              targetUsers: uc.targetUsers || 'Domain Specialists & Practitioners',
              keyBenefit: uc.keyBenefit || 'Improved operational throughput and reduced manual overhead.',
              industry: feed.name,
              maturityStage: uc.maturityStage || 'Pilot',
              sourceTitle: uc.sourceTitle || articles[0]?.source || 'News Source',
              sourceUrl: uc.sourceUrl || articles[0]?.link || '#',
              publishedDate: dateStr,
            }));

            const defaultProfessions = getIndustryProfessions(feed.industryKey);
            const workerScore = typeof rawInd.workerSentiment?.score === 'number' ? rawInd.workerSentiment.score : 0;
            const customerScore = typeof rawInd.customerSentiment?.score === 'number' ? rawInd.customerSentiment.score : 0.1;

            return {
              id: `${feed.industryKey}-${dateStr}`,
              industryKey: feed.industryKey,
              industryName: feed.name,
              date: dateStr,
              workerSentiment: {
                score: Math.max(-1, Math.min(1, workerScore)),
                label: rawInd.workerSentiment?.label || (workerScore < 0 ? 'Cautious / Protective' : 'Productivity-Curious'),
                rationale: rawInd.workerSentiment?.rationale || 'Practitioners observe evolving operational shifts and documentation efficiency.',
                keyQuotes: Array.isArray(rawInd.workerSentiment?.keyQuotes) ? rawInd.workerSentiment.keyQuotes : [],
                professionsImpacted: Array.isArray(rawInd.workerSentiment?.professionsImpacted) && rawInd.workerSentiment.professionsImpacted.length > 0
                  ? rawInd.workerSentiment.professionsImpacted
                  : defaultProfessions,
              },
              customerSentiment: {
                score: Math.max(-1, Math.min(1, customerScore)),
                label: rawInd.customerSentiment?.label || (customerScore >= 0 ? 'Convenience-Focused' : 'Distrustful & Concerned'),
                rationale: rawInd.customerSentiment?.rationale || 'Clients and consumers demand transparency, convenience, and fast response times.',
                keyQuotes: Array.isArray(rawInd.customerSentiment?.keyQuotes) ? rawInd.customerSentiment.keyQuotes : [],
              },
              useCases: useCases.length > 0 ? useCases : extractIndustryIntelligenceHeuristic(feed.industryKey, feed.name, articles, dateStr).useCases,
              topArticles: articles.slice(0, 5),
              summary: rawInd.summary || `Market signals indicate active AI exploration in ${feed.name}.`,
              engineUsed: `Google Gemini (${modelName})`,
            };
          }
          return extractIndustryIntelligenceHeuristic(feed.industryKey, feed.name, articles, dateStr);
        });

        console.log(`[Scanner] 🟢 Unified Gemini analysis completed successfully for all ${industryDigests.length} tracks!`);

        return {
          id: `digest-${dateStr}`,
          date: dateStr,
          createdAt: new Date().toISOString(),
          executiveSummary: parsed.executiveSummary || 'Daily AI Intelligence across monitored sectors.',
          keyTakeaways: Array.isArray(parsed.keyTakeaways) && parsed.keyTakeaways.length > 0
            ? parsed.keyTakeaways
            : [
                `Workforce sentiment: cautious around liability and cognitive displacement.`,
                `Customer sentiment: receptive to 24/7 self-service convenience.`,
                `High-impact use cases cataloged across tracked industries with problem-solution mapping.`,
              ],
          industries: industryDigests,
          totalArticlesScanned: totalArticles,
          engineUsed: `Google Gemini (${modelName})`,
        };
      }
    } catch (err: any) {
      console.warn(`[Scanner] ⚠️ Unified Gemini call failed: ${err.message}. Running fallback engine...`);
    }
  }

  // 3. Fallback: Heuristic Engine
  console.log('[Scanner] 🟡 Running Heuristic Engine for all industry tracks.');
  const industryDigests = feedWithArticles.map(({ feed, articles }) => {
    const ind = extractIndustryIntelligenceHeuristic(feed.industryKey, feed.name, articles, dateStr);
    ind.engineUsed = 'Heuristic Engine (Offline / No Key)';
    return ind;
  });

  const { executiveSummary, keyTakeaways } = synthesizeDailyDigest(industryDigests);
  return {
    id: `digest-${dateStr}`,
    date: dateStr,
    createdAt: new Date().toISOString(),
    executiveSummary,
    keyTakeaways,
    industries: industryDigests,
    totalArticlesScanned: totalArticles,
    engineUsed: 'Heuristic Engine (Offline / No Key)',
  };
}

export async function analyzeIndustryArticles(
  industryKey: IndustryKey,
  industryName: string,
  articles: RawArticle[],
  settings?: AppSettings
): Promise<IndustryDigest> {
  const dateStr = new Date().toISOString().split('T')[0];
  const signalArticles = articles.filter(isHighSignalArticle);
  const effectiveArticles = signalArticles.length >= 3 ? signalArticles : articles;

  if (effectiveArticles.length === 0) {
    return {
      id: `${industryKey}-${dateStr}`,
      industryKey,
      industryName,
      date: dateStr,
      workerSentiment: {
        score: 0,
        label: 'Neutral / No Data',
        rationale: 'No relevant articles were retrieved in the current digest window.',
        keyQuotes: [],
        professionsImpacted: [],
      },
      customerSentiment: {
        score: 0,
        label: 'Neutral / No Data',
        rationale: 'No relevant articles were retrieved in the current digest window.',
        keyQuotes: [],
      },
      useCases: [],
      topArticles: [],
      summary: `No recent updates detected for ${industryName}.`,
    };
  }

  const prompt = buildAnalysisPrompt(industryName, effectiveArticles);
  const provider = settings?.provider || (settings?.openrouterApiKey || process.env.OPENROUTER_API_KEY ? 'openrouter' : 'gemini');

  // 1. Try OpenRouter LLM Analysis
  if (provider === 'openrouter') {
    const openRouterKey = settings?.openrouterApiKey || process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      try {
        const modelName = settings?.modelName || 'openrouter/free';
        const parsed = await callOpenRouter(openRouterKey, modelName, prompt);

        const useCases: ExtractedUseCase[] = (parsed.useCases || []).map((uc, i) => ({
          id: `uc-${industryKey}-${i}-${Date.now()}`,
          title: uc.title,
          problemSolved: uc.problemSolved,
          howItWorks: uc.howItWorks,
          targetUsers: uc.targetUsers,
          keyBenefit: uc.keyBenefit,
          industry: industryName,
          maturityStage: uc.maturityStage || 'Pilot',
          sourceTitle: uc.sourceTitle || effectiveArticles[0]?.source || 'News Source',
          sourceUrl: uc.sourceUrl || effectiveArticles[0]?.link || '#',
          publishedDate: dateStr,
        }));

        console.log(`[Scanner] 🟢 ${industryName}: Analyzed using OpenRouter LLM (${modelName})`);

        return {
          id: `${industryKey}-${dateStr}`,
          industryKey,
          industryName,
          date: dateStr,
          workerSentiment: parsed.workerSentiment,
          customerSentiment: parsed.customerSentiment,
          useCases,
          topArticles: effectiveArticles.slice(0, 5),
          summary: parsed.summary,
          engineUsed: `OpenRouter (${modelName})`,
        };
      } catch (err: any) {
        console.warn(`[Scanner] ⚠️ OpenRouter failed for ${industryName}: ${err.message}. Falling back to heuristic engine.`);
      }
    } else {
      console.log(`[Scanner] ℹ️ OpenRouter selected but no API key configured. Using heuristic engine.`);
    }
  }

  // 2. Try Gemini Analysis
  const geminiKey = settings?.geminiApiKey || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const modelName = settings?.modelName?.includes('/') ? 'gemini-1.5-flash' : (settings?.modelName || 'gemini-1.5-flash');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const parsed: LLMAnalysisResult = JSON.parse(text);

      const useCases: ExtractedUseCase[] = (parsed.useCases || []).map((uc, i) => ({
        id: `uc-${industryKey}-${i}-${Date.now()}`,
        title: uc.title,
        problemSolved: uc.problemSolved,
        howItWorks: uc.howItWorks,
        targetUsers: uc.targetUsers,
        keyBenefit: uc.keyBenefit,
        industry: industryName,
        maturityStage: uc.maturityStage || 'Pilot',
        sourceTitle: uc.sourceTitle || effectiveArticles[0]?.source || 'News Source',
        sourceUrl: uc.sourceUrl || effectiveArticles[0]?.link || '#',
        publishedDate: dateStr,
      }));

      console.log(`[Scanner] 🟢 ${industryName}: Analyzed using Google Gemini Direct (${modelName})`);

      return {
        id: `${industryKey}-${dateStr}`,
        industryKey,
        industryName,
        date: dateStr,
        workerSentiment: parsed.workerSentiment,
        customerSentiment: parsed.customerSentiment,
        useCases,
        topArticles: effectiveArticles.slice(0, 5),
        summary: parsed.summary,
        engineUsed: `Google Gemini (${modelName})`,
      };
    } catch (llmError: any) {
      console.warn(`[Scanner] ⚠️ Gemini failed for ${industryName}: ${llmError.message}. Falling back to heuristic engine.`);
    }
  }

  // 3. High-Fidelity Domain-Aware Heuristic & NLP Extractor
  console.log(`[Scanner] 🟡 ${industryName}: Analyzed using Zero-Config Heuristic Engine (no API key configured)`);
  const result = extractIndustryIntelligenceHeuristic(industryKey, industryName, effectiveArticles, dateStr);
  result.engineUsed = 'Heuristic Engine (Offline / No Key)';
  return result;
}

/**
 * Domain-specific use-case knowledge library mapped to real industry workflows.
 */
interface UseCaseTemplate {
  keywords: string[];
  title: string;
  problemSolved: string;
  howItWorks: string;
  targetUsers: string;
  keyBenefit: string;
  defaultStage: 'Production' | 'Pilot' | 'Research' | 'Policy/Banned';
}

const INDUSTRY_USECASE_PATTERNS: Record<IndustryKey, UseCaseTemplate[]> = {
  healthcare: [
    {
      keywords: ['note', 'scribe', 'dictat', 'record', 'listen', 'charting', 'ehr'],
      title: 'Ambient AI Clinical Scribing & EHR Auto-Documentation',
      problemSolved:
        'Physicians spend 2–3 hours daily manually typing visit notes into EHR systems, causing physician burnout and distracted bedside consultations.',
      howItWorks:
        'Secure ambient microphones record patient-clinician dialogue; natural language processing automatically extracts medical terminology and drafts structured SOAP notes for doctor review.',
      targetUsers: 'Primary Care Doctors, Emergency Clinicians, Outpatient Specialists',
      keyBenefit: 'Eliminates 1.5+ hours of daily administrative charting and restores focused face-to-face patient interaction.',
      defaultStage: 'Production',
    },
    {
      keywords: ['transparent', 'warning', 'hallucinat', 'error', 'safe', 'guidelines', 'standard'],
      title: 'Clinical AI Transparency & Liability Guardrails System',
      problemSolved:
        'Hospitals and patients lack visibility into when diagnostic AI is used, raising malpractice liability and patient trust concerns.',
      howItWorks:
        'Auditing framework that watermarks AI-assisted recommendations, requires mandatory physician sign-off, and provides confidence score intervals.',
      targetUsers: 'Hospital Chief Medical Officers, Compliance Directors, Patients',
      keyBenefit: 'Prevents unverified AI diagnostic mistakes and ensures explicit patient consent.',
      defaultStage: 'Policy/Banned',
    },
    {
      keywords: ['patient', 'question', 'triage', 'symptom', 'open up', 'chat', 'intake'],
      title: 'Autonomous Patient Symptom Triage & Pre-Visit Clarification',
      problemSolved:
        'Emergency rooms and clinics suffer from crowded waiting rooms and delayed triage for non-critical health inquiries.',
      howItWorks:
        'Conversational triage assistant clarifies patient symptoms before clinic arrival, recommending appropriate care levels (telehealth vs urgent care vs home care).',
      targetUsers: 'Patients, Triage Nurses, Telehealth Coordinators',
      keyBenefit: 'Reduces unnecessary ER admissions by 25% and shortens clinic intake queues.',
      defaultStage: 'Pilot',
    },
    {
      keywords: ['scan', 'image', 'radiology', 'mri', 'x-ray', 'cancer', 'detect'],
      title: 'Computer Vision Radiology Triaging & Anomaly Detection',
      problemSolved:
        'Radiologists review hundreds of high-resolution CT/MRI scans daily, creating fatigue-induced risks of missing microscopic early-stage lesions.',
      howItWorks:
        'Deep learning segmentation models pre-screen scans in real-time, highlighting potential nodules, fractures, or hemorrhages for prioritized radiologist review.',
      targetUsers: 'Radiologists, Oncologists, Pathology Labs',
      keyBenefit: 'Accelerates acute scan read times from 45 minutes to under 5 minutes for life-threatening findings.',
      defaultStage: 'Production',
    },
  ],
  legal: [
    {
      keywords: ['billable', 'cost', 'hours', 'saving', 'rate', 'firm', 'fee'],
      title: 'Automated Legal Document Review & Billable Efficiency Engine',
      problemSolved:
        'Clients resist paying standard hourly rates for junior associate discovery, document review, and repetitive due diligence.',
      howItWorks:
        'Semantic legal intelligence searches thousands of discovery documents and extracts key clause inconsistencies in minutes rather than weeks.',
      targetUsers: 'Corporate Associates, General Counsels, Litigation Paralegals',
      keyBenefit: 'Compresses document review workflows by up to 80% and allows firms to offer fixed-fee pricing models.',
      defaultStage: 'Production',
    },
    {
      keywords: ['bespoke', 'difference', 'custom', 'model', 'practice', 'proprietary'],
      title: 'Domain-Trained Firm Intelligence & Precedent Retrieval',
      problemSolved:
        'Public LLMs hallucinate citations and leak confidential client data, making generic tools unusable for high-stakes litigation.',
      howItWorks:
        'Locally deployed LLMs indexed exclusively on a firm’s internal brief repositories, past settlement databases, and jurisdictional statutes.',
      targetUsers: 'Senior Partners, Legal Research Specialists, Knowledge Managers',
      keyBenefit: 'Provides verified case citations with zero client confidentiality leakage risks.',
      defaultStage: 'Pilot',
    },
    {
      keywords: ['referral', 'crisis', 'intake', 'client', 'conflict'],
      title: 'Autonomous Client Conflict Checking & Matter Intake Triage',
      problemSolved:
        'Manual conflict checking and matter intake take 24–48 hours, causing law firms to lose prospective high-value matters.',
      howItWorks:
        'Cross-references incoming client queries against existing corporate ownership trees, adverse parties, and jurisdictional ethics rules instantly.',
      targetUsers: 'Intake Committees, Risk Partners, Managing Directors',
      keyBenefit: 'Reduces intake clearance time from 2 days to under 15 minutes while safeguarding ethical boundaries.',
      defaultStage: 'Pilot',
    },
  ],
  education: [
    {
      keywords: ['ban', 'grade', 'policy', 'mamdani', 'school', 'k-12', 'restrict'],
      title: 'K-12 Cognitive Safeguards & Grade-Level AI Restriction Policies',
      problemSolved:
        'Unchecked generative AI usage by elementary and middle school students impairs foundational reading, writing, and arithmetic skill development.',
      howItWorks:
        'School district network-level filtering and institutional policies restricting AI access until 9th grade, paired with educator monitoring tools.',
      targetUsers: 'K-8 Teachers, School Principals, District Superintendents',
      keyBenefit: 'Protects early cognitive development and enforces authentic student writing practice.',
      defaultStage: 'Policy/Banned',
    },
    {
      keywords: ['curriculum', 'pilot', 'pushback', 'springfield', 'teacher', 'lesson'],
      title: 'Adaptive AI Curriculum Builder & Lesson Personalization',
      problemSolved:
        'Teachers spend 10+ hours per week designing individualized lesson materials for diverse student learning paces.',
      howItWorks:
        'Generative curriculum tools that adapt reading levels, scaffold math problems, and generate practice quizzes tailored to student IEP requirements.',
      targetUsers: 'High School Teachers, Curriculum Coordinators, Special Ed Instructors',
      keyBenefit: 'Saves educators 6 hours per week in lesson preparation while offering custom pacing for struggling students.',
      defaultStage: 'Pilot',
    },
    {
      keywords: ['tutor', 'student', 'homework', 'feedback', 'study'],
      title: '24/7 Socratic Student Homework & Concept Coaching',
      problemSolved:
        'Students often get stuck on complex STEM problems outside school hours when teachers and private tutors are unavailable.',
      howItWorks:
        'Interactive AI tutor that guides students using the Socratic method—asking probing questions without revealing direct homework answers.',
      targetUsers: 'Students, Parents, Academic Support Staff',
      keyBenefit: 'Provides on-demand conceptual clarification without facilitating academic dishonesty.',
      defaultStage: 'Production',
    },
  ],
  finance: [
    {
      keywords: ['fraud', 'anti-money', 'transaction', 'risk', 'compliance', 'aml'],
      title: 'Real-Time Transaction Fraud & AML Anomaly Interception',
      problemSolved:
        'Legacy rule-based fraud systems suffer from 90%+ false positive rates, locking legitimate customer cards while missing sophisticated laundering rings.',
      howItWorks:
        'Graph neural networks and anomaly detection analyze sub-second payment telemetry, geospatial patterns, and device fingerprints simultaneously.',
      targetUsers: 'Fraud Analysts, Risk Compliance Officers, Bank Operations',
      keyBenefit: 'Cuts false declines by 40% while intercepting fraud attempts within 50 milliseconds.',
      defaultStage: 'Production',
    },
    {
      keywords: ['wealth', 'advisor', 'portfolio', 'invest', 'fintech', 'trade'],
      title: 'Hyper-Personalized Wealth Portfolio Optimization & Tax Harvesting',
      problemSolved:
        'Comprehensive tax-loss harvesting and custom direct indexing were traditionally reserved only for ultra-high-net-worth clients ($5M+).',
      howItWorks:
        'Algorithmic rebalancing engines continuously scan market movements to execute automated daily tax-loss trades for retail investment accounts.',
      targetUsers: 'Registered Investment Advisors (RIAs), Retail Investors',
      keyBenefit: 'Delivers an estimated 1–2% additional after-tax annual alpha to everyday investors.',
      defaultStage: 'Production',
    },
    {
      keywords: ['loan', 'credit', 'underwrit', 'mortgage', 'borrower'],
      title: 'Automated Loan Underwriting & Alternative Credit Scoring',
      problemSolved:
        'Manual mortgage and small business loan applications take 3–4 weeks of document verification and manual debt-to-income calculations.',
      howItWorks:
        'Automated document parsers ingest tax returns, bank statements, and payroll data, calculating risk metrics and loan qualification instantaneously.',
      targetUsers: 'Loan Officers, Underwriters, Small Business Borrowers',
      keyBenefit: 'Reduces loan approval turnaround from 25 days to under 4 hours.',
      defaultStage: 'Pilot',
    },
  ],
  software: [
    {
      keywords: ['copilot', 'developer', 'code', 'engineer', 'pair', 'autocomplete'],
      title: 'Context-Aware Repository Copilot & Autonomous Refactoring',
      problemSolved:
        'Developers spend up to 40% of their time writing repetitive boilerplate syntax, researching library APIs, and migrating legacy codebases.',
      howItWorks:
        'Deep learning models analyze entire code repository ASTs to suggest multi-line completions, generate docstrings, and write unit tests inline.',
      targetUsers: 'Software Engineers, DevOps Leads, QA Engineers',
      keyBenefit: 'Increases feature shipping velocity by 25–35% and reduces pull request turnaround times.',
      defaultStage: 'Production',
    },
    {
      keywords: ['security', 'vulnerability', 'cve', 'patch', 'audit'],
      title: 'Automated CI/CD Vulnerability Detection & Remediation PRs',
      problemSolved:
        'Security teams cannot manually audit thousands of open-source dependencies across modern microservices, leaving zero-day exploits unpatched.',
      howItWorks:
        'Static and dynamic analysis bots identify insecure patterns and automatically generate pull requests with safe library version upgrades.',
      targetUsers: 'AppSec Engineers, DevSecOps Teams, Engineering Managers',
      keyBenefit: 'Reduces mean time to remediate (MTTR) critical security flaws from 30 days to 2 hours.',
      defaultStage: 'Production',
    },
  ],
  creative: [
    {
      keywords: ['art', 'generat', 'image', 'video', 'concept', 'render', 'asset'],
      title: 'Rapid Pre-Production Concept Art & Storyboard Prototyping',
      problemSolved:
        'Entertainment studios spend weeks and tens of thousands of dollars iterating preliminary scene mockups and character variations.',
      howItWorks:
        'Diffusion and multi-modal models generate detailed background variations, lighting setups, and color palettes from director text prompts.',
      targetUsers: 'Concept Artists, Art Directors, Game Designers',
      keyBenefit: 'Compresses visual ideation cycles from 3 weeks to 2 days for creative pitches.',
      defaultStage: 'Pilot',
    },
    {
      keywords: ['voice', 'dub', 'actor', 'speech', 'audio', 'language'],
      title: 'Emotion-Preserving Multilingual Voice Synthesis & Dubbing',
      problemSolved:
        'Dubbing film and video games into 15+ international languages requires expensive foreign voice casts and causes unnatural lip-sync mismatches.',
      howItWorks:
        'Voice cloning models replicate an original actor’s vocal timbre and emotional cadence in target languages with synchronized synthetic lip motion.',
      targetUsers: 'Film Distributors, Video Game Localizers, Content Creators',
      keyBenefit: 'Reduces localization costs by 70% while preserving original actor voice performance.',
      defaultStage: 'Production',
    },
  ],
  retail: [
    {
      keywords: ['chat', 'service', 'support', 'customer', 'ticket', 'bot', 'agent'],
      title: 'Autonomous Omnichannel Customer Resolution & Return Processing',
      problemSolved:
        'Shoppers endure 45+ minute queue times for simple return requests, order tracking updates, and warranty inquiries.',
      howItWorks:
        'Agentic support models connect directly to CRM and ERP inventory systems to execute full order refunds, exchanges, and cancellations without human intervention.',
      targetUsers: 'E-commerce Shoppers, Customer Support Teams, E-commerce Operations',
      keyBenefit: 'Resolves 65% of customer inquiries instantly with zero human hold time.',
      defaultStage: 'Production',
    },
    {
      keywords: ['inventory', 'pricing', 'demand', 'forecast', 'shelf', 'store'],
      title: 'Dynamic Shelf Replenishment & Demand Surge Forecasting',
      problemSolved:
        'Retailers lose billions annually to out-of-stock items during demand spikes and severe overstock markdowns.',
      howItWorks:
        'Computer vision cameras and predictive inventory models forecast localized demand based on weather, local events, and historical purchasing trends.',
      targetUsers: 'Store Managers, Supply Chain Directors, Category Buyers',
      keyBenefit: 'Reduces stockouts by 30% and curbs perishable food waste.',
      defaultStage: 'Pilot',
    },
  ],
  manufacturing: [
    {
      keywords: ['maintenance', 'predict', 'vibration', 'sensor', 'sensor', 'breakdown', 'downtime'],
      title: 'Predictive Vibration Telemetry & Industrial Machinery Maintenance',
      problemSolved:
        'Unplanned factory equipment breakdowns halt production lines, costing heavy industrial plants up to $250,000 per hour of unexpected downtime.',
      howItWorks:
        'IoT acoustic and vibration sensors stream telemetry to edge ML models that detect bearing wear and thermal anomalies weeks before mechanical failure.',
      targetUsers: 'Plant Operations Managers, Reliability Engineers, Maintenance Crews',
      keyBenefit: 'Decreases catastrophic machine downtime by 45% and extends industrial equipment lifespan.',
      defaultStage: 'Production',
    },
    {
      keywords: ['robot', 'warehouse', 'pack', 'pick', 'assembly', 'automate'],
      title: 'Autonomous Computer Vision Bin-Picking & Assembly Robotics',
      problemSolved:
        'Traditional industrial robots require rigid fixtures and cannot pick irregularly oriented, flexible, or mixed-variety parts from sorting bins.',
      howItWorks:
        '3D spatial vision combined with reinforcement learning arms identify optimal grasp points for randomly jumbled components in real time.',
      targetUsers: 'Automation Engineers, Logistics Fulfillment Centers, Assembly Technicians',
      keyBenefit: 'Achieves 99.8% pick accuracy at speeds exceeding 1,200 picks per hour with zero human fatigue.',
      defaultStage: 'Production',
    },
  ],
  payments: [
    {
      keywords: ['checkout', 'm2m', 'machine', 'rail', 'protocol', 'autonomous buying', 'agentic commerce', 'agentic'],
      title: 'Autonomous Agentic Checkout & M2M Payment Rails',
      problemSolved:
        'Traditional human-oriented checkout flows with CAPTCHAs, redirects, and manual form fills break autonomous AI shopping agents from completing purchases.',
      howItWorks:
        'Machine-to-machine checkout APIs and tokenized credentials allow personal AI agents to negotiate prices, select delivery options, and execute payments seamlessly.',
      targetUsers: 'E-commerce Merchants, Payment Gateways, AI Agent Developers',
      keyBenefit: 'Reduces checkout drop-off for agent-driven purchases from 80% to under 5% with sub-second transaction finality.',
      defaultStage: 'Pilot',
    },
    {
      keywords: ['wallet', 'guardrail', 'spending', 'budget', 'limit', 'delegate', 'biometric', 'approval', 'consumer'],
      title: 'Delegated Consumer AI Wallets with Cryptographic Spending Guardrails',
      problemSolved:
        'Consumers fear giving AI shopping assistants unchecked financial access, risking unexpected overspending or unauthorized recurring charges.',
      howItWorks:
        'Programmable smart payment cards enforce granular per-transaction spending limits, single-use merchant tokens, and threshold-based biometric push approvals.',
      targetUsers: 'Online Consumers, Digital Banking Users, Personal AI Assistant Operators',
      keyBenefit: 'Guarantees 100% transparent spending limits while enabling hands-free daily replenishment and automated deal capture.',
      defaultStage: 'Production',
    },
    {
      keywords: ['fraud', 'dispute', 'chargeback', 'identity', 'credential', 'verification', 'scheme', 'network', 'risk'],
      title: 'Real-Time Agentic Transaction Verification & Dispute Resolution',
      problemSolved:
        'Merchants and payment processors face severe chargeback and fraud liability trying to distinguish legitimate buyer agents from malicious automated card-testing bots.',
      howItWorks:
        'Verifiable agent credentials (W3C DID) and cryptographic proof-of-intent authenticate AI purchasing agents before authorizing settlement.',
      targetUsers: 'Merchant Fraud Managers, Payment Risk Operations, Card Issuers',
      keyBenefit: 'Cuts agent-related false positive declines by 45% while stopping bot-driven fraud and chargeback liability.',
      defaultStage: 'Pilot',
    },
  ],
  custom: [
    {
      keywords: ['process', 'system', 'auto', 'workflow'],
      title: 'Domain-Specific Workflow Automation & Intelligence',
      problemSolved: 'Repetitive operational friction and manual data entry slowing down team throughput.',
      howItWorks: 'Specialized language and vision models parsing unstructured data into core system records.',
      targetUsers: 'Industry Specialists, Operations Teams',
      keyBenefit: 'Eliminates administrative bottlenecks and accelerates project delivery.',
      defaultStage: 'Pilot',
    },
  ],
};

function extractIndustryIntelligenceHeuristic(
  industryKey: IndustryKey,
  industryName: string,
  articles: RawArticle[],
  dateStr: string
): IndustryDigest {
  const templates = INDUSTRY_USECASE_PATTERNS[industryKey] || INDUSTRY_USECASE_PATTERNS.custom;
  const matchedUseCases: ExtractedUseCase[] = [];

  // Match articles against rich use-case templates
  articles.forEach((art) => {
    const text = `${art.title} ${art.snippet}`.toLowerCase();

    for (const tpl of templates) {
      const isMatch = tpl.keywords.some((kw) => text.includes(kw));
      const alreadyAdded = matchedUseCases.some((u) => u.title === tpl.title);

      if (isMatch && !alreadyAdded && matchedUseCases.length < 3) {
        let stage = tpl.defaultStage;
        if (text.includes('ban') || text.includes('policy') || text.includes('rule')) {
          stage = 'Policy/Banned';
        } else if (text.includes('deploy') || text.includes('launch') || text.includes('production')) {
          stage = 'Production';
        } else if (text.includes('pilot') || text.includes('trial') || text.includes('test')) {
          stage = 'Pilot';
        }

        matchedUseCases.push({
          id: `uc-${industryKey}-${matchedUseCases.length}-${Date.now()}`,
          title: tpl.title,
          problemSolved: tpl.problemSolved,
          howItWorks: tpl.howItWorks,
          targetUsers: tpl.targetUsers,
          keyBenefit: tpl.keyBenefit,
          industry: industryName,
          maturityStage: stage,
          sourceTitle: art.source || 'Google Alert Source',
          sourceUrl: art.link,
          publishedDate: art.published,
        });
        break;
      }
    }
  });

  // If no specific match, generate from top templates
  if (matchedUseCases.length === 0 && templates.length > 0) {
    const defaultTpl = templates[0];
    const topArt = articles[0];
    matchedUseCases.push({
      id: `uc-${industryKey}-0-${Date.now()}`,
      title: defaultTpl.title,
      problemSolved: defaultTpl.problemSolved,
      howItWorks: defaultTpl.howItWorks,
      targetUsers: defaultTpl.targetUsers,
      keyBenefit: defaultTpl.keyBenefit,
      industry: industryName,
      maturityStage: defaultTpl.defaultStage,
      sourceTitle: topArt?.source || 'Google Alert News',
      sourceUrl: topArt?.link || '#',
      publishedDate: topArt?.published || dateStr,
    });
  }

  // Sentiment scoring
  const positiveWords = ['breakthrough', 'faster', 'savings', 'innovative', 'welcomed', 'approved', 'adopt', 'boost', 'open up', 'eases', 'helps', 'advance', 'benefit', 'efficiency', 'guidelines'];
  const negativeWords = ['warning', 'ban', 'banned', 'fear', 'threat', 'strike', 'lawsuit', 'liability', 'pushback', 'error', 'risk', 'crisis', 'mystery', 'hallucination', 'displacement', 'cheating'];
  const workerWords = ['doctor', 'lawyer', 'teacher', 'worker', 'employee', 'engineer', 'developer', 'staff', 'practitioner', 'firm', 'job', 'workload', 'merchant', 'processor', 'acquirer', 'issuer', 'fintech'];
  const customerWords = ['patient', 'client', 'student', 'customer', 'shopper', 'user', 'public', 'consumer', 'parent', 'buyer', 'cardholder'];

  let workerPos = 0;
  let workerNeg = 0;
  let custPos = 0;
  let custNeg = 0;
  const quotes: string[] = [];

  articles.forEach((art) => {
    const text = `${art.title} ${art.snippet}`.toLowerCase();
    positiveWords.forEach((w) => {
      if (text.includes(w)) {
        if (workerWords.some((kw) => text.includes(kw))) workerPos += 1.2;
        if (customerWords.some((kw) => text.includes(kw))) custPos += 1;
        if (!workerWords.some((kw) => text.includes(kw)) && !customerWords.some((kw) => text.includes(kw))) {
          workerPos += 0.5;
          custPos += 0.5;
        }
      }
    });

    negativeWords.forEach((w) => {
      if (text.includes(w)) {
        if (workerWords.some((kw) => text.includes(kw))) workerNeg += 1.5;
        if (customerWords.some((kw) => text.includes(kw))) custNeg += 1;
        if (!workerWords.some((kw) => text.includes(kw)) && !customerWords.some((kw) => text.includes(kw))) {
          workerNeg += 0.8;
          custNeg += 0.5;
        }
      }
    });

    if (art.title && quotes.length < 4) {
      quotes.push(art.title);
    }
  });

  const rawWorkerScore = (workerPos - workerNeg) / Math.max(1, workerPos + workerNeg);
  const rawCustScore = (custPos - custNeg) / Math.max(1, custPos + custNeg);

  const clamp = (num: number) => Math.max(-1, Math.min(1, Math.round(num * 10) / 10));
  const workerScore = clamp(rawWorkerScore);
  const customerScore = clamp(rawCustScore);

  const getWorkerLabel = (s: number) => {
    if (s <= -0.4) return 'Skeptical & Guarded';
    if (s < 0) return 'Cautiously Hesitant';
    if (s === 0) return 'Mixed / Observant';
    if (s < 0.4) return 'Productivity-Curious';
    return 'Highly Optimistic & Adaptive';
  };

  const getCustLabel = (s: number) => {
    if (s <= -0.4) return 'Distrustful & Concerned';
    if (s < 0) return 'Cautious & Scrutinizing';
    if (s === 0) return 'Neutral & Receptive';
    if (s < 0.4) return 'Convenience-Focused';
    return 'Enthusiastic & Adopting';
  };

  return {
    id: `${industryKey}-${dateStr}`,
    industryKey,
    industryName,
    date: dateStr,
    workerSentiment: {
      score: workerScore,
      label: getWorkerLabel(workerScore),
      rationale:
        workerScore < 0
          ? `Practitioners express caution over liability, professional displacement, and unverified errors.`
          : `Professionals report significant interest in automating repetitive clerical tasks and documentation.`,
      keyQuotes: quotes.slice(0, 2),
      professionsImpacted: getIndustryProfessions(industryKey),
    },
    customerSentiment: {
      score: customerScore,
      label: getCustLabel(customerScore),
      rationale:
        customerScore >= 0
          ? `End-users appreciate faster turnarounds, direct 24/7 access, and lower service costs.`
          : `Consumers and clients express concern regarding data privacy and the lack of transparent human oversight.`,
      keyQuotes: quotes.slice(2, 4),
    },
    useCases: matchedUseCases,
    topArticles: articles.slice(0, 5),
    summary: `Market signals indicate active exploration of automated intelligence alongside intensifying professional scrutiny in ${industryName}.`,
  };
}

function getIndustryProfessions(key: IndustryKey): string[] {
  switch (key) {
    case 'healthcare':
      return ['Primary Care Physicians', 'Radiologists', 'Nurses', 'Clinic Administrators'];
    case 'legal':
      return ['Corporate Lawyers', 'Litigation Partners', 'Paralegals', 'General Counsels'];
    case 'education':
      return ['K-12 Teachers', 'University Professors', 'Curriculum Planners', 'Principals'];
    case 'finance':
      return ['Wealth Advisors', 'Risk Analysts', 'Forex Traders', 'Compliance Officers'];
    case 'software':
      return ['Software Engineers', 'DevOps Specialists', 'QA Testers', 'Architects'];
    case 'creative':
      return ['Concept Artists', 'Screenwriters', 'Voice Actors', 'Game Designers'];
    case 'retail':
      return ['Customer Support Agents', 'Store Managers', 'E-commerce Buyers'];
    case 'manufacturing':
      return ['Reliability Engineers', 'Plant Managers', 'Robotics Technicians'];
    case 'payments':
      return ['Merchant Checkout Engineers', 'Payment Risk & Fraud Analysts', 'Fintech Product Managers', 'E-commerce Operations Directors'];
    default:
      return ['Practitioners', 'Specialists'];
  }
}

export function synthesizeDailyDigest(industryDigests: IndustryDigest[]): {
  executiveSummary: string;
  keyTakeaways: string[];
} {
  const avgWorker =
    industryDigests.reduce((acc, ind) => acc + ind.workerSentiment.score, 0) /
    Math.max(1, industryDigests.length);
  const avgCust =
    industryDigests.reduce((acc, ind) => acc + ind.customerSentiment.score, 0) /
    Math.max(1, industryDigests.length);

  const topCautious = [...industryDigests].sort(
    (a, b) => a.workerSentiment.score - b.workerSentiment.score
  )[0];
  const topOptimistic = [...industryDigests].sort(
    (a, b) => b.customerSentiment.score - a.customerSentiment.score
  )[0];

  const totalUseCases = industryDigests.reduce((acc, i) => acc + i.useCases.length, 0);

  const executiveSummary = `Today's scan reveals clear workforce divergence: practitioners across key sectors remain guarded (avg sentiment ${(
    avgWorker * 100
  ).toFixed(0)}%) around liability and cognitive displacement, while customer/client reception stands at ${(
    avgCust * 100
  ).toFixed(0)}% driven by convenience. Highest professional scrutiny is found in ${topCautious?.industryName || 'Education'}, while highest client adoption continues in ${topOptimistic?.industryName || 'Healthcare'}.`;

  const keyTakeaways = [
    `Workforce sentiment: lowest in ${topCautious?.industryName || 'Education'} (${topCautious?.workerSentiment.label || 'Guarded'}).`,
    `Customer sentiment: highest in ${topOptimistic?.industryName || 'Healthcare'} (${topOptimistic?.customerSentiment.label || 'Receptive'}).`,
    `${totalUseCases} high-impact use cases cataloged across tracked industries with problem-solution mapping.`,
  ];

  return { executiveSummary, keyTakeaways };
}
