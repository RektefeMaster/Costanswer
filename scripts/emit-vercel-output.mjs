import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');
const serverEntry = path.join(distDir, 'server', 'index.js');
if (!existsSync(serverEntry)) {
  throw new Error(`Vercel output requires ${path.relative(root, serverEntry)}. Run vinext build first.`);
}

const outputDir = path.join(root, '.vercel', 'output');
const funcDir = path.join(outputDir, 'functions', 'ssr.func');
const staticDir = path.join(outputDir, 'static');

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(staticDir, { recursive: true });
mkdirSync(funcDir, { recursive: true });

const clientDir = path.join(distDir, 'client');
if (existsSync(clientDir)) cpSync(clientDir, staticDir, { recursive: true });

cpSync(distDir, path.join(funcDir, 'dist'), { recursive: true });
cpSync(path.join(root, 'scripts', 'vercel-ssr.mjs'), path.join(funcDir, 'index.mjs'));
cpSync(path.join(root, 'node_modules', 'vinext'), path.join(funcDir, 'node_modules', 'vinext'), { recursive: true });

for (const pkg of ['react', 'react-dom', 'scheduler', 'zod', 'react-server-dom-webpack']) {
  const from = path.join(root, 'node_modules', pkg);
  if (existsSync(from)) cpSync(from, path.join(funcDir, 'node_modules', pkg), { recursive: true });
}

writeFileSync(path.join(funcDir, 'package.json'), `${JSON.stringify({ type: 'module' }, null, 2)}\n`);
writeFileSync(path.join(funcDir, '.vc-config.json'), `${JSON.stringify({
  runtime: 'nodejs22.x',
  handler: 'index.mjs',
  launcherType: 'Nodejs',
  shouldAddHelpers: true,
  supportsResponseStreaming: true,
}, null, 2)}\n`);
writeFileSync(path.join(outputDir, 'config.json'), `${JSON.stringify({
  version: 3,
  routes: [
    { handle: 'filesystem' },
    { src: '/(.*)', dest: '/ssr' },
  ],
}, null, 2)}\n`);

console.log('Wrote Vercel Build Output API to .vercel/output');
