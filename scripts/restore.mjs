import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const BACKUP_REPO_URL = 'https://github.com/samucospace/ai-sentiment-scanner-data-backup.git';
const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, '.data');
const DATA_STORE = path.join(DATA_DIR, 'store.json');
const BACKUP_DIR = path.join(ROOT_DIR, '.backup-repo');

function run(cmd, cwd = ROOT_DIR) {
  return execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' }).trim();
}

async function main() {
  console.log('🔄 Restoring dataset from private GitHub backup repository...');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    run('git init', BACKUP_DIR);
    run('git branch -M main', BACKUP_DIR);
    run(`git remote add origin ${BACKUP_REPO_URL}`, BACKUP_DIR);
  }

  console.log('📥 Pulling latest backup from GitHub...');
  run('git pull origin main', BACKUP_DIR);

  const sourceStore = path.join(BACKUP_DIR, 'store.json');
  if (!fs.existsSync(sourceStore)) {
    console.error('❌ Error: store.json not found in backup repository.');
    process.exit(1);
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.copyFileSync(sourceStore, DATA_STORE);

  const store = JSON.parse(fs.readFileSync(DATA_STORE, 'utf8'));
  const dates = Object.keys(store.digests || {}).sort();

  console.log(`\n🎉 Success! Restored dataset with ${dates.length} daily digests (${dates[0] || 'N/A'} to ${dates[dates.length - 1] || 'N/A'}).`);
  console.log(`📁 Target: ${DATA_STORE}`);
}

main().catch((err) => {
  console.error('\n❌ Restore failed:', err.message);
  process.exit(1);
});
