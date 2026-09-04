import { GoogleGenerativeAI } from '@google/generative-ai';
import { RawArticle, IndustryDigest, ExtractedUseCase, IndustryKey } from './types';

interface AnalysisResult {
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
    description: string;
    maturityStage: 'Research' | 'Pilot' | 'Production' | 'Policy/Banned';
    problemSolved: string;
    sourceTitle: string;
    sourceUrl: string;
  }>;
  summary: string;
}

export async function analyzeIndustryArticles(
  industryKey: IndustryKey,
  industryName: string,
  articles: RawArticle[],
  apiKey?: string
): Promise<IndustryDigest> {
  const dateStr = new Date().toISOString().split('T')[0];

  if (articles.length === 0) {
    return {
      id: `${industryKey}-${dateStr}`,
      industryKey,
      industryName,
      date: dateStr,
      workerSentiment: {
        score: 0,
        label: 'Neutral / No Data',
        rationale: 'No articles were retrieved in the current digest window.',
        keyQuotes: [],
        professionsImpacted: [],
      },
      customerSentiment: {
        score: 0,
        label: 'Neutral / No Data',
        rationale: 'No articles were retrieved in the current digest window.',
        keyQuotes: [],
      },
      useCases: [],
      topArticles: [],
      summary: `No recent updates detected for ${industryName}.`,
    };
  }

  // 1. Try Gemini Analysis if API key is provided
  const activeKey = apiKey || process.env.GEMINI_API_KEY;
  if (activeKey) {
    try {
      const genAI = new GoogleGenerativeAI(activeKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const prompt = `You are an expert market intelligence analyst tracking the impact of Artificial Intelligence.
Analyze the following news articles from a Google Alert digest for the "${industryName}" industry.

Articles:
${articles
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

Extract:
1. WORKER / PRACTITIONER SENTIMENT: How do professionals, employees, and practitioners working in this field feel about AI? Score (-1.0 to 1.0), descriptive mood label, concise rationale, direct supporting snippets/quotes, and specific job titles impacted.
2. CUSTOMER / CLIENT / PUBLIC SENTIMENT: How do end customers, patients, students, or consumers feel about AI in this industry? Score (-1.0 to 1.0), descriptive mood label, concise rationale, and supporting quotes.
3. EMERGING USE CASES: Extract concrete, distinct AI use cases mentioned in these articles. For each, specify its maturity ('Research' | 'Pilot' | 'Production' | 'Policy/Banned'), the problem it solves, description, the source title, and the source URL.
4. SUMMARY: A 2-sentence executive summary of the state of AI in ${industryName} today.

Respond strictly in valid JSON matching this schema:
{
  "workerSentiment": {
    "score": number, // between -1.0 and 1.0
    "label": string,
    "rationale": string,
    "keyQuotes": string[],
    "professionsImpacted": string[]
  },
  "customerSentiment": {
    "score": number, // between -1.0 and 1.0
    "label": string,
    "rationale": string,
    "keyQuotes": string[]
  },
  "useCases": [
    {
      "title": string,
      "description": string,
      "maturityStage": "Research" | "Pilot" | "Production" | "Policy/Banned",
      "problemSolved": string,
      "sourceTitle": string,
      "sourceUrl": string
    }
  ],
  "summary": string
}`;

      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const parsed: AnalysisResult = JSON.parse(text);

      const useCases: ExtractedUseCase[] = (parsed.useCases || []).map((uc, i) => ({
        id: `uc-${industryKey}-${i}-${Date.now()}`,
        title: uc.title,
        description: uc.description,
        industry: industryName,
        maturityStage: uc.maturityStage || 'Pilot',
        problemSolved: uc.problemSolved,
        sourceTitle: uc.sourceTitle || articles[0]?.source || 'News Source',
        sourceUrl: uc.sourceUrl || articles[0]?.link || '#',
        publishedDate: dateStr,
      }));

      return {
        id: `${industryKey}-${dateStr}`,
        industryKey,
        industryName,
        date: dateStr,
        workerSentiment: parsed.workerSentiment,
        customerSentiment: parsed.customerSentiment,
        useCases,
        topArticles: articles.slice(0, 5),
        summary: parsed.summary,
      };
    } catch (llmError) {
      console.warn('Gemini LLM analysis error, falling back to heuristic analyzer:', llmError);
    }
  }

  // 2. Intelligent Rule-Based / Heuristic Fallback
  return fallbackHeuristicAnalysis(industryKey, industryName, articles, dateStr);
}

function fallbackHeuristicAnalysis(
  industryKey: IndustryKey,
  industryName: string,
  articles: RawArticle[],
  dateStr: string
): IndustryDigest {
  // Sentiment lexicons
  const positiveWords = ['breakthrough', 'faster', 'savings', 'innovative', 'welcomed', 'approved', 'adopt', 'boost', 'open up', 'eases', 'helps', 'advance', 'benefit'];
  const negativeWords = ['warning', 'ban', 'banned', 'fear', 'threat', 'strike', 'lawsuit', 'liability', 'pushback', 'error', 'risk', 'crisis', 'mystery', 'hallucination', 'displacement', 'cheating'];
  const workerWords = ['doctor', 'lawyer', 'teacher', 'worker', 'employee', 'engineer', 'developer', 'staff', 'practitioner', 'firm', 'job', 'workload'];
  const customerWords = ['patient', 'client', 'student', 'customer', 'shopper', 'user', 'public', 'consumer', 'parent'];

  let workerPos = 0;
  let workerNeg = 0;
  let custPos = 0;
  let custNeg = 0;

  const extractedQuotes: string[] = [];
  const useCases: ExtractedUseCase[] = [];

  articles.forEach((art, idx) => {
    const text = `${art.title} ${art.snippet}`.toLowerCase();

    // Check for positive/negative keywords
    positiveWords.forEach((w) => {
      if (text.includes(w)) {
        if (workerWords.some((kw) => text.includes(kw))) workerPos += 1;
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

    if (art.title && extractedQuotes.length < 4) {
      extractedQuotes.push(art.title);
    }

    // Extract potential use case from article title/snippet
    if (idx < 3) {
      let stage: 'Research' | 'Pilot' | 'Production' | 'Policy/Banned' = 'Pilot';
      if (text.includes('ban') || text.includes('policy') || text.includes('rule')) stage = 'Policy/Banned';
      else if (text.includes('launch') || text.includes('deploy') || text.includes('rolls out')) stage = 'Production';
      else if (text.includes('study') || text.includes('research') || text.includes('test')) stage = 'Research';

      useCases.push({
        id: `uc-${industryKey}-${idx}-${Date.now()}`,
        title: art.title.split(' - ')[0] || art.title,
        description: art.snippet.slice(0, 180) + '...',
        industry: industryName,
        maturityStage: stage,
        problemSolved: `Automating and augmenting specialized workflows in ${industryName.toLowerCase()}.`,
        sourceTitle: art.source || 'Google Alert Source',
        sourceUrl: art.link,
        publishedDate: art.published,
      });
    }
  });

  const rawWorkerScore = (workerPos - workerNeg) / Math.max(1, (workerPos + workerNeg));
  const rawCustScore = (custPos - custNeg) / Math.max(1, (custPos + custNeg));

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
          ? `Practitioners express caution over liability, workload displacement, and operational risk.`
          : `Professionals report growing interest in administrative offloading and productivity gains.`,
      keyQuotes: extractedQuotes.slice(0, 2),
      professionsImpacted: getIndustryProfessions(industryKey),
    },
    customerSentiment: {
      score: customerScore,
      label: getCustLabel(customerScore),
      rationale:
        customerScore >= 0
          ? `End-users appreciate faster access, convenience, and 24/7 responsiveness.`
          : `Consumers and clients seek greater transparency, human oversight, and data safeguards.`,
      keyQuotes: extractedQuotes.slice(2, 4),
    },
    useCases,
    topArticles: articles.slice(0, 5),
    summary: `Coverage highlights ongoing friction between operational deployment and professional safeguards in ${industryName}.`,
  };
}

function getIndustryProfessions(key: IndustryKey): string[] {
  switch (key) {
    case 'healthcare':
      return ['Doctors', 'Radiologists', 'Nurses', 'Clinic Administrators'];
    case 'legal':
      return ['Associates', 'Partners', 'Paralegals', 'General Counsels'];
    case 'education':
      return ['Teachers', 'Professors', 'Instructional Designers', 'School Principals'];
    case 'finance':
      return ['Financial Advisors', 'Risk Analysts', 'Traders', 'Compliance Officers'];
    case 'software':
      return ['Software Engineers', 'DevOps Specialists', 'QA Testers', 'Product Managers'];
    case 'creative':
      return ['Writers', 'Concept Artists', 'Voice Actors', 'Animators'];
    case 'retail':
      return ['Customer Support Agents', 'Store Managers', 'Merchandisers'];
    case 'manufacturing':
      return ['Plant Operators', 'Supply Chain Planners', 'Robotics Technicians'];
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

  const executiveSummary = `Today's digest shows a noticeable divergence: workers remain guarded (avg sentiment ${(
    avgWorker * 100
  ).toFixed(0)}%) due to workflow and liability shifts, while customer sentiment leans receptive (${(
    avgCust * 100
  ).toFixed(
    0
  )}%) as accessible AI services expand. Highest workplace scrutiny is observed in ${topCautious?.industryName || 'Education'}, with active customer adoption in ${topOptimistic?.industryName || 'Healthcare'}.`;

  const keyTakeaways = [
    `Workforce sentiment is lowest in ${topCautious?.industryName || 'Education'} (${topCautious?.workerSentiment.label || 'Guarded'}).`,
    `Customer and client sentiment is strongest in ${topOptimistic?.industryName || 'Healthcare'} (${topOptimistic?.customerSentiment.label || 'Receptive'}).`,
    `Over ${industryDigests.reduce((acc, i) => acc + i.useCases.length, 0)} new pilot and production use-cases identified across tracked industries today.`,
  ];

  return { executiveSummary, keyTakeaways };
}
