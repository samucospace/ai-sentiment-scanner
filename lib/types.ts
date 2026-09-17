export type IndustryKey =
  | 'healthcare'
  | 'legal'
  | 'education'
  | 'finance'
  | 'software'
  | 'creative'
  | 'retail'
  | 'manufacturing'
  | 'payments'
  | 'custom';

export type LLMProvider = 'openrouter' | 'gemini';

export type ActiveDashboardView = 'matrix' | 'usecases' | 'trends';

export interface SentimentTrendPoint {
  date: string;
  createdAt: string;
  workerScore: number;
  customerScore: number;
  workerLabel: string;
  customerLabel: string;
  rationale?: string;
  topProfessions?: string[];
  digestId: string;
}

export interface FeedTrack {
  id: string;
  name: string;
  industryKey: IndustryKey;
  iconName: string;
  query: string;
  rssUrl?: string;
  description: string;
  enabled: boolean;
}

export interface RawArticle {
  id: string;
  feedId: string;
  title: string;
  link: string;
  published: string;
  snippet: string;
  source: string;
}

export interface WorkerSentiment {
  score: number; // -1.0 to +1.0
  label: string;
  rationale: string;
  keyQuotes: string[];
  professionsImpacted: string[];
}

export interface CustomerSentiment {
  score: number; // -1.0 to +1.0
  label: string;
  rationale: string;
  keyQuotes: string[];
}

export interface ExtractedUseCase {
  id: string;
  title: string; // Actionable tool name
  problemSolved: string; // Pain point being addressed
  howItWorks: string; // Technical workflow
  targetUsers: string; // User roles
  keyBenefit: string; // Measurable outcome
  industry: string;
  maturityStage: 'Production' | 'Pilot' | 'Research' | 'Policy/Banned';
  sourceTitle: string;
  sourceUrl: string;
  publishedDate?: string;
}

export interface IndustryDigest {
  id: string;
  industryKey: IndustryKey;
  industryName: string;
  date: string; // YYYY-MM-DD
  workerSentiment: WorkerSentiment;
  customerSentiment: CustomerSentiment;
  useCases: ExtractedUseCase[];
  topArticles: RawArticle[];
  summary: string;
  engineUsed?: string; // e.g. "OpenRouter (google/gemini-2.0-flash-exp:free)" or "Google Gemini" or "Heuristic Fallback Engine"
}

export interface DailyDigest {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  executiveSummary: string;
  keyTakeaways: string[];
  industries: IndustryDigest[];
  totalArticlesScanned: number;
  engineUsed?: string;
}

export interface AppSettings {
  provider?: LLMProvider;
  openrouterApiKey?: string;
  geminiApiKey?: string;
  modelName?: string;
  customFeeds: FeedTrack[];
  autoScanIntervalHours?: number;
}
