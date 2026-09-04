export type IndustryKey =
  | 'healthcare'
  | 'legal'
  | 'education'
  | 'finance'
  | 'software'
  | 'creative'
  | 'retail'
  | 'manufacturing'
  | 'custom';

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
  score: number; // -1.0 (very negative) to +1.0 (very positive)
  label: string; // e.g., "Cautious & Anxious", "Productivity-Focused", "Resistant"
  rationale: string;
  keyQuotes: string[];
  professionsImpacted: string[];
}

export interface CustomerSentiment {
  score: number; // -1.0 (very negative) to +1.0 (very positive)
  label: string; // e.g., "Enthusiastic", "Concerned about Privacy", "Indifferent"
  rationale: string;
  keyQuotes: string[];
}

export interface ExtractedUseCase {
  id: string;
  title: string;
  description: string;
  industry: string;
  maturityStage: 'Research' | 'Pilot' | 'Production' | 'Policy/Banned';
  problemSolved: string;
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
}

export interface DailyDigest {
  id: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  executiveSummary: string;
  keyTakeaways: string[];
  industries: IndustryDigest[];
  totalArticlesScanned: number;
}

export interface AppSettings {
  geminiApiKey?: string;
  modelName?: string;
  customFeeds: FeedTrack[];
  autoScanIntervalHours?: number;
}
