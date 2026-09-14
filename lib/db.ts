import fs from 'node:fs';
import path from 'node:path';
import { DailyDigest, AppSettings, FeedTrack } from './types';
import { DEFAULT_FEEDS } from './feeds';

interface DatabaseSchema {
  digests: Record<string, DailyDigest>; // date -> DailyDigest
  settings: AppSettings;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

function ensureDataFile(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      const initialData: DatabaseSchema = {
        digests: {},
        settings: {
          customFeeds: DEFAULT_FEEDS,
          modelName: 'gemini-1.5-flash',
        },
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }

    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(content) as DatabaseSchema;
    if (!parsed.digests) parsed.digests = {};
    let feedsUpdated = false;
    if (!parsed.settings.customFeeds || parsed.settings.customFeeds.length === 0) {
      parsed.settings.customFeeds = DEFAULT_FEEDS;
      feedsUpdated = true;
    } else {
      for (const defaultFeed of DEFAULT_FEEDS) {
        const exists = parsed.settings.customFeeds.some(
          (f) => f.id === defaultFeed.id || f.industryKey === defaultFeed.industryKey
        );
        if (!exists) {
          parsed.settings.customFeeds.push(defaultFeed);
          feedsUpdated = true;
        }
      }
    }
    if (feedsUpdated) {
      writeDataFile(parsed);
    }
    return parsed;
  } catch (err) {
    console.error('Error reading database file:', err);
    return {
      digests: {},
      settings: { customFeeds: DEFAULT_FEEDS },
    };
  }
}

function writeDataFile(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

export function getDailyDigest(date: string): DailyDigest | null {
  const db = ensureDataFile();
  return db.digests[date] || null;
}

export function saveDailyDigest(digest: DailyDigest): void {
  const db = ensureDataFile();
  db.digests[digest.date] = digest;
  writeDataFile(db);
}

export function getAllDigests(): DailyDigest[] {
  const db = ensureDataFile();
  return Object.values(db.digests).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getSettings(): AppSettings {
  const db = ensureDataFile();
  return db.settings;
}

export function saveSettings(newSettings: Partial<AppSettings>): AppSettings {
  const db = ensureDataFile();
  db.settings = {
    ...db.settings,
    ...newSettings,
  };
  writeDataFile(db);
  return db.settings;
}

export function getFeeds(): FeedTrack[] {
  const db = ensureDataFile();
  return db.settings.customFeeds || DEFAULT_FEEDS;
}

export function saveFeeds(feeds: FeedTrack[]): void {
  const db = ensureDataFile();
  db.settings.customFeeds = feeds;
  writeDataFile(db);
}
