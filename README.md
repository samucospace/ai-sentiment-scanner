# 📡 AI Industry Sentiment & Use Case Scanner

An autonomous intelligence dashboard that ingests daily Google Alert and Google News RSS feeds, analyzes the dual-perspective sentiment toward AI (industry professionals vs. customers), and extracts real-world emerging use cases with direct publisher citations.

---

## 🌟 Key Features

- **8 Preset Industry Tracks**:
  - 🏥 **Healthcare & Medicine**: Ambient clinical notes, diagnostic imaging, and triage bots.
  - ⚖️ **Legal & Judiciary**: Contract redlining, billable hours impact, and litigation research.
  - 🎓 **Education & Academics**: K-12 AI restriction policies, adaptive curricula, and Socratic tutors.
  - 🏦 **Finance & Banking**: Real-time fraud detection, algorithmic wealth advisory, and underwriting.
  - 💻 **Software & IT**: Repository copilots, security PR generation, and synthetic testing.
  - 🎨 **Creative & Media**: Storyboarding, multilingual voice cloning, and generative concept art.
  - 🛍️ **Retail & Customer Support**: Autonomous support bots, dynamic pricing, and inventory forecasting.
  - 🤖 **Manufacturing & Robotics**: Predictive machinery maintenance and autonomous bin-picking.
- **Dual-Perspective Sentiment Analysis**:
  - 👷 **Workforce / Practitioner Sentiment**: Tracks concerns over liability, burnout, and cognitive offloading.
  - 👥 **Customer / Client Sentiment**: Measures demand for convenience, transparency, and data privacy.
- **Problem-Solution Use-Case Radar**:
  - Isolates genuine applications and maps them to: *Problem Solved*, *How AI Works*, *Target Users*, *Key Impact*, and *Maturity Stage* (`Production`, `Pilot`, `Research`, `Policy/Banned`).
  - Direct external citation links to original news sources.
- **Dual Analysis Modes**:
  - **Google Gemini LLM Mode**: Powered by Gemini 1.5/2.0 Flash (`@google/generative-ai`) for deep semantic synthesis.
  - **Zero-Config Fallback Engine**: Built-in deterministic NLP analyzer for immediate out-of-the-box operation without requiring an API key.
- **Feed & Ingestion Manager**: Add custom Google Alert RSS URLs or search keywords dynamically.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/your-username/ai-sentiment-scanner.git
cd ai-sentiment-scanner
npm install
```

### 2. Configure Environment (Optional)
Copy the example environment file:
```bash
cp .env.example .env.local
```
Add your Gemini API key (or configure it in the UI settings modal):
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Build & Production
```bash
# Production build
npm run build

# Start production server
npm start
```

---

## 📖 Operational Documentation

For developer instructions, architectural contracts, and rules for AI agents, see [AGENTS.md](./AGENTS.md).
