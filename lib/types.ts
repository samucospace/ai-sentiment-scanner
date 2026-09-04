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
  title: string; // The real name of the use case (e.g. "Ambient Clinical Scribing & EHR Charting")
  problemSolved: string; // The specific pain point or workflow bottleneck being addressed
  howItWorks: string; // How the AI model or system accomplishes this
  targetUsers: string; // Who directly uses it (e.g. "Primary care doctors, emergency nurses")
  keyBenefit: string; // Measurable outcome or improvement
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
