import { DailyDigest, LinkedInTopicSuggestion, RawArticle, IndustryDigest } from './types';

/**
 * Generates 3 curated, high-impact LinkedIn post suggestions based on a daily digest's articles and sentiment.
 */
export function generateLinkedInTopics(digest: DailyDigest): LinkedInTopicSuggestion[] {
  const industries = digest.industries || [];
  const dateStr = digest.date || new Date().toISOString().split('T')[0];

  // Collect all articles across all industries
  const allArticles: Array<RawArticle & { industryName: string }> = [];
  for (const ind of industries) {
    for (const art of ind.topArticles || []) {
      allArticles.push({
        ...art,
        industryName: ind.industryName,
      });
    }
  }

  // 1. Find industry with the sharpest workforce caution or largest worker-vs-customer gap
  const sortedByWorkerCaution = [...industries].sort(
    (a, b) => a.workerSentiment.score - b.workerSentiment.score
  );
  const mostCautious = sortedByWorkerCaution[0] || industries[0];

  // 2. Find industry or use case with highest practical maturity / production application
  const allUseCases = industries.flatMap((ind) =>
    (ind.useCases || []).map((uc) => ({ ...uc, industryName: ind.industryName }))
  );
  const prodUseCase =
    allUseCases.find((uc) => uc.maturityStage === 'Production') ||
    allUseCases.find((uc) => uc.maturityStage === 'Pilot') ||
    allUseCases[0];

  // 3. Find policy / governance / regulatory angles in articles
  const policyArticles = allArticles.filter((a) => {
    const text = `${a.title} ${a.snippet}`.toLowerCase();
    return (
      text.includes('guideline') ||
      text.includes('policy') ||
      text.includes('rule') ||
      text.includes('law') ||
      text.includes('court') ||
      text.includes('ban') ||
      text.includes('liability') ||
      text.includes('risk') ||
      text.includes('guardrail') ||
      text.includes('standard') ||
      text.includes('scrutiny')
    );
  });
  const topPolicyArticle = policyArticles[0] || allArticles[1] || allArticles[0];

  // Relevant articles for Topic 1
  const topic1Headlines = (mostCautious?.topArticles || allArticles.slice(0, 2)).slice(0, 2).map((a) => ({
    title: a.title,
    source: a.source,
    link: a.link,
  }));

  // Relevant articles for Topic 2
  const topic2Articles = prodUseCase
    ? [{ title: prodUseCase.sourceTitle || prodUseCase.title, source: prodUseCase.sourceTitle || prodUseCase.industry, link: prodUseCase.sourceUrl || '#' }]
    : allArticles.slice(2, 4).map((a) => ({ title: a.title, source: a.source, link: a.link }));

  // Relevant articles for Topic 3
  const topic3Headlines = (policyArticles.length > 0 ? policyArticles.slice(0, 2) : allArticles.slice(4, 6)).map((a) => ({
    title: a.title,
    source: a.source,
    link: a.link,
  }));

  const cautiousIndustryName = mostCautious?.industryName || 'Key Sectors';
  const workerScorePct = Math.round((mostCautious?.workerSentiment?.score ?? -0.3) * 100);
  const professions = mostCautious?.workerSentiment?.professionsImpacted?.slice(0, 3).join(', ') || 'frontline practitioners';

  // Topic 1: Workforce vs. Hype Debate
  const topic1: LinkedInTopicSuggestion = {
    id: `topic-workforce-${dateStr}`,
    category: 'Workforce Reality & Adoption',
    title: `The Frontline Reality: Why ${cautiousIndustryName} Is Hesitating on AI While Leadership Pushes Ahead`,
    targetAudience: 'Enterprise Leaders, AI Strategists, Industry Executives',
    description: `A deep-dive post discussing the disconnect between executive AI enthusiasm and practitioner resistance. Focus on liability fears, cognitive overload, and why adoption stalls without frontline buy-in.`,
    postOutline: {
      hook: `Most executive slide decks assume AI adoption is just an enablement problem. But on the ground in ${cautiousIndustryName}, sentiment sits at ${workerScorePct}%. Here is why practitioners are pushing back:`,
      evidenceAndData: `Cite today's scanner data showing practitioner hesitation among ${professions}. Reference quote: "${mostCautious?.workerSentiment?.keyQuotes?.[0] || 'Concerns over liability and unverified model errors persist.'}"`,
      keyInsight: `Adoption fails when organizations optimize for 'speed of output' instead of 'reduction of practitioner liability'. True productivity only scales when doctors, lawyers, and engineers trust the safety net.`,
      callToAction: `Are you seeing enthusiasm or hesitation among your frontline teams when piloting AI? How is your leadership addressing liability?`,
    },
    suggestedHashtags: ['#ArtificialIntelligence', '#FutureOfWork', '#ChangeManagement', '#Leadership', '#TechAdoption'],
    relevantHeadlines: topic1Headlines,
    sampleDraft: `Most executive decks assume AI adoption is purely an enablement problem.

"Train the team, give them licenses, and watch productivity spike."

Except on the frontline in ${cautiousIndustryName}, practitioner sentiment is currently sitting at ${workerScorePct}%.

Why the hesitation?

1. Liability asymmetry: If the model is right, leadership celebrates efficiency. If the model hallucinates, the practitioner (${professions}) bears the professional and legal risk.
2. Cognitive offloading debt: Checking someone else's work takes just as much cognitive energy as writing it from scratch.
3. Lack of audited guardrails: Tools deployed without clear sign-off standards create anxiety, not leverage.

The winning formula isn't mandating tool usage—it's establishing clear liability boundaries and measurable verification rails.

Are you seeing genuine enthusiasm or silent hesitation from your frontline teams?

#FutureOfWork #AIAdoption #TechLeadership #EnterpriseAI`,
  };

  // Topic 2: Tactical Production Case Study
  const useCaseTitle = prodUseCase?.title || 'Ambient Automation & Workflow Copilots';
  const useCaseIndustry = prodUseCase?.industryName || 'Modern Enterprise';
  const useCaseProblem = prodUseCase?.problemSolved || 'Repetitive clerical work and manual bottleneck documentation.';
  const useCaseBenefit = prodUseCase?.keyBenefit || 'Saves 1.5+ hours daily and cuts manual turnaround time.';
  const useCaseStage = prodUseCase?.maturityStage || 'Production';

  const topic2: LinkedInTopicSuggestion = {
    id: `topic-usecase-${dateStr}`,
    category: 'Tactical Case Study & Architecture',
    title: `Beyond the Demos: How ${useCaseTitle} is Actually Driving ROI in ${useCaseIndustry}`,
    targetAudience: 'Product Managers, Engineers, Operations Directors',
    description: `A tactical breakdown of a real, deployed AI use case from today's data pull. Explains the exact problem solved, the technical mechanism under the hood, and measurable efficiency gains.`,
    postOutline: {
      hook: `Cut through the GenAI hype. Here is a concrete, in-production workflow solving real friction right now: ${useCaseTitle} in ${useCaseIndustry}.`,
      evidenceAndData: `Break down the problem: ${useCaseProblem}. Note the current maturity stage (${useCaseStage}) and measured outcome (${useCaseBenefit}).`,
      keyInsight: `The secret to successful AI deployment isn't autonomous agent autonomy—it's tightly bounded, domain-specific augmentation with clean input/output formats.`,
      callToAction: `What repetitive 2-hour daily bottleneck in your industry is waiting for this type of focused AI workflow?`,
    },
    suggestedHashtags: ['#GenerativeAI', '#Productivity', '#DigitalTransformation', '#Innovation', '#CaseStudy'],
    relevantHeadlines: topic2Articles,
    sampleDraft: `Stop looking at prototype demos. Here is a real AI workflow operating in production today:

👉 ${useCaseTitle} (${useCaseIndustry})

The Friction Being Solved:
${useCaseProblem}

How It Actually Works:
${prodUseCase?.howItWorks || 'Domain-specific models process unstructured contextual inputs in real time and synthesize structured artifacts for human approval.'}

The Measured Outcome:
✅ ${useCaseBenefit}
✅ Maturity Stage: ${useCaseStage}

The lesson for product teams?
The highest ROI in AI isn't coming from generalist chatbots trying to do everything. It's coming from hyper-focused, invisible ambient workflows that eliminate 90 minutes of administrative friction every day.

What's the #1 manual bottleneck your team deals with every single week?

#GenerativeAI #Productivity #Automation #Engineering #DigitalTransformation`,
  };

  // Topic 3: Governance, Liability & Strategic Policy
  const policyTitle = topPolicyArticle?.title || 'Navigating Regulatory & Liability Guardrails in Enterprise AI';
  const topic3: LinkedInTopicSuggestion = {
    id: `topic-policy-${dateStr}`,
    category: 'Governance, Liability & Policy',
    title: `The Looming AI Accountability Dilemma: Who Is Responsible When an Agent Makes a Costly Mistake?`,
    targetAudience: 'Chief Legal Officers, CISOs, Compliance Officers, Board Members',
    description: `A thought leadership post examining regulatory scrutiny, copyright/liability standards, and risk management frameworks based on the latest headlines.`,
    postOutline: {
      hook: `The biggest roadblock to enterprise AI over the next 18 months isn't model capabilities. It's the unresolved legal and compliance question of accountability.`,
      evidenceAndData: `Cite today's governance signals: "${policyTitle}" (${topPolicyArticle?.source || 'Industry News'}). Explain how regulations and court rulings are shifting towards mandatory disclosure.`,
      keyInsight: `Highlight 3 essential questions every enterprise must ask before greenlighting production AI: (1) Who signs off? (2) Where does the training data live? (3) How is data lineage tracked?`,
      callToAction: `Does your organization have a formal AI policy with defined liability sign-offs, or are teams operating in an unwritten gray zone?`,
    },
    suggestedHashtags: ['#AIGovernance', '#Compliance', '#RiskManagement', '#EnterpriseAI', '#LegalTech'],
    relevantHeadlines: topic3Headlines,
    sampleDraft: `The biggest roadblock to enterprise AI isn't model latency or GPU availability.

It's the unanswered question: Who is legally accountable when an AI model makes a catastrophic error?

Today's headlines highlight growing scrutiny:
"${policyTitle}"

Before deploying AI agents across customer-facing or regulated workflows, every executive leadership team needs clear answers to three questions:

1. Watermarking & Disclosure: Do clients and patients know when an output is AI-assisted?
2. Human-in-the-Loop Signoff: Is a qualified human explicitly reviewing recommendations, or are staff blindly accepting auto-generated conclusions?
3. Audit Trails: If an algorithmic error causes financial or clinical damage, can you reproduce the exact prompt and system context that caused it?

Moving fast without governance is not innovation—it's uncalculated risk.

How is your board or legal department approaching AI guardrails this year?

#AIGovernance #RiskManagement #EnterpriseTech #Compliance #LegalTech`,
  };

  return [topic1, topic2, topic3];
}
