# 📡 AI Industry Sentiment & Use Case Scanner

An autonomous intelligence dashboard that monitors daily Google Alert and Google News RSS feeds, performs **dual-perspective sentiment analysis** (industry workforce vs. customers), and extracts real-world **emerging use cases** mapped to a structured problem-solution architecture with direct publisher citations.

---

## 🌟 Key Features

- **9 Preset Industry Tracks**:
  - 🏥 **Healthcare & Medicine**: Ambient clinical scribing, radiology vision models, and patient triage bots.
  - ⚖️ **Legal & Judiciary**: Contract redlining, billable hours impact, and litigation research LLMs.
  - 🎓 **Education & Academics**: K-12 AI restriction policies, adaptive curricula, and Socratic homework coaches.
  - 🏦 **Finance & Banking**: Real-time fraud/AML detection, algorithmic wealth advisory, and automated underwriting.
  - 💻 **Software & IT**: Repository copilots, automated CI/CD security PRs, and synthetic testing.
  - 🎨 **Creative & Media**: Storyboarding, multilingual voice cloning, and generative concept art.
  - 🛍️ **Retail & Customer Support**: Autonomous customer resolution bots, dynamic pricing, and inventory forecasting.
  - 🤖 **Manufacturing & Robotics**: Predictive machinery maintenance and autonomous bin-picking robotics.
  - 💳 **Payments & Agentic Commerce**: Autonomous purchasing agents, machine-to-machine checkout rails, programmable spending guardrails, and transaction fraud defense.

- **Dual-Perspective Sentiment Analysis**:
  - 👷 **Workforce / Practitioner Sentiment**: Measures anxiety over liability, burnout, cognitive offloading, job displacement, and adoption (`-1.0` to `+1.0` scale).
  - 👥 **Customer / Client Sentiment**: Measures consumer demand for transparency, convenience, privacy safeguards, and 24/7 access.

- **Problem-Solution Use-Case Radar**:
  - Eliminates generic news headlines and extracts structured use-case cards:
    - 🏷️ **Actionable Name**: e.g., *"Ambient Clinical Scribing & EHR Auto-Documentation"*
    - 🚨 **The Problem Solved**: The exact human friction or workflow bottleneck being addressed.
    - ⚙️ **How AI Operates**: The technical mechanism and workflow.
    - 👥 **Target Users**: Specific roles (e.g. *Primary Care Physicians, Emergency Clinicians*).
    - ⚡ **Key Impact**: Quantifiable outcome (e.g. *Eliminates 1.5+ hours of daily charting*).
    - 📊 **Maturity Stage**: `Production`, `Pilot`, `Research`, or `Policy/Banned`.
    - 🔗 **Verified Citation**: Clickable link to the original news article.

- **Multi-LLM & Fallback Engine**:
  - **OpenRouter API**: Access to 100+ free and ultra-cheap models (e.g., `google/gemini-2.0-flash-exp:free`, `meta-llama/llama-3.3-70b-instruct:free`, `deepseek/deepseek-chat`, `openai/gpt-4o-mini`).
  - **Google Gemini Direct**: Native `@google/generative-ai` integration with Gemini 1.5/2.0 Flash.
  - **Zero-Config Fallback Engine**: Built-in deterministic heuristic NLP analyzer for instant out-of-the-box operation without requiring an API key.

- **Custom Feed & Ingestion Manager**:
  - Add custom Google Alert RSS URLs or custom search keywords directly from the UI.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/samucospace/ai-sentiment-scanner.git
cd ai-sentiment-scanner
npm install
```

### 2. Configure Environment (Optional)
Copy the example environment file:
```bash
cp .env.example .env.local
```

Configure your preferred LLM provider:

```env
# Option A: OpenRouter (Supports free models like google/gemini-2.0-flash-exp:free or meta-llama/llama-3.3-70b-instruct:free)
OPENROUTER_API_KEY=sk-or-v1-your-key-here...

# Option B: Google Gemini Direct (from Google AI Studio)
GEMINI_API_KEY=AIzaSyYourKeyHere...
```

> **Note:** API keys can also be configured dynamically in the web UI via the **Settings (⚙️)** modal. If no API key is set, the app runs the built-in heuristic engine automatically.

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Build & Production

```bash
# Create optimized production build
npm run build

# Start production server
npm start
```

---

## ⚙️ Triggering Scans via API

You can trigger programmatic live scans at any time:

```bash
# Full scan across all 8 industry tracks (forces fresh fetch)
node -e "fetch('http://localhost:3000/api/scan', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({force: true})}).then(r => r.json()).then(console.log)"

# Single industry scan (e.g. Healthcare)
node -e "fetch('http://localhost:3000/api/scan', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({force: true, industryKey: 'healthcare'})}).then(r => r.json()).then(console.log)"
```

---

## 📖 Architecture & Agent Guidelines

For in-depth architectural contracts, TypeScript data schemas, and development guidelines for AI agents, refer to [AGENTS.md](./AGENTS.md).
