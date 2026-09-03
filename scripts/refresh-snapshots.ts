import { spawn } from 'node:child_process';
import path from 'node:path';

type RefreshJob = {
  name: string;
  script: string;
  requiredEnv?: string;
};

const jobs: RefreshJob[] = [
  { name: 'EIA gasoline', script: 'scripts/ingest-eia-gasoline.ts' },
  { name: 'BLS grocery', script: 'scripts/ingest-bls-grocery.ts' },
  { name: 'BLS CPI-U', script: 'scripts/ingest-bls-cpi.ts' },
  { name: 'Freddie Mac PMMS', script: 'scripts/ingest-freddie-mac-pmms.ts' },
  { name: 'EIA electricity', script: 'scripts/ingest-eia-electricity.ts', requiredEnv: 'EIA_API_KEY' },
  { name: 'Official location datasets', script: 'scripts/ingest-location-official.ts' },
];

function runScript(script: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', script], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

function envPresent(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && value.trim() && !value.startsWith('replace-with-'));
}

const failures: string[] = [];
const skipped: string[] = [];

for (const job of jobs) {
  if (job.requiredEnv && !envPresent(job.requiredEnv)) {
    skipped.push(`${job.name} (missing ${job.requiredEnv})`);
    console.log(`Skipping ${job.name}: ${job.requiredEnv} is not set.`);
    continue;
  }
  console.log(`\nRefreshing ${job.name} from ${path.basename(job.script)}...`);
  const code = await runScript(job.script);
  if (code !== 0) failures.push(`${job.name} exited ${code}`);
}

if (skipped.length > 0) console.log(`\nSkipped: ${skipped.join('; ')}`);
if (failures.length > 0) {
  throw new Error(`Snapshot refresh failed: ${failures.join('; ')}`);
}
console.log('\nOfficial snapshots are current or unchanged.');
