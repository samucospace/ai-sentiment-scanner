# AGENTS.md — AI Industry Sentiment & Use Case Scanner

This document serves as the primary architecture, design, and operational manual for AI agents and human developers maintaining or extending this codebase.

---

## 1. Project Overview

The **AI Industry Sentiment & Use Case Scanner** is an autonomous intelligence dashboard that monitors the evolving impact of Artificial Intelligence across 8 major industry tracks and custom user-defined topics. 

### Core Capabilities:
1. **Daily Feed Ingestion**: Ingests real-time Google Alert and Google News RSS feeds across industry tracks.
2. **Dual-Perspective Sentiment Analysis**:
   - **Workforce / Practitioner Sentiment**: Tracks concerns over liability, burnout, cognitive offloading, job security, and adoption.
   - **Customer / Client / Public Sentiment**: Tracks demand for transparency, convenience, privacy, and 24/7 service access.
3. **Actionable Use-Case Extraction**: Isolates real applications and maps them to a concrete problem-solution architecture (Problem Solved, How AI Operates, Target Users, Key Impact, and Verified Citation).
4. **Dual Analysis Modes**:
   - **Deep LLM Mode**: Google Gemini 1.5/2.0 Flash (`@google/generative-ai`) for rich semantic synthesis.
   - **Zero-Config Heuristic Engine**: Built-in deterministic NLP analyzer for offline and out-of-the-box operation without requiring an API key.

---

## 2. Tech Stack & Directory Structure

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling & UI**: Tailwind CSS, Lucide React icons
- **Data Ingestion**: `fast-xml-parser` (RSS 2.0 & Atom 1.0 support)
- **AI SDK**: `@google/generative-ai`
- **Persistence**: File-backed JSON store (`.data/store.json`) with zero native compilation dependencies (Windows/Linux/macOS cross-platform).

### Project Layout
```
ai-sentiment-scanner/
├── app/
│   ├── api/
│   │   ├── digests/route.ts      # GET: List or fetch digests by date
│   │   ├── feeds/route.ts        # GET/POST: Manage active & custom feeds
│   │   ├── scan/route.ts         # POST: Trigger live scan and AI analysis
│   │   └── settings/route.ts     # GET/POST: Gemini API key & model settings
│   ├── globals.css               # Tailwind & theme variables
│   ├── layout.tsx                # Root layout (Dark mode default)
│   └── page.tsx                  # Main dashboard controller
├── components/
│   ├── ArticleDetailModal.tsx   # Modal to view raw articles and source snippets
│   ├── ExecutiveBriefing.tsx    # Daily summary & macro sentiment cards
│   ├── FeedManagerModal.tsx     # Manage search queries & custom Google Alert RSS URLs
│   ├── Navbar.tsx               # Header, live scan trigger, view switcher
│   ├── SentimentGauge.tsx       # Visual gauge (-1.0 to +1.0) with color grading
│   ├── SentimentMatrix.tsx      # Dual sentiment radar cards by industry
│   ├── SettingsModal.tsx        # Gemini API Key configuration
│   └── UseCasesRadar.tsx        # Filterable problem-solution use case cards
├── lib/
│   ├── analyzer.ts              # Gemini prompt + Heuristic NLP extraction engine
│   ├── db.ts                    # Persistence layer for digests, feeds & settings
│   ├── feeds.ts                 # Preset industry queries & RSS parser
│   └── types.ts                 # TypeScript data contracts
├── .data/                       # Local store directory (auto-created at runtime)
│   └── store.json
├── package.json
└── tsconfig.json
```

---

## 3. Core Data Contracts (`lib/types.ts`)

### `ExtractedUseCase`
Every extracted use case MUST follow this structured schema:
```typescript
export interface ExtractedUseCase {
  id: string;
  title: string;              // Actionable tool/workflow name (e.g. "Ambient Clinical Scribing & EHR Auto-Documentation")
  problemSolved: string;      // The exact human friction/bottleneck being addressed
  howItWorks: string;         // The technical workflow and mechanism
  targetUsers: string;        // Who directly uses it (e.g. "Primary care doctors, emergency nurses")
  keyBenefit: string;         // Measurable outcome/efficiency gain
  industry: string;           // Industry name
  maturityStage: 'Production' | 'Pilot' | 'Research' | 'Policy/Banned';
  sourceTitle: string;        // News publisher citation
  sourceUrl: string;          // Direct URL to original article
  publishedDate?: string;
}
```

### `IndustryDigest`
```typescript
export interface IndustryDigest {
  id: string;
  industryKey: IndustryKey;
  industryName: string;
  date: string; // YYYY-MM-DD
  workerSentiment: {
    score: number;            // -1.0 to +1.0
    label: string;
    rationale: string;
    keyQuotes: string[];
    professionsImpacted: string[];
  };
  customerSentiment: {
    score: number;            // -1.0 to +1.0
    label: string;
    rationale: string;
    keyQuotes: string[];
  };
  useCases: ExtractedUseCase[];
  topArticles: RawArticle[];
  summary: string;
}
```

---

## 4. Preset Industry Tracks

1. **Healthcare & Medicine** (`healthcare`): Ambient scribes, radiology vision models, triage bots, and EHR automation.
2. **Legal & Judiciary** (`legal`): Document review, billable hour impacts, conflict checking, and firm LLMs.
3. **Education & Academics** (`education`): K-12 AI restriction policies, adaptive curricula, and Socratic homework coaching.
4. **Finance & Banking** (`finance`): Real-time fraud detection, algorithmic wealth advisory, and automated underwriting.
5. **Software & IT** (`software`): Repository copilot refactoring, CI/CD security PRs, and synthetic testing.
6. **Creative & Media** (`creative`): Pre-production concept art, multilingual voice cloning, and scriptwriting.
7. **Retail & Customer Support** (`retail`): Autonomous resolution bots, inventory forecasting, and virtual try-ons.
8. **Manufacturing & Robotics** (`manufacturing`): Predictive vibration maintenance and autonomous bin-picking robotics.

---

## 5. Development & Execution Commands

### Running Locally
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Triggering Manual Scans via API
```bash
# Full scan across all 8 industry tracks (force refresh)
node -e "fetch('http://localhost:3000/api/scan', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({force: true})}).then(r => r.json()).then(console.log)"

# Single industry scan
node -e "fetch('http://localhost:3000/api/scan', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({force: true, industryKey: 'healthcare'})}).then(r => r.json()).then(console.log)"
```

---

## 6. Critical Rules for Future Agents

1. **Maintain Use-Case Quality (Anti-Headline Rule)**:
   - NEVER map raw article headlines directly to `useCases.title`.
   - Always ensure `problemSolved` explicitly describes the human friction/pain point.
   - Always retain the source citation (`sourceTitle` and `sourceUrl`).

2. **Maintain Dual Sentiment Range**:
   - Sentiment scores must strictly range from `-1.0` (Critical/Skeptical) to `+1.0` (Enthusiastic/Adopting), with `0.0` as Neutral/Balanced.

3. **Keep Fallback and LLM Engines in Sync**:
   - Any modifications to the Gemini prompt or JSON schema in `lib/analyzer.ts` MUST be mirrored in the heuristic template engine to ensure zero-config offline mode remains functional.

4. **Zero Native C++ Build Addons**:
   - Do NOT add native C++ addon packages (like `better-sqlite3` or `node-canvas`) to prevent build failures across Windows/Linux CI environments. Use pure JS/TypeScript utilities.
