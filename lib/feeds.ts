import { XMLParser } from 'fast-xml-parser';
import { FeedTrack, RawArticle } from './types';

export const DEFAULT_FEEDS: FeedTrack[] = [
  {
    id: 'feed-healthcare',
    name: 'Healthcare & Medicine',
    industryKey: 'healthcare',
    iconName: 'Activity',
    query: 'AI healthcare doctors patients medicine hospital',
    description: 'Clinical diagnostics, EHR notes, patient triage, and doctor sentiment.',
    enabled: true,
  },
  {
    id: 'feed-legal',
    name: 'Legal & Judiciary',
    industryKey: 'legal',
    iconName: 'Scale',
    query: 'AI legal lawyers law firms court contract litigation',
    description: 'Contract analysis, billable hours, court filings, and client advisory.',
    enabled: true,
  },
  {
    id: 'feed-education',
    name: 'Education & Academics',
    industryKey: 'education',
    iconName: 'GraduationCap',
    query: 'AI education teachers students classroom school university ban',
    description: 'Curriculum pilots, student cheating, teacher workloads, and policy bans.',
    enabled: true,
  },
  {
    id: 'feed-finance',
    name: 'Finance & Banking',
    industryKey: 'finance',
    iconName: 'Landmark',
    query: 'AI finance banking wealth advisors traders fintech loans',
    description: 'Algorithmic trading, automated wealth advisory, fraud detection, and customer trust.',
    enabled: true,
  },
  {
    id: 'feed-software',
    name: 'Software & IT',
    industryKey: 'software',
    iconName: 'Code',
    query: 'AI coding developers software engineers DevOps pair programming',
    description: 'Copilot tools, developer productivity, code security, and junior hiring shifts.',
    enabled: true,
  },
  {
    id: 'feed-creative',
    name: 'Creative & Media',
    industryKey: 'creative',
    iconName: 'Palette',
    query: 'AI artists writers voice actors entertainment film copyright',
    description: 'Generative art, Hollywood strikes, copyright infringement, and audience reception.',
    enabled: true,
  },
  {
    id: 'feed-retail',
    name: 'Retail & Customer Support',
    industryKey: 'retail',
    iconName: 'ShoppingBag',
    query: 'AI customer service chatbots retail cashiers ecommerce support',
    description: 'Automated support agents, personalized shopping, cashier automation, and shopper frustration.',
    enabled: true,
  },
  {
    id: 'feed-manufacturing',
    name: 'Manufacturing & Robotics',
    industryKey: 'manufacturing',
    iconName: 'Cpu',
    query: 'AI manufacturing robotics factory workers automation warehouse supply chain',
    description: 'Industrial robotics, predictive maintenance, warehouse automation, and workforce safety.',
    enabled: true,
  },
];

function cleanHtml(rawHtml: string): string {
  if (!rawHtml) return '';
  return rawHtml
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export async function fetchFeedArticles(feed: FeedTrack, limit = 15): Promise<RawArticle[]> {
  let url = feed.rssUrl;

  if (!url || url.trim() === '') {
    const encodedQuery = encodeURIComponent(feed.query);
    url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      next: { revalidate: 600 }, // cache for 10 mins
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const xmlText = await res.text();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
    });
    const parsed = parser.parse(xmlText);

    const articles: RawArticle[] = [];

    // RSS 2.0 structure (Google News)
    if (parsed.rss && parsed.rss.channel && parsed.rss.channel.item) {
      const rawItems = Array.isArray(parsed.rss.channel.item)
        ? parsed.rss.channel.item
        : [parsed.rss.channel.item];

      for (let i = 0; i < Math.min(rawItems.length, limit); i++) {
        const item = rawItems[i];
        const title = cleanHtml(item.title || '');
        const snippet = cleanHtml(item.description || '');
        const link = item.link || '';
        const published = item.pubDate || new Date().toISOString();
        const source = item.source ? (typeof item.source === 'object' ? item.source['#text'] : item.source) : 'Google Alert';

        articles.push({
          id: `${feed.id}-${i}-${Date.now()}`,
          feedId: feed.id,
          title,
          link,
          published,
          snippet: snippet.length > 280 ? snippet.slice(0, 280) + '...' : snippet,
          source: source || 'News Source',
        });
      }
    }
    // Atom 1.0 structure (Google Alerts RSS)
    else if (parsed.feed && parsed.feed.entry) {
      const rawEntries = Array.isArray(parsed.feed.entry)
        ? parsed.feed.entry
        : [parsed.feed.entry];

      for (let i = 0; i < Math.min(rawEntries.length, limit); i++) {
        const entry = rawEntries[i];
        const title = cleanHtml(entry.title ? (typeof entry.title === 'object' ? entry.title['#text'] : entry.title) : '');
        const snippet = cleanHtml(entry.content ? (typeof entry.content === 'object' ? entry.content['#text'] : entry.content) : '');
        let link = '';
        if (entry.link) {
          if (Array.isArray(entry.link)) {
            link = entry.link[0]?.['@_href'] || '';
          } else if (typeof entry.link === 'object') {
            link = entry.link['@_href'] || '';
          }
        }
        const published = entry.published || entry.updated || new Date().toISOString();

        articles.push({
          id: `${feed.id}-${i}-${Date.now()}`,
          feedId: feed.id,
          title,
          link,
          published,
          snippet: snippet.length > 280 ? snippet.slice(0, 280) + '...' : snippet,
          source: 'Google Alert',
        });
      }
    }

    return articles;
  } catch (error) {
    console.error(`Error fetching feed for ${feed.name}:`, error);
    return [];
  }
}
