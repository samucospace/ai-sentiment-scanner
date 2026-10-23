import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const BACKUP_REPO_URL = 'https://github.com/samucospace/ai-sentiment-scanner-data-backup.git';
const ROOT_DIR = process.cwd();
const DATA_STORE = path.join(ROOT_DIR, '.data', 'store.json');
const BACKUP_DIR = path.join(ROOT_DIR, '.backup-repo');

function run(cmd, cwd = ROOT_DIR) {
  try {
    return execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' }).trim();
  } catch (err) {
    if (err.stdout) console.log(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    throw err;
  }
}

function safeRun(cmd, cwd = ROOT_DIR) {
  try {
    return execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

async function main() {
  console.log('🔄 Starting dataset backup to GitHub...');

  if (!fs.existsSync(DATA_STORE)) {
    console.error('❌ Error: .data/store.json not found. Have you run any scans yet?');
    process.exit(1);
  }

  // Read and validate dataset
  console.log('🔍 Validating and sanitizing dataset...');
  const storeRaw = fs.readFileSync(DATA_STORE, 'utf8');
  let store;
  try {
    store = JSON.parse(storeRaw);
  } catch (e) {
    console.error('❌ Error: .data/store.json is not valid JSON:', e.message);
    process.exit(1);
  }

  // Safety check: ensure no API keys exist in store.json
  let sanitized = false;
  if (store.settings?.openrouterApiKey) {
    delete store.settings.openrouterApiKey;
    sanitized = true;
  }
  if (store.settings?.geminiApiKey) {
    delete store.settings.geminiApiKey;
    sanitized = true;
  }
  if (sanitized) {
    fs.writeFileSync(DATA_STORE, JSON.stringify(store, null, 2), 'utf8');
    console.log('🛡️ Stripped sensitive API keys from dataset prior to backup.');
  }

  const digests = store.digests || {};
  const digestDates = Object.keys(digests).sort();
  let totalUseCases = 0;
  let totalArticles = 0;

  for (const date of digestDates) {
    const d = digests[date];
    if (d.industries) {
      for (const ind of d.industries) {
        totalUseCases += ind.useCases?.length || 0;
        totalArticles += ind.topArticles?.length || 0;
      }
    }
  }

  const dateRangeStr =
    digestDates.length === 0
      ? 'No digests yet'
      : digestDates.length === 1
      ? digestDates[0]
      : `${digestDates[0]} to ${digestDates[digestDates.length - 1]}`;

  console.log(`📊 Dataset summary: ${digestDates.length} daily digests (${dateRangeStr}), ${totalUseCases} use cases, ${totalArticles} articles.`);

  // Setup .backup-repo directory
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    run('git init', BACKUP_DIR);
    run('git branch -M main', BACKUP_DIR);
    run(`git remote add origin ${BACKUP_REPO_URL}`, BACKUP_DIR);
    console.log('📁 Initialized backup repository clone.');
  } else {
    // Ensure remote is correct
    const currentRemote = safeRun('git remote get-url origin', BACKUP_DIR);
    if (!currentRemote) {
      run(`git remote add origin ${BACKUP_REPO_URL}`, BACKUP_DIR);
    } else if (currentRemote !== BACKUP_REPO_URL) {
      run(`git remote set-url origin ${BACKUP_REPO_URL}`, BACKUP_DIR);
    }
  }

  // Try pulling if remote has commits
  safeRun('git pull origin main --rebase', BACKUP_DIR);

  // Copy sanitized store.json into backup directory
  const targetStore = path.join(BACKUP_DIR, 'store.json');
  fs.writeFileSync(targetStore, JSON.stringify(store, null, 2), 'utf8');

  // Create README in backup repository
  const readmeContent = `# AI Industry Sentiment Scanner — Dataset Backup

> **Private Dataset Backup Repository**  
> **Last Backup:** ${new Date().toISOString()}

This repository contains the persistent dataset accumulated by the **AI Industry Sentiment & Use Case Scanner**.

## Dataset Statistics
- **Total Daily Digests:** ${digestDates.length}
- **Date Range Covered:** ${dateRangeStr}
- **Extracted Actionable Use Cases:** ${totalUseCases}
- **Ingested Publisher Articles:** ${totalArticles}
- **Active Track Feeds:** ${store.settings?.customFeeds?.length || 10}

## How to Restore on a New Machine
If you ever migrate to a new computer:
1. Clone your main scanner project:
   \`\`\`bash
   git clone https://github.com/samucospace/ai-sentiment-scanner.git
   cd ai-sentiment-scanner
   npm install
   \`\`\`
2. Restore this dataset either by running:
   \`\`\`bash
   npm run restore
   \`\`\`
   *Or manually:*
   \`\`\`bash
   mkdir -p .data
   curl -s -H "Authorization: token $GITHUB_TOKEN" ...
   # or copy store.json into .data/store.json
   \`\`\`
3. Start the dashboard:
   \`\`\`bash
   npm run dev
   \`\`\`
   All historical timelines, sentiment matrices, and use case cards will load automatically.
`;

  fs.writeFileSync(path.join(BACKUP_DIR, 'README.md'), readmeContent, 'utf8');

  // Stage changes
  run('git add store.json README.md', BACKUP_DIR);

  const status = safeRun('git status --porcelain', BACKUP_DIR);
  if (!status) {
    console.log('✅ Remote backup is already completely up to date. No new changes.');
    return;
  }

  const commitMsg = `Backup: ${new Date().toISOString().slice(0, 10)} (${digestDates.length} digests, ${totalUseCases} use cases)`;
  run(`git commit -m "${commitMsg}"`, BACKUP_DIR);
  console.log(`💾 Committed changes: "${commitMsg}"`);

  console.log('🚀 Pushing to private GitHub backup repository...');
  run('git push -u origin main', BACKUP_DIR);

  console.log(`\n🎉 Success! Your dataset has been safely backed up to:\n👉 https://github.com/samucospace/ai-sentiment-scanner-data-backup\n`);
}

main().catch((err) => {
  console.error('\n❌ Backup failed:', err.message);
  process.exit(1);
});
