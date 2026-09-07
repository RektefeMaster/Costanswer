import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { refreshJobsFor, type RefreshFamily } from './refresh-jobs';

function parseFamily(argv: string[]): RefreshFamily | 'all' {
  const flag = argv.find((arg) => arg.startsWith('--family='));
  if (!flag) return 'all';
  const value = flag.slice('--family='.length);
  if (value === 'weekly' || value === 'monthly' || value === 'annual' || value === 'all') return value;
  throw new Error(`Unknown refresh family ${value}. Use weekly, monthly, annual, or all.`);
}

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

export async function refreshOfficialSnapshots(family: RefreshFamily | 'all' = 'all'): Promise<void> {
  const jobs = refreshJobsFor(family);
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
}

if (import.meta.url === pathToFileURL(path.resolve(process.argv[1] ?? '')).href) {
  await refreshOfficialSnapshots(parseFamily(process.argv.slice(2)));
}
